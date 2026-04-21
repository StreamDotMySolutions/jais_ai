<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class WhatsappWebStatusController extends Controller
{
    private const CACHE_KEY = 'whatsapp_web_status';
    private const TTL_SECONDS = 600;
    private const HEARTBEAT = '__heartbeat__';
    private const STALE_AFTER_SECONDS = 30;

    public function ingest(Request $request): JsonResponse
    {
        $data = $request->validate([
            'state'  => 'required|string|max:40',
            'qr'     => 'nullable|string|max:4000',
            'reason' => 'nullable|string|max:500',
            'pid'    => 'nullable|integer',
            'ts'     => 'nullable|integer',
        ]);

        $current = Cache::get(self::CACHE_KEY, []);
        $now = now()->toIso8601String();

        if ($data['state'] === self::HEARTBEAT) {
            $current['last_heartbeat_at'] = $now;
        } else {
            $current = array_merge($current, [
                'state'             => $data['state'],
                'qr'                => $data['state'] === 'waiting-for-scan' ? ($data['qr'] ?? null) : null,
                'reason'            => $data['reason'] ?? null,
                'pid'               => $data['pid'] ?? null,
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
}
