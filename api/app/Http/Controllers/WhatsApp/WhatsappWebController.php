<?php
namespace App\Http\Controllers\WhatsApp; 
use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WhatsappWebController extends Controller
{
    public function handle(Request $request)
    {
        // basic validation (jangan terlalu ketat dulu)
        $data = $request->validate([
            'from'      => 'required|string',
            'body'      => 'nullable|string',
            'timestamp' => 'nullable|integer',
            'isGroup'   => 'required|boolean',
        ]);

        Log::info('WhatsApp Web message received', $data);

        // normalize data
        $message = [
            'platform'   => 'whatsapp_web',
            'from'       => $data['from'],
            'text'       => $data['body'] ?? null,
            'timestamp'  => $data['timestamp'] ?? now()->timestamp,
            'is_group'   => $data['isGroup'],
        ];

        // 👉 di sinilah langkah seterusnya:
        // dispatch job
        // simpan ke DB
        // hantar ke AI
        // reply balik ke Node (jika perlu)

        // huruf kecil semua untuk ujian
        $incomingMessage = strtolower(trim($data['body'] ?? '' ));

        if($incomingMessage == 'hello') {
            Log::info('Received greeting message from WhatsApp Web user: ' . $data['from']);
            // boleh tambah logik lain di sini
            $replyMessage = 'Hello! How can I assist you today?';
        }   

        return response()->json([
            'status' => 'ok',
            'message' => $replyMessage ?? null,
        ]);
    }

}
