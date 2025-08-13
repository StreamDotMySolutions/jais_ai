<?php

namespace App\Jobs;

use App\Models\DocumentJob;
use App\Models\ApiLog;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use OpenAI\Laravel\Facades\OpenAI;

class ProcessDocumentJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $jobId;
    protected $startRequest;

    public function __construct($jobId, $startRequest)
    {
        $this->jobId = $jobId;
        $this->startRequest = $startRequest;
    }

    public function handle()
    {

        
        $docJob = DocumentJob::find($this->jobId);
        if (!$docJob) {
            Log::error("DocumentJob ID {$this->jobId} tidak dijumpai.");
            return;
        }

        $docJob->update(['status' => 'processing']);

        try {
            // 1. Pastikan path fail & folder output
            $pdfPath = storage_path('app/' . $docJob->file_path);
            $outputDir = storage_path('app/outputs/' . $this->jobId);
            if (!file_exists($outputDir)) {
                mkdir($outputDir, 0777, true);
            }

            // 2. Path penuh ke marker_single.exe
            $markerExe = 'marker_single.exe'; // letak di root Laravel
            // if (!file_exists($markerExe)) {
            //     throw new \Exception("marker_single.exe tidak dijumpai di: {$markerExe}");
            // }

            // 3. Jalankan marker
            $command = "\"{$markerExe}\" \"{$pdfPath}\" --output_format markdown --output_dir \"{$outputDir}\"";
            Log::info("Jalankan command: {$command}");
            shell_exec($command);

            // 4. Cari fail .md secara recursive (termasuk subfolder random)
            $markdownFile = null;
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($outputDir, \FilesystemIterator::SKIP_DOTS),
                \RecursiveIteratorIterator::SELF_FIRST
            );

            foreach ($iterator as $file) {
                if (strtolower(pathinfo($file, PATHINFO_EXTENSION)) === 'md') {
                    $markdownFile = $file->getPathname();
                    break;
                }
            }

            if (!$markdownFile) {
                throw new \Exception("Markdown tidak dijana oleh marker_single.exe");
            }

            $markdownContent = file_get_contents($markdownFile);

            // 5. Hantar ke OpenAI
            //$client = \OpenAI::client(env('OPENAI_API_KEY'));
            
            // $response = OpenAI::chat()->create([
            //     'model' => 'gpt-4',
            //     'messages' => [
            //         ['role' => 'user', 'content' => 'Bila jambatan pulau pinang dibina ?'],
            //     ],
            // ]);

            Log::info("Hantar request ke OpenAI");
            $startRequest = $this->startRequest;
            $startAiCall = now();

            $response =  OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Classify the document and extract key values as JSON.Give the model name and tokens used too'
                    ],
                    [
                        'role' => 'user',
                        'content' => $markdownContent
                    ]
                ],
                'response_format' => ['type' => 'json_object']
            ]);

            Log::info("OpenAI dah balas");
            $resultJson = $response->choices[0]->message->content ?? '{}';

            // Ambil data daripada response
            $userId = $docJob->user_id ?? null; // Ambil dari rekod DocumentJob
            $model  = $response->model ?? null;
            $tokens = $response->usage->total_tokens ?? 0;

            // Convert string JSON ke array
            //$resultJson = $response->choices[0]->message->content ?? '{}';
            $decoded = json_decode($resultJson, true);

            // Ambil value
            $modelFromAi  = $decoded['model_name'] ?? null;
            $tokensFromAi = $decoded['tokens_used'] ?? null;
            
            $endRequest = now();
            $timeTaken = $endRequest->diffInMilliseconds($startRequest);

            ApiLog::create([
                'user_id'         => 4, // Pastikan DocumentJob ada user_id
                'ai_name'         => 'OpenAI',
                'model_name'      => $modelFromAi,
                'module_name'     => 'PDF',
                'attachment_size' => filesize($pdfPath),
                'tokens_used'     => $tokensFromAi,
                'start_request'   => $startRequest,
                'end_request'     => $endRequest,
                'time_taken'      => $timeTaken,
                'request_date'    => now(),
            ]);

         
            
            // 6. Simpan result
            //$resultJson = $response->choices[0]->message->content ?? '{}';
            $docJob->update([
                'status' => 'completed',
                'result' => $resultJson
            ]);


        } catch (\Exception $e) {
            Log::error("ProcessDocumentJob gagal: " . $e->getMessage());
            $docJob->update([
                'status' => 'failed',
                'result' => $e->getMessage()
            ]);
        }
    }
}
