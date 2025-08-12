<?php

namespace App\Jobs;

use App\Models\DocumentJob;
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

    public function __construct($jobId)
    {
        $this->jobId = $jobId;
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
            $response =  OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'system',
                        'content' => 'Classify the document and extract key values as JSON'
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

            // 6. Simpan result
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
