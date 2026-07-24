<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Downloads media (e.g. an uploaded MyKad image) from the WhatsApp Cloud API.
 *
 * The Meta Graph API exposes media in two steps: first resolve the media id to a
 * short-lived, authenticated download URL, then fetch the bytes from that URL —
 * both calls require the app access token as a Bearer header.
 */
class MetaMediaService
{
    private const GRAPH_BASE = 'https://graph.facebook.com/v19.0/';
    private const TIMEOUT = 20;
    private const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
    private const ALLOWED_MIME = ['image/jpeg', 'image/jpg', 'image/png'];

    /**
     * Resolve a WhatsApp media id and download its bytes.
     *
     * @return array{bytes:string,mime:string}|null Null on any failure (logged).
     */
    public function download(string $mediaId): ?array
    {
        $token = config('services.whatsapp.token');
        if (!$token) {
            Log::error('WhatsApp access token not configured — cannot download media');
            return null;
        }

        $meta = Http::timeout(self::TIMEOUT)
            ->withToken($token)
            ->get(self::GRAPH_BASE . $mediaId);

        if (!$meta->ok()) {
            Log::error('Meta media metadata fetch failed', [
                'media_id' => $mediaId,
                'status'   => $meta->status(),
                'body'     => $meta->body(),
            ]);
            return null;
        }

        $url  = data_get($meta->json(), 'url');
        $mime = strtolower((string) data_get($meta->json(), 'mime_type'));

        if (!$url) {
            Log::error('Meta media metadata missing url', ['media_id' => $mediaId]);
            return null;
        }

        if (!in_array($mime, self::ALLOWED_MIME, true)) {
            Log::warning('Meta media has unsupported mime type', ['media_id' => $mediaId, 'mime' => $mime]);
            return null;
        }

        // The media URL sits on lookaside.fbsbx.com and still requires the Bearer token.
        $binary = Http::timeout(self::TIMEOUT)
            ->withToken($token)
            ->get($url);

        if (!$binary->ok()) {
            Log::error('Meta media binary download failed', [
                'media_id' => $mediaId,
                'status'   => $binary->status(),
            ]);
            return null;
        }

        $bytes = $binary->body();

        if ($bytes === '' || strlen($bytes) > self::MAX_BYTES) {
            Log::warning('Meta media empty or too large', [
                'media_id' => $mediaId,
                'size'     => strlen($bytes),
            ]);
            return null;
        }

        return ['bytes' => $bytes, 'mime' => $mime];
    }
}
