<?php

namespace App\Http\Controllers\User; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ApiToken;
use App\Models\ApiLog;

class ApiDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();

        // Jumlah API Key
        $totalApiKeys = ApiToken::where('user_id', $user->id)->count() ?? 0;

        // Jumlah Request
        $totalRequests = ApiLog::where('user_id', $user->id)->count() ?? 0;

        // Jumlah Time Taken (ms -> s)
        $totalMs = ApiLog::where('user_id', $user->id)->sum('time_taken') ?? 0;
        $totalSeconds = $totalMs > 0 ? round($totalMs / 1000, 2) : 0;

        // Jumlah Saiz Attachment (Bytes -> MB)
        $totalBytes = ApiLog::where('user_id', $user->id)->sum('attachment_size') ?? 0;
        $totalMB = $totalBytes > 0 ? round($totalBytes / (1024 * 1024), 2) : 0;

        return response()->json([
            'message'       => 'Api Dashboard',
            'totalApiKeys'  => $totalApiKeys,
            'totalRequests' => $totalRequests,
            'totalSeconds'  => $totalSeconds,
            'totalMB'       => $totalMB
        ]);
    }
}
