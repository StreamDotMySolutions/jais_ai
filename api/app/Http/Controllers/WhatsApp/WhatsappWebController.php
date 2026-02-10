<?php
namespace App\Http\Controllers\WhatsApp; 
use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

use App\Models\ChatMessage;

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

        // contoh logik balas mesej ringkas
        // if($incomingMessage == 'hello') {
        //     Log::info('Received greeting message from WhatsApp Web user: ' . $data['from']);
        //     // boleh tambah logik lain di sini
     
        //     return $this->reply('Hello! How can I assist you today?');
        // }   

        // OpenAI integration dan logik lain akan datang di sini
        // dapatkan history berdasarkan $data['from'] untuk konteks
        // hantar mesej beserta konteks ke OpenAI
        // terima balasan dari OpenAI
        // log balasan dari OpenAI
        // hantar balasan guna $this->reply() atau simpan ke DB untuk diproses kemudian


        // contoh simpan ke DB (ChatMessage)
        // Schema::create('chat_messages', function (Blueprint $table) {
        //     $table->id();
        //     $table->string('channel');
        //     $table->string('chat_id')->index();
        //     $table->enum('role', ['user', 'assistant', 'system']);
        //     $table->text('content');
        //     $table->timestamps();
        // });
        ChatMessage::create([
            'channel' => 'whatsapp_web',
            'chat_id' => $data['from'],
            'role'    => 'user',
            'content' => $data['body'] ?? '',
        ]);

        // ambil 10 mesej terakhir sebagai konteks
        // $history = ChatMessage::where('channel', 'whatsapp_web')
        //     ->where('chat_id', $data['from'])
        //     ->orderBy('created_at', 'desc')
        //     ->take(10)
        //     ->get();

        // 2. Ambil 10 mesej terakhir sebagai memori
        $chatHistory = ChatMessage::where('channel', 'whatsapp_web')
            ->where('chat_id', $data['from'])
            ->latest()
            ->take(10)
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn ($m) => [
                'role' => $m->role,
                'content' => $m->content,
            ])
            ->toArray();

        // 3. Bina payload OpenAI (STRUKTUR BETUL)
        $messages = array_merge(
            [
                [
                    'role' => 'system',
                    'content' => config('llm.complaint_system_prompt'),
                ],
            ],
            $chatHistory //->toArray()
        ); 

         // 4. Hantar ke OpenAI
        $openaiKey = env('OPENAI_API_KEY') ?: config('services.openai.api_key');

        if (!$openaiKey) {
            Log::error('OpenAI API key not configured');
            return;
        }

        $llmResponse = Http::withHeaders([
            'Authorization' => 'Bearer ' . $openaiKey,
            'Content-Type'  => 'application/json',
        ])->post('https://api.openai.com/v1/chat/completions', [
            'model' => 'gpt-4.1-mini',
            'messages' => $messages,
        ]);

        if (!$llmResponse->ok()) {
            Log::error('LLM error', [
                'body' => $llmResponse->body(),
            ]);
            return;
        }

        $reply = data_get($llmResponse->json(), 'choices.0.message.content');

        // Jika tiada reply, hentikan di sini
        if (!$reply) {
            return;
        }
        
        // Simpan reply ke DB
        ChatMessage::create([
            'channel' => 'whatsapp_web',
            'chat_id' => $data['from'],
            'role'    => 'assistant',
            'content' => $reply,
        ]);

        return $this->reply($reply);        
    } // end handle

    private function reply($message)
    {
        return response()->json([
            'status' => 'ok',
            'message' => $message ?? null,
        ]);
    }

}
