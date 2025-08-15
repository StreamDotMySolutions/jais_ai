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

class ProcessImageJob implements ShouldQueue
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
        $docJob = DocumentJob::find($this->jobId);
        if (!$docJob) {
            Log::error("DocumentJob ID {$this->jobId} tidak dijumpai.");
            return;
        }

        $docJob->update(['status' => 'processing']);

        try {
            // 1. Path fail
            $imagePath = storage_path('app/' . $docJob->file_path);
            if (!file_exists($imagePath)) {
                throw new \Exception("Fail gambar tidak dijumpai: {$imagePath}");
            }

            // 2. Encode gambar ke base64
            $imageData = base64_encode(file_get_contents($imagePath));
            $imageMime = mime_content_type($imagePath);
            $imageBase64 = "data:{$imageMime};base64,{$imageData}";

            Log::info("Hantar gambar ke OpenAI");

            $startRequest = $this->startRequest;

            // 3. Call OpenAI dengan multimodal
            // $response = OpenAI::chat()->create([
            //     'model' => 'gpt-4o-mini',
            //     'messages' => [
            //         [
            //             'role' => 'system',
            //             'content' => 'Analyze the image and return the result in JSON with this format:
            //             {
            //                 "model_name": "<use exactly gpt-4o-mini>",
            //                 "tokens_used": "<estimated or 0>",
            //                 "description": "...",
            //                 "detected_objects": [...]
            //             }'
            //         ],
            //         [
            //             'role' => 'user',
            //             'content' => [
            //                 ['type' => 'text', 'text' => 'Please analyze this image.'],
            //                 ['type' => 'image_url', 'image_url' => $imageBase64]
            //             ]
            //         ]
            //     ],
            //     'response_format' => ['type' => 'json_object']
            // ]);
            
            $response = OpenAI::chat()->create([
                'model' => 'gpt-4o-mini',
                'messages' => [
                    [
                        'role' => 'user',
                        'content' => [
                            [
                                'type' => 'text', 
                                //'text' => 'Tolong describe gambar ini'
                                'text' => 'Classify the image and extract key values as JSON with this format:
                                        {
                                            "model_name": "...",
                                            "tokens_used": "...",
                                            "document_type": "...",
                                            "key_values": {...}
                                        }'
                            ],

                            [
                                'type' => 'image_url',
                                'image_url' => [
                                    'url' => 'data:image/jpeg;base64,' . $imageData
                                ]
                            ]
                        ]
                    ]
                ],
            ]);

            // 4. Ambil result dari AI
            $resultJson = $response->choices[0]->message->content ?? '{}';

            // Ambil model & tokens dari metadata API
            $modelFromAi = $response->model ?? null;
            //$tokensFromAi = $response->tokens_used ?? 0;
            //$tokensFromAi = $response->usage->total_tokens ?? 0;

            

            $endRequest = now();
            $timeTaken = $endRequest->diffInMilliseconds($startRequest);

   

            // 6. Update DocumentJob
            $data = $resultJson;
            $clean = preg_replace('/^```(?:json)?\s*/', '', $data); // remove starting ```json or ```
            $clean = preg_replace('/\s*```$/', '', $clean); // remove ending ```
            $data = json_decode($clean, true); // decode to associative array
            
            //\Log::info($clean);

            // 5. Simpan log API
            $apiLog = ApiLog::create([
                'user_id'         => $this->userId,
                'ai_name'         => 'OpenAI',
                'model_name'      => $modelFromAi ?? 'gpt-4o-mini',
                'module_name'     => 'Image',
                'attachment_size' => filesize($imagePath),
                'tokens_used'     => isset($data['tokens_used']) ? (int) $data['tokens_used'] : 0,
                'start_request'   => $startRequest,
                'end_request'     => $endRequest,
                'time_taken'      => $timeTaken,
                'request_date'    => now(),
            ]);


            
            $docJob->update([
                'status'     => 'completed',
                'api_log_id' => $apiLog->id,
                'result'     => $clean
            ]);

        } catch (\Exception $e) {
            Log::error("ProcessImageJob gagal: " . $e->getMessage());
            $docJob->update([
                'status' => 'failed',
                'result' => $e->getMessage()
            ]);
        }
    }
}
