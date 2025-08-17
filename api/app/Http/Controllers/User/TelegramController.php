<?php

namespace App\Http\Controllers\User;
use App\Http\Controllers\Controller; 

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;

class TelegramController extends Controller
{
    public function webhook(Request $request)
    {
        $update = $request->all();

        // Dapatkan chat_id & mesej user
        $chatId = $update['message']['chat']['id'] ?? null;
        $text   = strtolower(trim($update['message']['text'] ?? ''));

        if ($chatId && $text === 'hello') {
            $this->sendMessage($chatId, 'world');
        }

        return response()->json(['ok' => true]);
    }

    private function sendMessage($chatId, $text)
    {
        $token = config('services.telegram.bot_token');

        Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text'    => $text,
        ]);
    }
}
