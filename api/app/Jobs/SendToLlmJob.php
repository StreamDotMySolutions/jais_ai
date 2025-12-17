<?php

namespace App\Jobs;

use App\Models\ChatMessage;
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

    public function handle(): void
    {

        \Log::info($this->channel . ' SendToLlmJob started', [
            'from'    => $this->from,
            'message' => $this->message,
        ]);

        // 0️⃣ Detect arahan sistem dan bypass LLM
        if ($this->isStoreComplaintCommand($this->message)) {
            $this->handleStoreComplaint($this->message);
            return;
        }

        // 0. Simpan mesej USER (memori)
        ChatMessage::create([
            'channel' => $this->channel,
            'chat_id' => $this->from,
            'role'    => 'user',
            'content' => $this->message,
        ]);

        // 1. Ambil OpenAI API key
        $openaiKey = env('OPENAI_API_KEY') ?: config('services.openai.api_key');

        if (!$openaiKey) {
            Log::error('OpenAI API key not configured');
            return;
        }

        // 2. Ambil 10 mesej terakhir sebagai memori
        $chatHistory = ChatMessage::where('channel', $this->channel)
            ->where('chat_id', $this->from)
            ->latest()
            ->take(10)
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn ($m) => [
                'role' => $m->role,
                'content' => $m->content,
            ])
            ->toArray();

        // 3. Bina payload OpenAI (STRUKTUR BETUL)
        $messages = array_merge(
            [
                [
                    'role' => 'system',
                    'content' => config('llm.complaint_system_prompt'),
                ],
            ],
            $chatHistory
        );

        // 4. Hantar ke OpenAI
        $llmResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $openaiKey,
            'Content-Type'  => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4.1-mini',
            'messages' => $messages,
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

        // if reply starts with /store_complaint, skip reply
        if (str_starts_with($reply, '/store_complaint')) {
            Log::info('Store complaint command detected, skip reply', [
                'reply' => $reply,
            ]);

            // clear ChatMessage for this chat_id and channel
            ChatMessage::where('channel', $this->channel)
                ->where('chat_id', $this->from)
                ->delete();
            

            // send reply to user
            $this->sendReply('Aduan anda telah diterima. Terima kasih.');
            return;
        }

        // 5. Simpan jawapan ASSISTANT (memori)
        ChatMessage::create([
            'channel' => $this->channel,
            'chat_id' => $this->from,
            'role'    => 'assistant',
            'content' => $reply,
        ]);

        // 6. Hantar ke channel
        match ($this->channel) {
            'telegram' => $this->sendToTelegram($reply),
            'whatsapp' => $this->sendToWhatsApp($reply),
            default => Log::error('Unknown channel', [
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
                'text' => $reply,
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
                    'text' => [
                        'body' => $reply,
                    ],
                ]
            );
    }

    private function isStoreComplaintCommand(string $message): bool
    {
        return str_starts_with(trim($message), '/store_complaint');
    }

    private function handleStoreComplaint(string $message): void
    {
        // Simpan sebagai system message (opsyenal, untuk audit)
        ChatMessage::create([
            'channel' => $this->channel,
            'chat_id' => $this->from,
            'role'    => 'system',
            'content' => $message,
        ]);

        // Jawapan tetap (TIDAK ulang butiran)
        $ack = 'Aduan anda telah diterima. Terima kasih.';

        $this->sendReply($ack);
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
}
