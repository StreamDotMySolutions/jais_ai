<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Services\ComplaintReferenceService;
use App\Services\DistrictResolverService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LlmComplaintService
{
    private const HISTORY_LIMIT = 10;
    private const MODEL = 'gpt-4.1-mini';
    private const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    private const TIMEOUT = 15;

    public function __construct(
        private ComplaintReferenceService $complaintReferenceService,
        private DistrictResolverService $districtResolver
    ) {
    }

    /**
     * Process an inbound user message for a given channel + chat and return
     * the text to send back, or null if no reply should be sent.
     *
     * Side effects: persists ChatMessage rows, may create a Complaint row when
     * the LLM emits a /store_complaint command.
     */
    public function handleIncoming(string $channel, string $chatId, string $userMessage, ?array $hints = null): ?string
    {
        ChatMessage::create([
            'channel' => $channel,
            'chat_id' => $chatId,
            'role'    => 'user',
            'content' => $userMessage,
        ]);

        $reply = $this->askOpenAi($channel, $chatId, $hints);

        if (!$reply) {
            return null;
        }

        ChatMessage::create([
            'channel' => $channel,
            'chat_id' => $chatId,
            'role'    => 'assistant',
            'content' => $reply,
        ]);

        if ($this->isStoreComplaintCommand($reply)) {
            $ref = $this->storeComplaint($channel, $chatId, $reply, $hints);
            if ($ref === null) {
                return 'Maaf, terdapat ralat semasa menyimpan aduan. Sila cuba semula.';
            }
            $statusUrl = rtrim(config('app.url'), '/') . '/semak-status';
            return "Aduan anda telah berjaya diterima. Ini nombor rujukan aduan : {$ref}\n\nSemak status aduan di: {$statusUrl}";
        }

        return $reply;
    }

    private function askOpenAi(string $channel, string $chatId, ?array $hints = null): ?string
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::error('OpenAI API key not configured');
            return null;
        }

        $history = ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->latest()
            ->take(self::HISTORY_LIMIT)
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->values()
            ->toArray();

        $systemMessages = [['role' => 'system', 'content' => config('llm.complaint_system_prompt')]];

        $districtList = $this->districtResolver->numberedList();
        if ($districtList !== '') {
            $systemMessages[] = [
                'role'    => 'system',
                'content' => "SENARAI DAERAH AKTIF (untuk soalan 'Daerah kejadian'):\n" . $districtList .
                    "\n\nARAHAN: Paparkan senarai ini apabila bertanya soalan daerah. Pengguna boleh menjawab dengan NOMBOR pilihan (contoh: 3) ATAU dengan menaip NAMA daerah (contoh: Hulu Langat) - kedua-duanya sah. Terima hanya daerah yang ada dalam senarai. Sentiasa gunakan NAMA PENUH daerah (bukan nombor) apabila memaparkan ringkasan dan apabila menyimpannya sebagai 'district'.",
            ];
        }

        // Identity from the uploaded MyKad is injected as a runtime system message
        // (not via chat history) so it is always present regardless of the history
        // trim window, and can never be overridden by whatever the user types.
        $identity = $this->stagedIdentity($channel, $chatId);
        if ($identity) {
            $systemMessages[] = [
                'role'    => 'system',
                'content' => "IDENTITI PENGADU (DISAHKAN DARIPADA MyKad — gunakan nilai ini, JANGAN tanya semula):" .
                    "\n- Nama penuh: " . ($identity['name'] ?? '') .
                    "\n- Nombor kad pengenalan: " . ($identity['nric'] ?? '') .
                    "\n- Alamat: " . ($identity['address'] ?? ''),
            ];
        }

        if ($hints) {
            $lines = [];
            if (!empty($hints['name'])) {
                $lines[] = "- Nama pengguna (dari profil WhatsApp): {$hints['name']}";
            }
            if ($lines) {
                $content = "MAKLUMAT PENGGUNA YANG TELAH DIKENAL:\n" . implode("\n", $lines) .
                    "\n\nARAHAN: Gunakan maklumat ini sebagai nilai lalai. Jika pengguna membetulkan maklumat ini, gunakan versi yang dibetulkan.";

                $systemMessages[] = [
                    'role'    => 'system',
                    'content' => $content,
                ];
            }
        }

        $messages = array_merge(
            $systemMessages,
            $history
        );

        $response = Http::timeout(self::TIMEOUT)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])
            ->post(self::ENDPOINT, [
                'model'    => self::MODEL,
                'messages' => $messages,
            ]);

        if (!$response->ok()) {
            Log::error('LLM error', ['body' => $response->body()]);
            return null;
        }

        return data_get($response->json(), 'choices.0.message.content');
    }

    private function isStoreComplaintCommand(string $message): bool
    {
        return Str::startsWith(trim($message), '/store_complaint');
    }

    private function storeComplaint(string $channel, string $chatId, string $message, ?array $hints = null): ?string
    {
        Log::info('Store complaint command detected', ['channel' => $channel, 'chat_id' => $chatId]);

        $jsonString = trim(substr($message, strlen('/store_complaint')));
        $data = json_decode($jsonString, true);

        if (!is_array($data)) {
            Log::warning('Store complaint JSON decode failed', ['raw' => $jsonString]);
            return null;
        }

        // Resolve whatever the LLM emitted ("3", "gombak", "Hulu Langat") to a
        // canonical active district. This cannot be left to the model alone: the
        // value is interpolated into the public reference number, so a raw "3"
        // would permanently file the complaint as AJ-3/2026/07/0001.
        $rawDistrict = is_string($data['district'] ?? null) ? $data['district'] : null;
        $district = $this->districtResolver->resolve($rawDistrict);

        if ($district === null && $rawDistrict !== null && trim($rawDistrict) !== '') {
            Log::warning('District could not be resolved to an active district', [
                'channel' => $channel,
                'chat_id' => $chatId,
                'raw'     => $rawDistrict,
            ]);
        }

        $now = now();
        $referenceNo = $this->complaintReferenceService->generateReferenceNo(
            'AJ',
            $district,
            $now
        );

        // Identity (name, IC, address) comes from the staged MyKad extraction and is
        // authoritative — the LLM never emits it, so it cannot be fabricated or altered.
        $identity = $this->stagedIdentity($channel, $chatId);

        $complainantName = $identity['name'] ?? $data['name'] ?? null;
        if (!is_string($complainantName) || trim($complainantName) === '') {
            $complainantName = $hints['name'] ?? 'Tidak dinyatakan';
        }

        $identificationNumber = $identity['nric'] ?? $data['identification_number'] ?? 'Tidak dinyatakan';

        // Complainant's residential address comes from the MyKad. `address` stays the
        // incident/general address (WhatsApp doesn't collect one — falls back to district).
        $complainantAddress = $identity['address'] ?? null;
        $address = $data['location'] ?? $district ?? 'Tidak dinyatakan';

        // WhatsApp sender number (captured from the webhook) is authoritative when present.
        $contactNumber = $hints['phone'] ?? null;
        if (!is_string($contactNumber) || trim($contactNumber) === '') {
            $contactNumber = $data['contact_number'] ?? $chatId;
        }

        $complaint = Complaint::create([
            'reference_no'         => $referenceNo,
            'case_type'            => 'AJ',
            'complaint_year'       => (int) $now->format('Y'),
            'complaint_date'       => $now->toDateString(),
            'complaint_time'       => $now->format('H:i:s'),
            'complainant_name'     => $complainantName,
            'identification_number' => $identificationNumber,
            'contact_number'       => $contactNumber,
            'address'              => $address,
            'complainant_address'  => $complainantAddress,
            'district_name'        => $district,
            'summary'              => $data['contents'] ?? 'Tidak dinyatakan',
            'channel'              => $channel,
            'current_stage'        => 'baru',
            'submitted_at'         => $now,
        ]);

        $this->attachIdentityImage($channel, $chatId, $complaint);

        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();

        $this->clearPending($channel, $chatId);

        return $referenceNo;
    }
    public function resetHistory(string $channel, string $chatId): void
    {
        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();

        // Drop any MyKad staged in an abandoned session so it can't leak into the next.
        $this->clearPending($channel, $chatId);
    }

    /**
     * True once a valid MyKad has been read and staged for this chat.
     * The webhook uses this to hard-gate the complaint flow.
     */
    public function hasIdentity(string $channel, string $chatId): bool
    {
        return Storage::disk('local')->exists($this->pendingDir($channel, $chatId) . '/identity.json');
    }

    /**
     * Persist the extracted MyKad image + identity fields for this chat, pending
     * submission. Moved into the complaint folder when /store_complaint fires.
     */
    public function stageIdentity(string $channel, string $chatId, string $bytes, string $mime, array $extracted): void
    {
        $dir = $this->pendingDir($channel, $chatId);

        Storage::disk('local')->put($dir . '/identity.png', $bytes);
        Storage::disk('local')->put($dir . '/identity.json', json_encode([
            'name'    => $extracted['name'] ?? null,
            'nric'    => $extracted['nric'] ?? null,
            'address' => $extracted['address'] ?? null,
            'mime'    => $mime,
        ], JSON_UNESCAPED_UNICODE));
    }

    /**
     * Produce the assistant's next turn without an incoming user message — used
     * right after a MyKad is staged to kick off the district question.
     */
    public function replyWithoutUserInput(string $channel, string $chatId, ?array $hints = null): ?string
    {
        $reply = $this->askOpenAi($channel, $chatId, $hints);

        if (!$reply) {
            return null;
        }

        ChatMessage::create([
            'channel' => $channel,
            'chat_id' => $chatId,
            'role'    => 'assistant',
            'content' => $reply,
        ]);

        return $reply;
    }

    private function stagedIdentity(string $channel, string $chatId): ?array
    {
        $path = $this->pendingDir($channel, $chatId) . '/identity.json';

        if (!Storage::disk('local')->exists($path)) {
            return null;
        }

        $data = json_decode(Storage::disk('local')->get($path), true);

        return is_array($data) ? $data : null;
    }

    private function attachIdentityImage(string $channel, string $chatId, Complaint $complaint): void
    {
        $source = $this->pendingDir($channel, $chatId) . '/identity.png';

        if (!Storage::disk('local')->exists($source)) {
            Log::warning('No staged MyKad image to attach', ['complaint_id' => $complaint->id]);
            return;
        }

        $dest = 'complaints/' . $complaint->id . '/identity.png';
        Storage::disk('local')->put($dest, Storage::disk('local')->get($source));

        $identity = $this->stagedIdentity($channel, $chatId);

        ComplaintAttachment::create([
            'complaint_id' => $complaint->id,
            'category'     => 'identity',
            'file_name'    => 'identity.png',
            'path'         => $dest,
            'disk'         => 'local',
            'mime'         => $identity['mime'] ?? 'image/png',
            'size'         => Storage::disk('local')->size($dest),
        ]);
    }

    private function clearPending(string $channel, string $chatId): void
    {
        Storage::disk('local')->deleteDirectory($this->pendingDir($channel, $chatId));
    }

    private function pendingDir(string $channel, string $chatId): string
    {
        $safeChat = preg_replace('/[^A-Za-z0-9_.-]/', '_', $chatId);

        return 'whatsapp_media_pending/' . $channel . '/' . $safeChat;
    }
}
