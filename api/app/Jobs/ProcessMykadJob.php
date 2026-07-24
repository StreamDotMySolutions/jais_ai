<?php

namespace App\Jobs;

use App\Services\LlmComplaintService;
use App\Services\MetaMediaService;
use App\Services\MykadExtractionService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Handles an inbound MyKad image on the WhatsApp Meta channel:
 * download → AI extraction → stage identity → start the complaint flow.
 * On an unreadable image the user is asked to resend; nothing is staged.
 */
class ProcessMykadJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    private const CHANNEL = 'whatsapp-meta';

    public function __construct(
        public string $mediaId,
        public string $from,
        public array $hints = []
    ) {
    }

    public function handle(
        MetaMediaService $media,
        MykadExtractionService $extractor,
        LlmComplaintService $llm
    ): void {
        Log::info('ProcessMykadJob started', ['from' => $this->from, 'media_id' => $this->mediaId]);

        $downloaded = $media->download($this->mediaId);
        if ($downloaded === null) {
            $this->send(config('llm.mykad_unreadable_prompt'));
            return;
        }

        $extracted = $extractor->extract($downloaded['bytes'], $downloaded['mime']);
        if ($extracted === null) {
            $this->send(config('llm.mykad_unreadable_prompt'));
            return;
        }

        $llm->stageIdentity(self::CHANNEL, $this->from, $downloaded['bytes'], $downloaded['mime'], $extracted);

        // Kick off the remaining questions (district first). The identity is injected
        // into the model context from staging, so it asks for the district next.
        $reply = $llm->replyWithoutUserInput(self::CHANNEL, $this->from, $this->hints);

        $ack = config('llm.mykad_accepted_prompt');
        $this->send($reply ? trim($ack . "\n\n" . $reply) : $ack);
    }

    private function send(string $body): void
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
                    'text' => ['body' => $body],
                ]
            );
    }
}
