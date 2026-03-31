<?php

namespace App\Http\Controllers;

use App\Models\MobilePushToken;
use App\Services\MobilePushNotificationService;
use Illuminate\Http\Request;

class MobilePushTokenController extends Controller
{
    public function __construct(
        private MobilePushNotificationService $mobilePushNotificationService
    ) {
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|max:255',
            'platform' => 'nullable|string|max:20',
            'device_name' => 'nullable|string|max:255',
        ]);

        MobilePushToken::query()->updateOrCreate(
            ['token' => $validated['token']],
            [
                'user_id' => $request->user()->id,
                'platform' => $validated['platform'] ?? null,
                'device_name' => $validated['device_name'] ?? null,
                'is_active' => true,
                'last_seen_at' => now(),
            ]
        );

        return response()->json([
            'message' => 'Push token registered.',
        ]);
    }

    public function destroy(Request $request)
    {
        $validated = $request->validate([
            'token' => 'required|string|max:255',
        ]);

        MobilePushToken::query()
            ->where('user_id', $request->user()->id)
            ->where('token', $validated['token'])
            ->update([
                'is_active' => false,
                'last_seen_at' => now(),
            ]);

        return response()->json([
            'message' => 'Push token disabled.',
        ]);
    }

    public function test(Request $request)
    {
        $result = $this->mobilePushNotificationService->sendTestNotificationForUser($request->user());

        return response()->json($result, $result['ok'] ? 200 : 422);
    }
}
