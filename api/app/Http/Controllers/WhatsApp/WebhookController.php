<?php

namespace App\Http\Controllers\WhatsApp; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ComplaintModel;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use App\Jobs\WhatsAppSendToLlmJob;
use App\Jobs\SendToLlmJob;
use App\Models\ChatMessage;
use App\Services\LlmComplaintService;


class WebhookController extends Controller
{

    public function verify(Request $request)
    {
        $verifyToken = config('services.whatsapp.verify_token');

        $mode = $request->query('hub_mode');
        $token = $request->query('hub_verify_token');
        $challenge = $request->query('hub_challenge');

        if ($mode === 'subscribe' && $token === $verifyToken) {
            return response($challenge, 200);
        }

        return response('Forbidden', 403);
    }

    public function handleWebhook(Request $request)
    {

        $payload = $request->all();

        \Log::info('WhatsApp Webhook Payload:', $payload);

        $message = strtolower(trim(
            data_get($payload, 'entry.0.changes.0.value.messages.0.text.body')
        ));

        $from = data_get($payload, 'entry.0.changes.0.value.messages.0.from');

        // Which of our business numbers this message was sent TO — used so the
        // reply goes out from the same number the user contacted (a single WABA
        // can host multiple numbers sharing one webhook).
        $phoneNumberId = data_get($payload, 'entry.0.changes.0.value.metadata.phone_number_id');

        // Ownership guard: this server only handles its own WABA number. If the
        // shared webhook delivers a message for a different number, ignore it so
        // dev and production stay isolated. Lenient when either side is unknown
        // (e.g. simulated payloads without metadata, or WHATSAPP_PHONE_NUMBER_ID unset).
        $ownPhoneNumberId = config('services.whatsapp.phone_number_id');
        if ($ownPhoneNumberId && $phoneNumberId && $phoneNumberId !== $ownPhoneNumberId) {
            \Log::info('WhatsApp webhook ignored — phone_number_id not owned by this server', [
                'received' => $phoneNumberId,
                'expected' => $ownPhoneNumberId,
            ]);
            return response()->json(['status' => 'ignored']);
        }

        if (!$message || !$from) {
            return response()->json(['status' => 'ignored']);
        }

        if (in_array($message, ['/reset', 'reset', '/batal', 'batal'], true)) {
            app(LlmComplaintService::class)->resetHistory('whatsapp-meta', $from);
            \Log::info('WhatsApp reset — chat history cleared', ['from' => $from, 'trigger' => $message]);
            $this->sendMessage($from, 'Perbualan dikosongkan. Sila mula semula.', $phoneNumberId);
            return response()->json(['status' => 'ok']);
        }

        $hints = [];
        $profileName = data_get($payload, 'entry.0.changes.0.value.contacts.0.profile.name');
        if (is_string($profileName) && trim($profileName) !== '') {
            $hints['name'] = trim($profileName);
        }
        $hints['phone'] = preg_replace('/^60/', '0', $from);

        dispatch(new SendToLlmJob(
            message: $message,
            from: $from,
            channel: 'whatsapp-meta',
            hints: $hints,
            phoneNumberId: $phoneNumberId
        ));

        return response()->json(['status' => 'ok']);
    }

    private function sendMessage(string $to, string $body, ?string $phoneNumberId = null): void
    {
        // Reply from the number the user messaged (from inbound metadata),
        // falling back to the configured default if it wasn't provided.
        $phoneNumberId = $phoneNumberId ?: config('services.whatsapp.phone_number_id');

        Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/v19.0/' .
                $phoneNumberId .
                '/messages',
                [
                    'messaging_product' => 'whatsapp',
                    'to'   => $to,
                    'type' => 'text',
                    'text' => ['body' => $body],
                ]
            );
    }

    // public function sendMessage($to, $message)
    // {
     
    //     $token = env('WHATSAPP_ACCESS_TOKEN');
    //     $phone_id = env('WHATSAPP_PHONE_NUMBER_ID');

    //        $url = "https://graph.facebook.com/v15.0/{$phone_id}/messages";

    //     $response = Http::withToken($token)->post($url, [
    //         'messaging_product' => 'whatsapp',
    //         'to' => $to,
    //         'text' => [
    //             'body' => $message
    //         ]
    //     ]);

    //     \Log::info('WhatsApp Send Message Response:', ['response' => $response->json()]);
    // }

    // public function test()
    // {
    //     return response()->json(['message' => 'WhatsApp Webhook is working!'], 200);
    // }


 

}
