<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\Complaint;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class LlmComplaintService
{
    private const HISTORY_LIMIT = 10;
    private const MODEL = 'gpt-4.1-mini';
    private const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    private const TIMEOUT = 15;

    /**
     * Process an inbound user message for a given channel + chat and return
     * the text to send back, or null if no reply should be sent.
     *
     * Side effects: persists ChatMessage rows, may create a Complaint row when
     * the LLM emits a /store_complaint command.
     */
    public function handleIncoming(string $channel, string $chatId, string $userMessage): ?string
    {
        ChatMessage::create([
            'channel' => $channel,
            'chat_id' => $chatId,
            'role'    => 'user',
            'content' => $userMessage,
        ]);

        $reply = $this->askOpenAi($channel, $chatId);

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
            $ref = $this->storeComplaint($channel, $chatId, $reply);
            if ($ref === null) {
                return 'Maaf, terdapat ralat semasa menyimpan aduan. Sila cuba semula.';
            }
            $statusUrl = rtrim(config('app.url'), '/') . '/semak-status';
            return "Aduan anda telah berjaya diterima. Ini nombor rujukan aduan : {$ref}\n\nSemak status aduan di: {$statusUrl}";
        }

        return $reply;
    }

    private function askOpenAi(string $channel, string $chatId): ?string
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

        $messages = array_merge(
            [['role' => 'system', 'content' => config('llm.complaint_system_prompt')]],
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

    private function storeComplaint(string $channel, string $chatId, string $message): ?string
    {
        Log::info('Store complaint command detected', ['channel' => $channel, 'chat_id' => $chatId]);

        $jsonString = trim(substr($message, strlen('/store_complaint')));
        $data = json_decode($jsonString, true);

        if (!is_array($data)) {
            Log::warning('Store complaint JSON decode failed', ['raw' => $jsonString]);
            return null;
        }

        $referenceNo = $this->generateReferenceNo();

        $contactNumber = $data['contact_number'] ?? null;
        if (!is_string($contactNumber) || trim($contactNumber) === '') {
            $contactNumber = $chatId;
        }

        Complaint::create([
            'reference_no'         => $referenceNo,
            'complaint_year'       => (int) now()->format('Y'),
            'complaint_date'       => now()->toDateString(),
            'complaint_time'       => now()->format('H:i:s'),
            'complainant_name'     => $data['name'] ?? 'Tidak dinyatakan',
            'identification_number' => $data['identification_number'] ?? 'Tidak dinyatakan',
            'contact_number'       => $contactNumber,
            'address'              => $data['location'] ?? 'Tidak dinyatakan',
            'district_name'        => $data['district'] ?? null,
            'summary'              => $data['contents'] ?? 'Tidak dinyatakan',
            'channel'              => $channel,
            'current_stage'        => 'baru',
            'submitted_at'         => now(),
        ]);

        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();

        return $referenceNo;
    }

    private function generateReferenceNo(): string
    {
        $year = now()->format('Y');
        $prefix = "JAIS-{$year}-";

        do {
            $referenceNo = $prefix . Str::upper(Str::random(6));
        } while (Complaint::where('reference_no', $referenceNo)->exists());

        return $referenceNo;
    }

    public function resetHistory(string $channel, string $chatId): void
    {
        ChatMessage::where('channel', $channel)
            ->where('chat_id', $chatId)
            ->delete();
    }
}
