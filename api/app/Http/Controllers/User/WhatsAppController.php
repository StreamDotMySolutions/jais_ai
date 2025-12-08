<?php

namespace App\Http\Controllers\User;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsAppController extends Controller
{
    public function verify(Request $request)
    {
        $mode      = $request->query('hub.mode');
        $token     = $request->query('hub.verify_token');
        $challenge = $request->query('hub.challenge');

        $verifyToken = config('services.whatsapp.verify_token', env('WHATSAPP_VERIFY_TOKEN'));

        if ($mode === 'subscribe' && $token === $verifyToken) {
            return response($challenge, 200);
        }

        return response('Verification failed', 403);
    }

    public function handle(Request $request)
    {
        $data = $request->all();
        Log::info('WhatsApp Webhook Incoming', $data);

        try {
            $entry    = $data['entry'][0] ?? null;
            $changes  = $entry['changes'][0] ?? null;
            $value    = $changes['value'] ?? null;
            $messages = $value['messages'] ?? [];

            if (empty($messages)) {
                return response()->json(['status' => 'no_message'], 200);
            }

            $message = $messages[0];

            $fromNumber = $message['from'] ?? null;
            $msgType    = $message['type'] ?? null;
            $textBody   = '';

            if ($msgType === 'text') {
                $textBody = trim($message['text']['body'] ?? '');
            }

            Log::info('WhatsApp Message Parsed', [
                'from' => $fromNumber,
                'type' => $msgType,
                'text' => $textBody,
            ]);

            return response()->json(['status' => 'ok'], 200);

        } catch (\Throwable $e) {
            Log::error('WhatsApp Webhook Error', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json(['status' => 'error'], 500);
        }
    }
}
