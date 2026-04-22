<?php
namespace App\Http\Controllers\WhatsApp;

use App\Http\Controllers\Controller;
use App\Services\LlmComplaintService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class WhatsappWebController extends Controller
{
    public function __construct(private LlmComplaintService $llm) {}

    public function handle(Request $request)
    {
        Log::info('Received WhatsApp Web webhook', ['payload' => $request->all()]);

        $data = $request->validate([
            'from'           => 'required|string',
            'body'           => 'nullable|string',
            'timestamp'      => 'nullable|integer',
            'isGroup'        => 'required|boolean',
            'type'           => 'required|string',
            'hasMedia'       => 'required|boolean',
            'media'          => 'nullable|array',
            'media.mimetype' => 'nullable|string',
            'media.filename' => 'nullable|string',
            'media.data'     => 'nullable|string',
        ]);

        Log::info('WhatsApp Web message received', $data);

        if (!empty($data['hasMedia'])) {
            return $this->handleMedia($data);
        }

        $from = $data['from'];
        $body = $data['body'] ?? '';
        $incomingMessage = strtolower(trim($body));

        if ($incomingMessage === '/reset') {
            $this->llm->resetHistory('whatsapp_web', $from);
            Log::info('WhatsApp Web /reset — chat history cleared', ['from' => $from]);
            return $this->reply('Perbualan dikosongkan. Sila mula semula.');
        }

        $reply = $this->llm->handleIncoming('whatsapp_web', $from, $body);

        return $this->reply($reply);
    }

    private function handleMedia(array $data)
    {
        $base64 = $data['media']['data'] ?? '';
        $mimetype = $data['media']['mimetype'] ?? 'application/octet-stream';

        if (str_contains($base64, ',')) {
            $base64 = explode(',', $base64)[1];
        }

        $extension = explode('/', $mimetype)[1] ?? 'bin';

        if (!in_array($extension, ['jpeg', 'jpg', 'png'])) {
            return response()->json([
                'status' => 'ignored',
                'message' => 'Unsupported media type.',
            ]);
        }

        $fileName = 'wa_' . time() . '_' . Str::random(6) . '.' . $extension;
        $this->downloadMedia($base64, $fileName);

        return response()->json([
            'status' => 'saved',
            'message' => 'Media received',
            'path' => 'storage/whatsapp/' . $fileName,
        ]);
    }

    private function reply(?string $message)
    {
        return response()->json([
            'status' => 'ok',
            'message' => $message,
        ]);
    }

    private function downloadMedia(string $mediaData, string $filename): string
    {
        $storagePath = storage_path('app/public/whatsapp_media/');
        if (!file_exists($storagePath)) {
            mkdir($storagePath, 0755, true);
        }
        $filePath = $storagePath . $filename;
        file_put_contents($filePath, base64_decode($mediaData));
        return $filePath;
    }
}
