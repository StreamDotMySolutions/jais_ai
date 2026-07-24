<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

/**
 * Extracts name, NRIC and address from a Malaysian MyKad image using OpenAI vision.
 *
 * Returns a validated identity array only when the model is confident it read a
 * genuine MyKad and all three fields are present; otherwise null, which the caller
 * treats as "not a readable MyKad — ask the user to resend".
 */
class MykadExtractionService
{
    private const MODEL = 'gpt-4.1-mini';
    private const ENDPOINT = 'https://api.openai.com/v1/chat/completions';
    private const TIMEOUT = 30;

    /**
     * @return array{name:string,nric:string,address:string}|null
     */
    public function extract(string $bytes, string $mime): ?array
    {
        $apiKey = config('services.openai.api_key');
        if (!$apiKey) {
            Log::error('OpenAI API key not configured — cannot extract MyKad');
            return null;
        }

        $dataUri = 'data:' . $mime . ';base64,' . base64_encode($bytes);

        $response = Http::timeout(self::TIMEOUT)
            ->withHeaders([
                'Authorization' => 'Bearer ' . $apiKey,
                'Content-Type'  => 'application/json',
            ])
            ->post(self::ENDPOINT, [
                'model'           => self::MODEL,
                'response_format' => ['type' => 'json_object'],
                'messages'        => [
                    ['role' => 'system', 'content' => config('llm.mykad_extraction_prompt')],
                    [
                        'role'    => 'user',
                        'content' => [
                            ['type' => 'text', 'text' => 'Baca MyKad ini dan pulangkan JSON seperti diarahkan.'],
                            ['type' => 'image_url', 'image_url' => ['url' => $dataUri]],
                        ],
                    ],
                ],
            ]);

        if (!$response->ok()) {
            Log::error('MyKad extraction LLM error', ['body' => $response->body()]);
            return null;
        }

        $content = data_get($response->json(), 'choices.0.message.content');
        $data = json_decode((string) $content, true);

        if (!is_array($data) || empty($data['success'])) {
            Log::info('MyKad extraction returned no readable MyKad', ['content' => $content]);
            return null;
        }

        $name    = is_string($data['name'] ?? null) ? trim($data['name']) : '';
        $nric    = is_string($data['nric'] ?? null) ? preg_replace('/\D/', '', $data['nric']) : '';
        $address = is_string($data['address'] ?? null) ? trim($data['address']) : '';

        // A Malaysian NRIC is exactly 12 digits. Reject anything else — it means
        // the model misread the card or this was not a MyKad.
        if ($name === '' || $address === '' || !preg_match('/^\d{12}$/', $nric)) {
            Log::info('MyKad extraction failed validation', [
                'name_present'    => $name !== '',
                'address_present' => $address !== '',
                'nric_len'        => strlen($nric),
            ]);
            return null;
        }

        return ['name' => $name, 'nric' => $nric, 'address' => $address];
    }
}
