<?php

namespace App\Jobs;

use App\Services\LlmComplaintService;
use App\Models\ChatMessage;
use App\Services\ComplaintReferenceService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class SendToLlmJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    /** Retry transient OpenAI failures rather than dropping the reply. */
    public int $tries = 3;
    public array $backoff = [5, 15];
    public int $timeout = 30;

    public string $message;
    public string $from;
    public string $channel;
    public ?array $hints;

    public function __construct(string $message, string $from, string $channel, ?array $hints = null)
    {
        $this->message = $message;
        $this->from    = $from;
        $this->channel = $channel;
        $this->hints   = $hints;
    }

    public function handle(LlmComplaintService $llm): void
    {
        Log::info($this->channel . ' SendToLlmJob started', [
            'from'    => $this->from,
            'message' => $this->message,
            'hints'   => $this->hints,
        ]);

        $reply = $llm->handleIncoming($this->channel, $this->from, $this->message, $this->hints);

        if (!$reply) {
            return;
        }

        match ($this->channel) {
            'telegram'      => $this->sendToTelegram($reply),
            'whatsapp-meta' => $this->sendToWhatsApp($reply),
            default    => Log::error('Unknown channel', ['channel' => $this->channel]),
        };
    }


    // Detect if the message is a /store_complaint command
    private function isStoreComplaintCommand(string $message): bool
    {
        return str_starts_with(trim($message), '/store_complaint');
    }

    // Handle the /store_complaint command
    private function handleStoreComplaint(string $message): void
    {
       Log::info('Store complaint command detected, skip reply', [
                'reply' => $message,
            ]);

        // 1. Remove the command part
        $jsonString = trim(substr($message, strlen('/store_complaint')));

        // 2. Decode JSON into array
        $data = json_decode($jsonString, true);

        // 3. Safety check (LLM can hallucinate)
        if (! is_array($data)) {
            // log error or silently ignore
            return;
        }

        \Log::info('Storing complaint from WhatsApp', [
            'data' => $data,
        ]);

        $now = now();
        $referenceNo = app(ComplaintReferenceService::class)->generateReferenceNo(
            'AJ',
            $data['district'] ?? null,
            $now
        );

        // 4. Store in Complaint DB
        \App\Models\Complaint::create([
            'reference_no' => $referenceNo,
            'case_type' => 'AJ',
            'complaint_year' => (int) $now->format('Y'),
            'complaint_date' => $now->toDateString(),
            'complaint_time' => $now->format('H:i:s'),
            'complainant_name' => $data['name'] ?? 'Tidak dinyatakan',
            'identification_number' => $data['identification_number'] ?? 'Tidak dinyatakan',
            'contact_number' => $this->from,
            'address' => $data['location'] ?? 'Tidak dinyatakan',
            'district_name' => $data['district'] ?? null,
            'summary' => $data['contents'] ?? 'Tidak dinyatakan',
            'channel' => $this->channel,
            'current_stage' => 'baru',
            'submitted_at' => $now,
        ]);


        // clear ChatMessage for this chat_id and channel
        ChatMessage::where('channel', $this->channel)
            ->where('chat_id', $this->from)
            ->delete();
        

        // send reply to user
        $this->sendReply('Aduan anda telah diterima. Terima kasih.');
    }

    private function sendReply(string $text): void
    {
        match ($this->channel) {
            'telegram' => $this->sendToTelegram($text),
            'whatsapp' => $this->sendToWhatsApp($text),
            default => Log::error('Unknown channel for sending reply', [
                'channel' => $this->channel,
            ]),
        };
    }

    private function sendToTelegram(string $reply): void
    {
        Http::post(
            'https://api.telegram.org/bot' .
            config('services.telegram.bot_token') .
            '/sendMessage',
            [
                'chat_id' => $this->from,
                'text'    => $reply,
            ]
        );
    }

    private function sendToWhatsApp(string $reply): void
    {
        Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/v19.0/' .
                config('services.whatsapp.phone_number_id') .
                '/messages',
                [
                    'messaging_product' => 'whatsapp',
                    'to'   => $this->from,
                    'type' => 'text',
                    'text' => ['body' => $reply],
                ]
            );
    }
}
