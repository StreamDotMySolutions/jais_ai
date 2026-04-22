<?php

namespace App\Jobs;

use App\Services\LlmComplaintService;
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

    public string $message;
    public string $from;
    public string $channel;

    public function __construct(string $message, string $from, string $channel)
    {
        $this->message = $message;
        $this->from    = $from;
        $this->channel = $channel;
    }

    public function handle(LlmComplaintService $llm): void
    {
        Log::info($this->channel . ' SendToLlmJob started', [
            'from'    => $this->from,
            'message' => $this->message,
        ]);

        $reply = $llm->handleIncoming($this->channel, $this->from, $this->message);

        if (!$reply) {
            return;
        }

        match ($this->channel) {
            'telegram' => $this->sendToTelegram($reply),
            'whatsapp' => $this->sendToWhatsApp($reply),
            default    => Log::error('Unknown channel', ['channel' => $this->channel]),
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
