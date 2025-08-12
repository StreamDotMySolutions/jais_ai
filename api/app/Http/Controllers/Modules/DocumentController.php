<?php

namespace App\Http\Controllers\Modules;

use App\Http\Controllers\Controller;

use App\Models\ApiLog;
use App\Models\DocumentJob;

use App\Jobs\ProcessDocumentJob;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
    /*
    * Extract Document Contents
    * http://localhost:5678/webhook-test/54d39176-c69c-474a-8bfe-f07aa29df0a8
    * make sure N8N workflow is running
    * make sure use Bearer Token
    * change the URL to production when switch to production
    */


    public function processDocument(Request $request)
    {
        // Masa mula
        $startTime = microtime(true);
        $startRequest = now();

        // Validate
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png|max:5120',
        ]);

        $user = $request->user();

        // Store temporarily
        $path = $request->file('image')->store('temp', 'public');
        $imagePath = storage_path('app/public/' . $path);

        // Check N8N service availability
        $n8nUrl = 'http://localhost:5678/webhook-test/54d39176-c69c-474a-8bfe-f07aa29df0a8';
        try {
            $ping = Http::timeout(3)->get(
                parse_url($n8nUrl, PHP_URL_SCHEME) . '://' .
                parse_url($n8nUrl, PHP_URL_HOST) . ':' .
                parse_url($n8nUrl, PHP_URL_PORT)
            );
            if (!$ping->successful()) {
                return response()->json(['error' => 'Service not available'], 503);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Service not available'], 503);
        }

        // Hantar gambar ke N8N
        try {
            $response = Http::attach(
                'data',
                file_get_contents($imagePath),
                basename($imagePath)
            )->timeout(30)->post($n8nUrl);
        } catch (\Exception $e) {
            Storage::disk('public')->delete($path);
            return response()->json(['error' => 'Service not available'], 503);
        }

        // Masa tamat
        $endRequest = now();
        $timeTaken = round(microtime(true) - $startTime, 3);

        // Clean up
        Storage::disk('public')->delete($path);

        // Ambil body sebagai string
        //$bodyString = $response->body();

        $data = $response->body();
        $clean = preg_replace('/^```(?:json)?\s*/', '', $data); // remove starting ```json or ```
        $clean = preg_replace('/\s*```$/', '', $clean); // remove ending ```
      
       // $model = $data->model;
        //\Log::info($clean);

        $data = json_decode($clean, true); // decode to associative array

        $model  = $data['model']  ?? null;
        $tokens = $data['tokens'] ?? null;

        // \Log::info('Model: ' . $model);
        // \Log::info('Tokens: ' . $tokens);


        // Simpan API Log
        ApiLog::create([
            'user_id'         => $user->id,
            'ai_name'         => 'OpenAI',
            'model_name'      => $model ?? null, // tukar ikut model sebenar
            'module_name'     => 'document_analysis',
            'attachment_size' => $request->file('image')->getSize(),
            'tokens_used'     => $tokens ?? 0,
            'start_request'   => $startRequest,
            'end_request'     => $endRequest,
            'time_taken'      => $timeTaken,
            'request_date'    => now(),
        ]);

        // Return N8N response (handle JSON/text)
        $contentType = $response->header('Content-Type');
        if (str_contains($contentType, 'application/json')) {
            return response()->json($response->json(), $response->status());
        } else {
            return response($response->body(), $response->status());
        }
    }

    public function upload(Request $request)
    {

        // Validate
        $request->validate([
            'file' => 'required|mimes:pdf|max:5120', // 5120 = 5 MB
        ]);

        $file = $request->file('file');
        $path = $file->store('uploads');

        // Database
        $job = DocumentJob::create([
            'file_path' => $path,
            'status' => 'pending'
        ]);

        // Job
        ProcessDocumentJob::dispatch($job->id);

        return response()->json([
            'status' => 'accepted',
            'job_id' => $job->id,
            'result_url' => route('job.result', ['id' => $job->id])
        ]);
    }

    public function result($id)
    {
        $job = DocumentJob::find($id);
        if (!$job) {
            return response()->json(['error' => 'Job not found'], 404);
        }

        return response()->json([
            'status' => $job->status,
            'result' => $job->status === 'completed' ? json_decode($job->result, true) : null
        ]);
    }


}
