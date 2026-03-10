<?php

namespace App\Http\Controllers\GitHub;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Log;

class WebhookController extends Controller
{
    public function handleWebhook(): JsonResponse
    {
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
