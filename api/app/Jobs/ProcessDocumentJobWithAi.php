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

class ProcessDocumentJobWithAi implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $jobId;
    protected $userId;
    protected $startRequest;

    public function __construct($jobId, $startRequest, $userId)
    {
        $this->jobId = $jobId;
        $this->startRequest = $startRequest;
        $this->userId = $userId;
    }

    public function handle()
    {

        Log::info('hello');
       \Log::info(config('app.api_key'));
        $docJob = DocumentJob::find($this->jobId);
        if (!$docJob) {
            Log::error("DocumentJob ID {$this->jobId} tidak dijumpai.");
            return;
        }

        $docJob->update(['status' => 'processing']);

        try {
            $filePath = storage_path('app/' . $docJob->file_path);
            if (!file_exists($filePath)) {
                throw new \Exception("Fail tidak dijumpai di: {$filePath}");
            }

            $startRequest = $this->startRequest;

            // 1. Upload fail ke OpenAI
            
            $uploadCurl = curl_init();
            curl_setopt($uploadCurl, CURLOPT_URL, 'https://api.openai.com/v1/files');
            curl_setopt($uploadCurl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($uploadCurl, CURLOPT_POST, true);
            curl_setopt($uploadCurl, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . config('app.api_key')
            ]);

            curl_setopt($uploadCurl, CURLOPT_POSTFIELDS, [
                'file' => new \CURLFile($filePath),
                'purpose' => 'assistants'
            ]);

            $uploadResponse = curl_exec($uploadCurl);
            if ($uploadResponse === false) {
                throw new \Exception('Upload Error: ' . curl_error($uploadCurl));
            }
            curl_close($uploadCurl);

            $fileData = json_decode($uploadResponse, true);
            $fileId = $fileData['id'] ?? null;

            if (!$fileId) {
                throw new \Exception("Gagal upload file: " . $uploadResponse);
            }

            Log::info("File uploaded with ID: {$fileId}");
            

            // 2. Minta model proses fail
            $aiCurl = curl_init();
            curl_setopt($aiCurl, CURLOPT_URL, 'https://api.openai.com/v1/responses');
            curl_setopt($aiCurl, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($aiCurl, CURLOPT_POST, true);
            curl_setopt($aiCurl, CURLOPT_HTTPHEADER, [
                'Content-Type: application/json',
                'Authorization: Bearer ' .  config('app.api_key')
            ]);

            $postData = [
                'model' => 'gpt-4o-mini',
                'input' => 'Classify the document and extract key values as JSON with this format:
                {
                    "model_name": "gpt-4o-mini",
                    "tokens_used": "<estimated>",
                    "document_type": "...",
                    "key_values": {...}
                }',
                'file_ids' => [$fileId],
                'response_format' => ['type' => 'json_object']
            ];

            curl_setopt($aiCurl, CURLOPT_POSTFIELDS, json_encode($postData));

            $aiResponse = curl_exec($aiCurl);
            if ($aiResponse === false) {
                throw new \Exception('AI Request Error: ' . curl_error($aiCurl));
            }
            curl_close($aiCurl);

            $resultData = json_decode($aiResponse, true);
            $resultJson = $resultData['output_text'] ?? '{}';

            $decoded = json_decode($resultJson, true);
            $modelFromAi  = $decoded['model_name'] ?? null;
            $tokensFromAi = $decoded['tokens_used'] ?? 0;

            $endRequest = now();
            $timeTaken = $endRequest->diffInMilliseconds($startRequest);

            // 3. Simpan log API
            $apiLog = ApiLog::create([
                'user_id'         => $this->userId,
                'ai_name'         => 'OpenAI',
                'model_name'      => $modelFromAi,
                'module_name'     => 'UPLOAD TO AI',
                'attachment_size' => filesize($filePath),
                'tokens_used'     => $tokensFromAi,
                'start_request'   => $startRequest,
                'end_request'     => $endRequest,
                'time_taken'      => $timeTaken,
                'request_date'    => now(),
            ]);

            // 4. Update status document job
            $docJob->update([
                'status' => 'completed',
                'api_log_id' => $apiLog->id,
                'result' => $resultJson
            ]);

            Log::info("ProcessDocumentJobWithAi berjaya untuk Job ID {$this->jobId}");

        } catch (\Exception $e) {
            Log::error("ProcessDocumentJobWithAi gagal: " . $e->getMessage());
            $docJob->update([
                'status' => 'failed',
                'result' => $e->getMessage()
            ]);
        }
    }
}
