<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsAppSendToLlmJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public string $message;
    public string $phone; // nombor WhatsApp user

    public function __construct(string $message, string $phone)
    {
        $this->message = $message;
        $this->phone   = $phone;
    }

    public function handle(): void
    {
        // 1. Ambil OpenAI API key
        $openaiKey = env('OPENAI_API_KEY') ?: config('services.openai.api_key');

        if (!$openaiKey) {
            Log::error('OpenAI API key not configured');
            return;
        }

        // 2. Hantar mesej ke LLM
        $llmResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $openaiKey,
            'Content-Type'  => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4.1-mini',
            'messages' => [
                [
                    'role' => 'system',
                    'content' =>
                        'Anda ialah pembantu WhatsApp. ' .
                        'Gunakan Bahasa Melayu secara default. ' .
                        'Jawab secara ringkas, jelas, dan mesra.'
                ],
                [
                    'role' => 'user',
                    'content' => $this->message
                ],
            ],
        ]);

        if (!$llmResponse->ok()) {
            Log::error('LLM error', [
                'response' => $llmResponse->body(),
            ]);
            return;
        }

        $reply = data_get($llmResponse->json(), 'choices.0.message.content');

        if (!$reply) {
            return;
        }

        // if reply starts with /store_complaint, skip reply
        if (str_starts_with($reply, '/store_complaint')) {
            Log::info('Store complaint command detected, skip WhatsApp reply', [
                'reply' => $reply,
            ]);

            // 1. Remove the command part
            $jsonString = trim(substr($reply, strlen('/store_complaint')));

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

            // 4. Store in DB
            \App\Models\Complaint::create([
                'contact_number' => $data['phone_no'] ?? $this->phone,
                'contents'       => $data['contents'] ?? null,
                // optional:
                 'location'    => $data['location'] ?? null,
                 'name'        => $data['name'] ?? null,
            ]);


            return;
        }

        // 3. Hantar balasan ke WhatsApp
        $this->replyToWhatsApp($reply);
    }

    protected function replyToWhatsApp(string $text): void
    {
        Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/v19.0/' .
                config('services.whatsapp.phone_number_id') .
                '/messages',
                [
                    'messaging_product' => 'whatsapp',
                    'to'   => $this->phone,
                    'type' => 'text',
                    'text' => [
                        'body' => $text,
                    ],
                ]
            );
    }
}
