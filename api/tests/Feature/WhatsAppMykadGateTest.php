<?php

namespace Tests\Feature;

use App\Jobs\ProcessMykadJob;
use App\Jobs\SendToLlmJob;
use Illuminate\Support\Facades\Bus;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class WhatsAppMykadGateTest extends TestCase
{
    private function textPayload(string $from, string $body): array
    {
        return [
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'contacts' => [['profile' => ['name' => 'Test User']]],
                        'messages' => [[
                            'from' => $from,
                            'type' => 'text',
                            'text' => ['body' => $body],
                        ]],
                    ],
                ]],
            ]],
        ];
    }

    private function imagePayload(string $from, string $mediaId): array
    {
        return [
            'entry' => [[
                'changes' => [[
                    'value' => [
                        'contacts' => [['profile' => ['name' => 'Test User']]],
                        'messages' => [[
                            'from' => $from,
                            'type' => 'image',
                            'image' => ['id' => $mediaId],
                        ]],
                    ],
                ]],
            ]],
        ];
    }

    public function test_text_without_mykad_is_blocked_and_prompts_for_mykad(): void
    {
        Bus::fake();
        Http::fake();
        Storage::fake('local');

        $response = $this->postJson('/api/whatsapp', $this->textPayload('60123456789', 'Saya nak buat aduan'));

        $response->assertOk();
        Bus::assertNotDispatched(SendToLlmJob::class);

        // The "please upload MyKad" reply was pushed to the Graph API.
        Http::assertSent(fn ($request) => str_contains($request->url(), 'graph.facebook.com')
            && str_contains($request['text']['body'] ?? '', 'MyKad'));
    }

    public function test_image_message_dispatches_mykad_job(): void
    {
        Bus::fake();
        Http::fake();
        Storage::fake('local');

        $response = $this->postJson('/api/whatsapp', $this->imagePayload('60123456789', 'MEDIA-123'));

        $response->assertOk();
        Bus::assertDispatched(ProcessMykadJob::class, fn ($job) => $job->mediaId === 'MEDIA-123'
            && $job->from === '60123456789');
    }
}
