<?php

namespace App\Http\Controllers\Modules;

use App\Http\Controllers\Controller;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;

class DocumentController extends Controller
{
        /*
        * Extract Document Contents
        * http://localhost:5678/webhook-test/54d39176-c69c-474a-8bfe-f07aa29df0a8
        * make sure N8N workflow is running
        * change the URL to production when switch to production
        */
    public function processDocument(Request $request)
    {
        // Validate
        $request->validate([
            'image' => 'required|image|mimes:jpg,jpeg,png|max:5120',
        ]);


        // Store temporarily
        $path = $request->file('image')->store('temp', 'public');
        $imagePath = storage_path('app/public/' . $path);

        // Check N8N service availability
        $n8nUrl = 'http://localhost:5678/webhook-test/54d39176-c69c-474a-8bfe-f07aa29df0a8';
        try {
            $ping = Http::timeout(3)->get(parse_url($n8nUrl, PHP_URL_SCHEME) . '://' . parse_url($n8nUrl, PHP_URL_HOST) . ':' . parse_url($n8nUrl, PHP_URL_PORT));
            if (!$ping->successful()) {
                return response()->json(['error' => 'Service not available'], 503);
            }
        } catch (\Exception $e) {
            return response()->json(['error' => 'Service not available'], 503);
        }

        //return response()->json(['success' => 'image uploaded'], 200);

        // Send as multipart/form-data
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

        // Clean up
        Storage::disk('public')->delete($path);

        // Return N8N response (handle both JSON and text)
        $contentType = $response->header('Content-Type');
        if (str_contains($contentType, 'application/json')) {
            return response()->json($response->json(), $response->status());
        } else {
            return response($response->body(), $response->status());
        }
    }
}
