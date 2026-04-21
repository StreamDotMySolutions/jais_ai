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

        \Log::info('Received WhatsApp Web webhook', [
            'payload' => $request->all(),
        ]);

        // basic validation (jangan terlalu ketat dulu)
        // $data = $request->validate([
        //     'from'      => 'required|string',
        //     'body'      => 'nullable|string',
        //     'timestamp' => 'nullable|integer',
        //     'isGroup'   => 'required|boolean',
        // ]);

        $data = $request->validate([
            'from'      => 'required|string', // phone number with country code, e.g., 60123456789
            'body'      => 'nullable|string', // message text
            'timestamp' => 'nullable|integer', // unix timestamp
            'isGroup'   => 'required|boolean',// whether the message is from a group
            'type'      => 'required|string', // message type: text, image, video, etc.
            'hasMedia'  => 'required|boolean',// whether the message has media
            'media'     => 'nullable|array',// media details if hasMedia is true
            'media.mimetype' => 'nullable|string', // e.g., image/jpeg
            'media.filename' => 'nullable|string',// original filename
            'media.data'     => 'nullable|string', // base64 encoded media data
        ]);

        Log::info('WhatsApp Web message received', $data);

        // if $data['hasMedia'] is true, ignore for now
        if (isset($data['hasMedia']) && $data['hasMedia']) {
            //Log::info('Ignoring media message for now', $data);

            // downLoad media to storage
            $base64 = $data['media']['data'];
            $mimetype = $data['media']['mimetype'] ?? 'application/octet-stream';

            // Buang prefix kalau ada
            if (str_contains($base64, ',')) {
                $base64 = explode(',', $base64)[1];
            }

            $extension = explode('/', $mimetype)[1] ?? 'bin';
            $fileName = 'wa_' . time() . '_' . Str::random(6) . '.' . $extension;


            // periksa mimetype jpg dan png baru simpan
            if (!in_array($extension, ['jpeg', 'jpg', 'png'])) {
                return response()->json([
                    'status' => 'ignored',
                    'message' => 'Unsupported media type.',
                ]);
            }


            $this->downloadMedia($base64, $fileName);

            // Storage::disk('public')->put(
            //     'whatsapp/' . $fileName,
            //     base64_decode($base64)
            // );

            return response()->json([
                'status' => 'saved',
                'message' => 'Media received',
                'path' => 'storage/whatsapp/' . $fileName
            ]);
            // end download
            

            return response()->json([
                'status' => 'ignored',
                'message' => 'Media messages are not supported yet.',
            ]);
        }

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

        // Intercept control commands before hitting the LLM
        if ($incomingMessage === '/reset') {
            ChatMessage::where('channel', 'whatsapp_web')
                ->where('chat_id', $data['from'])
                ->delete();

            Log::info('WhatsApp Web /reset — chat history cleared', ['from' => $data['from']]);

            return $this->reply('Perbualan dikosongkan. Sila mula semula.');
        }

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
                    'content' => config('llm.complaint_system_prompt'), // prompt sistem khusus aduan
                ],
            ],
            $chatHistory //->toArray()
        ); 

         // 4. Hantar ke OpenAI
        $openaiKey = config('services.openai.api_key');

        if (!$openaiKey) {
            Log::error('OpenAI API key not configured');
            return;
        }

        $llmResponse = Http::timeout(15)->withHeaders([
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

        // Detect if the message is a /store_complaint command
        if ($this->isStoreComplaintCommand($reply)) {
            $referenceNo = $this->handleStoreComplaint($reply, $data['from']);

            // Skip sending a reply back to the user
            return $this->reply("Aduan anda telah berjaya diterima. Ini nombor rujukan aduan : {$referenceNo}");
        }
     

        return $this->reply($reply);        
    } // end handle

    private function reply($message)
    {
        return response()->json([
            'status' => 'ok',
            'message' => $message ?? null,
        ]);
    }

    private function isStoreComplaintCommand(string $message): bool
    {
        //return str_starts_with(trim($message), '/store_complaint');
        //\Log::info('Checking for /store_complaint command in message: ' . $message);
        return Str::startsWith(trim($message), '/store_complaint');
    }

     // Handle the /store_complaint command
    private function handleStoreComplaint(string $message, string $chatId)
    {
       Log::info('Store complaint command detected, skip reply', [
                'reply' => $message,
                'chat_id' => $chatId,
    ]);

        // 1. Remove the command part
        $jsonString = trim(substr($message, strlen('/store_complaint')));

        // 2. Decode JSON into array
        $data = json_decode($jsonString, true);

        // 3. Safety check (LLM can hallucinate)
        if (! is_array($data)) {
            // log error or silently ignore
            return;
        }

        \Log::info('Storing complaint from WhatsApp', [
            'data' => $data,
        ]);

        // get reference no
        $referenceNo = $this->generateReferenceNo();

        // 4. Store in Complaint DB
        \App\Models\Complaint::create([
            'reference_no' => $referenceNo,
            'complaint_year' => (int) now()->format('Y'),
            'complaint_date' => now()->toDateString(),
            'complaint_time' => now()->format('H:i:s'),
            'complainant_name' => $data['name'] ?? 'Tidak dinyatakan',
            'identification_number' => $data['identification_number'] ?? 'Tidak dinyatakan',
            'contact_number' =>  $data['contact_number'] ?? 'Tidak dinyatakan',
            'address' => $data['location'] ?? 'Tidak dinyatakan',
            'district_name' => $data['district'] ?? null,
            'summary' => $data['contents'] ?? 'Tidak dinyatakan',
            'channel' => 'whatsapp_web',
            'current_stage' => 'baru',
            'submitted_at' => now(),
        ]);


        // clear ChatMessage for this chat_id
        ChatMessage::where('chat_id', $chatId)->delete();

        // Optionally, send confirmation back to user
        // This is handled in the main handle() method after calling this function
        return $referenceNo;

        
    }

    // Generate a unique reference number for the complaint
    private function generateReferenceNo(): string
    {
        $year = now()->format('Y');
        $prefix = "JAIS-{$year}-";

        do {
            $referenceNo = $prefix . Str::upper(Str::random(6));
        } while (\App\Models\Complaint::where('reference_no', $referenceNo)->exists());

        return $referenceNo;
    }

    // function to download media from base64 data
    private function downloadMedia($mediaData, $filename)
    {

        // make filename unique
        //$filename = time() . '_' . $filename;

        $storagePath = storage_path('app/public/whatsapp_media/');
        if (!file_exists($storagePath)) {
            mkdir($storagePath, 0755, true);
        }
        $filePath = $storagePath . $filename;
        file_put_contents($filePath, base64_decode($mediaData));

        
        return $filePath;

        // Simpan path ke DB atau lakukan apa-apa tindakan lain yang diperlukan
    }



}
