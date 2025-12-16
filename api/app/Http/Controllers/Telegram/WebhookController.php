<?php

namespace App\Http\Controllers\Telegram;
use App\Http\Controllers\Controller; 
use App\Models\TelegramMessage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class WebhookController extends Controller
{
    public function handleWebhook(Request $request)
    {
        $update = $request->all();

        //\Log::info('Telegram Webhook Update:', $update);

        // Dapatkan chat_id & mesej user
        $chatId = $update['message']['chat']['id'] ?? null;
        $text   = strtolower(trim($update['message']['text'] ?? ''));

        // save chatid dan message  dalam database untuk AI memory ( nanti )
        TelegramMessage::create([
            'chatid'  => $chatId,
            'messages'=> $text,
        ]); 

        // Contoh balas "hello" dengan "world"
        if ($chatId && $text === 'hello') {
            $this->sendMessage($chatId, 'world');
        }

        return response()->json(['ok' => true]);
    }



    /** Hantar mesej ke Telegram user 
     * @param int $chatId
     * @param string $text  
     * @return void
     * Both Token dalam .env
     * Bot Token dalam config/services.php
     * Bot API: https://api.telegram.org/bot<token>/METHOD_NAME
     * METHOD_NAME: sendMessage
     * Parameters: chat_id, text
     * Bot sendMessage API doc: https://core.telegram.org/bots/api#sendmessage
     * Boleh guna Laravel HTTP Client untuk hantar POST request
     * https://laravel.com/docs/10.x/http-client
     * @botfather akan bagi token bila buat bot baru
     * @botfather juga boleh bagi arahan lain untuk setup bot
     * Contoh arahan: /setwebhook https://your-domain.com/telegram/webhook
     * Pastikan URL boleh diakses dari internet
     * Daftar webhook URL dengan @botfather supaya Telegram tahu nak hantar mesej ke mana
     * Ngrok atau servis lain boleh digunakan untuk testing webhook secara tempatan
     * Contoh penggunaan Laravel HTTP Client untuk hantar mesej
     * Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
     *     'chat_id' => $chatId,
     *    'text'    => $text,
     * ]);
     * 
     * @return void
    */
    private function sendMessage($chatId, $text)
    {
        $token = config('services.telegram.bot_token');

        Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text'    => $text,
        ]);
    }

    public function showToken()
    {
        return config('services.telegram.bot_token');
    }

    public function setWebhook()
    {
        $token = config('services.telegram.bot_token');
        $appUrl = config('app.url');
        $webhookUrl = "{$appUrl}/api/telegram/webhook";

        $response = Http::post("https://api.telegram.org/bot{$token}/setWebhook", [
            'url' => $webhookUrl,
        ]);

        return $response->json();
    }

    public function removeWebhook()
    {
        $token = config('services.telegram.bot_token');

        $response = Http::post("https://api.telegram.org/bot{$token}/deleteWebhook");

        return $response->json();
    }

    public function webhookInfo()
    {
        $token = config('services.telegram.bot_token');

        $response = Http::get("https://api.telegram.org/bot{$token}/getWebhookInfo");

        return $response->json();
    }
}
