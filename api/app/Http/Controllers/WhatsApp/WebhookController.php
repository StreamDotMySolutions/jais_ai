<?php

namespace App\Http\Controllers\WhatsApp; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ComplaintModel;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use App\Jobs\WhatsAppSendToLlmJob;   
use App\Jobs\SendToLlmJob;


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

        if (!$message || !$from) {
            return response()->json(['status' => 'ignored']);
        }


        // Dispatch ke LLM (WhatsApp)
        // dispatch(new WhatsAppSendToLlmJob(
        //     message: $message,
        //     phone: $from,
        // ));

        dispatch(new SendToLlmJob(
            message: $message,
            from: $from,
            channel: 'whatsapp'
        ));

  

        // LOGIC HELLO → WORLD
        // if ($message === 'hello') {
        //     $this->sendMessage($from, 'world');
        // }

        return response()->json(['status' => 'ok']);

    }

    public function sendMessage($to, $message)
    {
     
        $token = env('WHATSAPP_ACCESS_TOKEN');
        $phone_id = env('WHATSAPP_PHONE_NUMBER_ID');

           $url = "https://graph.facebook.com/v15.0/{$phone_id}/messages";

        $response = Http::withToken($token)->post($url, [
            'messaging_product' => 'whatsapp',
            'to' => $to,
            'text' => [
                'body' => $message
            ]
        ]);

        \Log::info('WhatsApp Send Message Response:', ['response' => $response->json()]);
    }

    public function test()
    {
        return response()->json(['message' => 'WhatsApp Webhook is working!'], 200);
    }


 

}
