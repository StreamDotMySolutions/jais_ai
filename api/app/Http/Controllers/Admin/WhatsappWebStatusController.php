<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class WhatsappWebStatusController extends Controller
{
    private const CACHE_KEY = 'whatsapp_web_status';
    private const TTL_SECONDS = 600;
    private const HEARTBEAT = '__heartbeat__';
    private const STALE_AFTER_SECONDS = 30;

    public function ingest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'state'    => 'required|string|max:40',
            'qr'       => 'nullable|string|max:4000',
            'reason'   => 'nullable|string|max:500',
            'pid'      => 'nullable|integer',
            'platform' => 'nullable|string|max:40',
            'script'   => 'nullable|string|max:80',
            'ts'       => 'nullable|integer',
        ]);

        $current = Cache::get(self::CACHE_KEY, []);
        $now = now()->toIso8601String();

        if ($data['state'] === self::HEARTBEAT) {
            $current['last_heartbeat_at'] = $now;
            // Heartbeats may also refresh identity if the caller sends it.
            foreach (['platform', 'script', 'pid'] as $k) {
                if (isset($data[$k])) {
                    $current[$k] = $data[$k];
                }
            }
        } else {
            $current = array_merge($current, [
                'state'             => $data['state'],
                'qr'                => $data['state'] === 'waiting-for-scan' ? ($data['qr'] ?? null) : null,
                'reason'            => $data['reason'] ?? null,
                'pid'               => $data['pid'] ?? null,
                'platform'          => $data['platform'] ?? null,
                'script'            => $data['script'] ?? null,
                'updated_at'        => $now,
                'last_heartbeat_at' => $now,
            ]);
        }

        Cache::put(self::CACHE_KEY, $current, self::TTL_SECONDS);

        return response()->json(['ok' => true]);
    }

    public function show(): JsonResponse
    {
        $payload = Cache::get(self::CACHE_KEY);

        if (!$payload) {
            return response()->json([
                'state'             => 'offline',
                'qr'                => null,
                'reason'            => null,
                'pid'               => null,
                'platform'          => null,
                'script'            => null,
                'updated_at'        => null,
                'last_heartbeat_at' => null,
            ])->header('Cache-Control', 'no-store');
        }

        if (!empty($payload['last_heartbeat_at'])) {
            $age = Carbon::parse($payload['last_heartbeat_at'])->diffInSeconds(now());
            if ($age > self::STALE_AFTER_SECONDS) {
                $payload['state'] = 'offline';
                $payload['qr'] = null;
            }
        }

        return response()->json($payload)->header('Cache-Control', 'no-store');
    }

    /**
     * Admin-triggered logout — instructs the Node bridge (over loopback)
     * to client.logout() and re-initialize, which produces a fresh QR.
     */
    public function logout(): JsonResponse
    {
        $controlUrl = config('services.whatsappweb.control_url');
        $secret     = config('services.whatsappweb.internal_secret');

        if (!$controlUrl || !$secret) {
            return response()->json([
                'ok'    => false,
                'error' => 'Control endpoint not configured',
            ], 500);
        }

        try {
            $resp = Http::timeout(5)
                ->withHeaders(['X-WAWEB-SECRET' => $secret])
                ->post($controlUrl);
        } catch (\Throwable $e) {
            Log::warning('whatsapp-web logout: control request failed', ['error' => $e->getMessage()]);
            return response()->json([
                'ok'    => false,
                'error' => 'Bridge control endpoint unreachable',
            ], 503);
        }

        if (!$resp->successful()) {
            return response()->json([
                'ok'     => false,
                'error'  => 'Bridge rejected logout',
                'status' => $resp->status(),
            ], 502);
        }

        return response()->json(['ok' => true]);
    }
}
