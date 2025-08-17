<?php

namespace App\Http\Controllers\User; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Apilog;

class ApiLogController extends Controller
{
    
    public function index()
    {
        $api_logs = ApiLog::query()
                            ->where('user_id', auth()->id()) // tapis ikut user login
                            ->orderBy('id','DESC')
                            ->paginate(10)
                            ->withQueryString();

        return response()->json([
            'message' => 'Api Logs',
            'api_logs' => $api_logs
        ]);
    }

    public function show(Request $request, $id)
    {
        $log = ApiLog::find($id);

        if (!$log || !$log->documentJob) {
            return response()->json([
                'message' => 'DocumentJob not found for this ApiLog',
            ], 404);
        }

        return response()->json($log->documentJob);
    }
}
