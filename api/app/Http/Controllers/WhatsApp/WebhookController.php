<?php

namespace App\Http\Controllers\WhatsApp; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ComplaintModel;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use App\Jobs\WhatsAppSendToLlmJob;
use App\Jobs\SendToLlmJob;
use App\Jobs\ProcessMykadJob;
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

        \Log::info('WhatsApp Webhook Payload: '.json_encode($payload));

        $from = data_get($payload, 'entry.0.changes.0.value.messages.0.from');
        $type = data_get($payload, 'entry.0.changes.0.value.messages.0.type');
        $message = strtolower(trim(
            data_get($payload, 'entry.0.changes.0.value.messages.0.text.body')
        ));

        // Ignore non-message webhooks (delivery/read statuses etc.).
        if (!$from || !$type) {
            return response()->json(['status' => 'ignored']);
        }

        $hints = [];
        $profileName = data_get($payload, 'entry.0.changes.0.value.contacts.0.profile.name');
        if (is_string($profileName) && trim($profileName) !== '') {
            $hints['name'] = trim($profileName);
        }
        $hints['phone'] = preg_replace('/^60/', '0', $from);

        // Image message → MyKad extraction pipeline.
        if ($type === 'image') {
            $mediaId = data_get($payload, 'entry.0.changes.0.value.messages.0.image.id');
            if (!$mediaId) {
                return response()->json(['status' => 'ignored']);
            }

            dispatch(new ProcessMykadJob(
                mediaId: $mediaId,
                from: $from,
                hints: $hints
            ));

            return response()->json(['status' => 'ok']);
        }

        // From here we only handle text.
        if ($type !== 'text' || !$message) {
            return response()->json(['status' => 'ignored']);
        }

        if (in_array($message, ['/reset', 'reset', '/batal', 'batal'], true)) {
            app(LlmComplaintService::class)->resetHistory('whatsapp-meta', $from);
            \Log::info('WhatsApp reset — chat history cleared', ['from' => $from, 'trigger' => $message]);
            $this->sendMessage($from, 'Perbualan dikosongkan. Sila mula semula.');
            return response()->json(['status' => 'ok']);
        }

        // Hard gate: no complaint questions until a MyKad has been read for this chat.
        if (!app(LlmComplaintService::class)->hasIdentity('whatsapp-meta', $from)) {
            $this->sendMessage($from, config('llm.mykad_required_prompt'));
            return response()->json(['status' => 'ok']);
        }

        dispatch(new SendToLlmJob(
            message: $message,
            from: $from,
            channel: 'whatsapp-meta',
            hints: $hints
        ));

        return response()->json(['status' => 'ok']);
    }

    private function sendMessage(string $to, string $body): void
    {
        Http::withToken(config('services.whatsapp.token'))
            ->post(
                'https://graph.facebook.com/v19.0/' .
                config('services.whatsapp.phone_number_id') .
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
