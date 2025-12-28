<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class ReferenceController extends Controller
{
    public function offenseTypes(): JsonResponse
    {
        $items = DB::table('ref_offense_types')
            ->where('is_active', 1)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'message' => 'Offense types',
            'data' => $items,
        ]);
    }

    public function offenses(): JsonResponse
    {
        $items = DB::table('ref_offenses')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'section', 'name']);

        return response()->json([
            'message' => 'Offenses',
            'data' => $items,
        ]);
    }

    public function khalwatDetails(): JsonResponse
    {
        $items = DB::table('ref_khalwat_details')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        return response()->json([
            'message' => 'Khalwat details',
            'data' => $items,
        ]);
    }

    public function judiDetails(): JsonResponse
    {
        $items = DB::table('ref_judi_details')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        return response()->json([
            'message' => 'Judi details',
            'data' => $items,
        ]);
    }

    public function complaintStatuses(): JsonResponse
    {
        $items = DB::table('complaint_statuses')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'message' => 'Complaint statuses',
            'data' => $items,
        ]);
    }

    public function complaintEmailRecipients(): JsonResponse
    {
        $items = DB::table('ref_complaint_email_recipients')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'email', 'label']);

        return response()->json([
            'message' => 'Complaint email recipients',
            'data' => $items,
        ]);
    }
}
