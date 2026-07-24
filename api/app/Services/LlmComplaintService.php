<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Complaint;
use App\Services\ComplaintReferenceService;
use App\Services\DistrictResolverService;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
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

        $complainantName = $data['name'] ?? null;
        if (!is_string($complainantName) || trim($complainantName) === '') {
            $complainantName = $hints['name'] ?? 'Tidak dinyatakan';
        }

        // WhatsApp sender number (captured from the webhook) is authoritative when present.
        $contactNumber = $hints['phone'] ?? null;
        if (!is_string($contactNumber) || trim($contactNumber) === '') {
            $contactNumber = $data['contact_number'] ?? $chatId;
        }

        Complaint::create([
            'reference_no'         => $referenceNo,
            'case_type'            => 'AJ',
            'complaint_year'       => (int) $now->format('Y'),
            'complaint_date'       => $now->toDateString(),
            'complaint_time'       => $now->format('H:i:s'),
            'complainant_name'     => $complainantName,
            'identification_number' => $data['identification_number'] ?? 'Tidak dinyatakan',
            'contact_number'       => $contactNumber,
            'address'              => $data['location'] ?? $district ?? 'Tidak dinyatakan',
            'district_name'        => $district,
            'summary'              => $data['contents'] ?? 'Tidak dinyatakan',
            'channel'              => $channel,
            'current_stage'        => 'baru',
            'submitted_at'         => $now,
        ]);

        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();

        return $referenceNo;
    }
    public function resetHistory(string $channel, string $chatId): void
    {
        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();
    }
}
