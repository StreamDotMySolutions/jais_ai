<?php

namespace App\Jobs;

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
    public int $chatId;

    public function __construct(string $message, int $chatId)
    {
        $this->message = $message;
        $this->chatId  = $chatId;
    }

    public function handle(): void
    {
        // 1. Hantar ke LLM
        // Prefer OPENAI_API_KEY from .env, fallback to services config
        $openaiKey = env('OPENAI_API_KEY') ?: config('services.openai.api_key');

        if (empty($openaiKey)) {
            Log::error('OpenAI API key not configured. Set OPENAI_API_KEY in .env or services.openai.key in config.');
            return;
        }

        $llmResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $openaiKey,
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4.1-mini',
            'messages' => [
                ['role' => 'system', 'content' => 'You are a helpful assistant. Use Bahasa Melayu by default then switch to English if the user uses English. Keep the answers concise and to the point.'],
                ['role' => 'user', 'content' => $this->message],
            ],
        ]);

        if (!$llmResponse->ok()) {
            Log::error('LLM error', [
                'body' => $llmResponse->body(),
            ]);
            return;
        }

        $reply = data_get($llmResponse->json(), 'choices.0.message.content');

        if (!$reply) {
            return;
        }

        // 2. Balas ke Telegram
        Http::post("https://api.telegram.org/bot" . config('services.telegram.bot_token') . "/sendMessage", [
            'chat_id' => $this->chatId,
            'text' => $reply,
        ]);
    }
}
