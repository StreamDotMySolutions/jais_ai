<?php

namespace App\Http\Controllers\GitHub;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handleWebhook(Request $request): JsonResponse
    {
        $secret = config('services.github.webhook_secret');

        if ($secret) {
            $signature = $request->header('X-Hub-Signature-256');

            if (!$signature) {
                return response()->json(['error' => 'Missing signature'], 403);
            }

            $payload = $request->getContent();
            $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);

            if (!hash_equals($expected, $signature)) {
                Log::warning('GitHub Webhook - Invalid signature');
                return response()->json(['error' => 'Invalid signature'], 403);
            }
        }
        $projectRoot = base_path('..');
        $frontendPath = base_path('../frontend');
        $apiPath = base_path();

        $commands = [
            'git_pull' => "cd {$projectRoot} && git pull origin main 2>&1",
            'npm_build' => "cd {$frontendPath} && npm run build 2>&1",
            'migrate_seed' => "cd {$apiPath} && php artisan migrate --seed --force 2>&1",
        ];

        $results = [];

        foreach ($commands as $key => $command) {
            $output = null;
            $exitCode = null;
            exec($command, $output, $exitCode);

            $outputStr = implode("\n", $output);
            $results[$key] = [
                'output' => $outputStr,
                'exit_code' => $exitCode,
            ];

            Log::info("GitHub Webhook - {$key}", [
                'output' => $outputStr,
                'exit_code' => $exitCode,
            ]);
        }

        return response()->json([
            'message' => 'Deploy completed',
            'results' => $results,
        ]);
    }
}
