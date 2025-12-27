<?php

namespace App\Http\Controllers; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Complaint;
use App\Models\District;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{
    public function myComplaints(Request $request)
    {
        $user = $request->user();

        $complaints = Complaint::query()
            ->where('submitted_by_user_id', $user->id)
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'message' => 'My complaints',
            'data' => $complaints,
        ]);
    }

    public function show(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        $approvalsCount = DB::table('complaint_approvals')
            ->where('complaint_id', $complaint->id)
            ->where('decision', 'approved')
            ->count();
        $hasApproved = false;
        if ($user) {
            $hasApproved = DB::table('complaint_approvals')
                ->where('complaint_id', $complaint->id)
                ->where('approver_user_id', $user->id)
                ->where('decision', 'approved')
                ->exists();
        }

        return response()->json([
            'message' => 'Complaint detail',
            'data' => $complaint,
            'meta' => [
                'approvals_count' => $approvalsCount,
                'approvals_required' => 2,
                'has_approved' => $hasApproved,
            ],
        ]);
    }

    public function approve(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        DB::table('complaint_approvals')->updateOrInsert(
            [
                'complaint_id' => $complaint->id,
                'approver_user_id' => $user->id,
            ],
            [
                'decision' => 'approved',
                'note' => $request->input('note'),
                'decided_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $approvalsCount = DB::table('complaint_approvals')
            ->where('complaint_id', $complaint->id)
            ->where('decision', 'approved')
            ->count();

        if ($approvalsCount >= 2) {
            $complaint->update([
                'current_stage' => 'disahkan',
            ]);
        }

        return response()->json([
            'message' => 'Approved',
            'approvals_count' => $approvalsCount,
            'current_stage' => $complaint->current_stage,
        ]);
    }

    public function updateStatus(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|string|in:baru,dalam_tindakan,kiv,selesai,disahkan',
        ]);

        $complaint->update([
            'current_stage' => $request->status,
        ]);

        return response()->json([
            'message' => 'Status updated',
            'current_stage' => $complaint->current_stage,
        ]);
    }

    public function updateCaseType(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'case_type' => 'required|string|in:AJ,AK',
        ]);

        $complaint->update([
            'case_type' => $request->case_type,
        ]);

        return response()->json([
            'message' => 'Case type updated',
            'case_type' => $complaint->case_type,
        ]);
    }

    public function updateAjPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $complaint->update([
            'aj_payload' => $request->payload,
        ]);

        return response()->json([
            'message' => 'AJ payload updated',
            'aj_payload' => $complaint->aj_payload,
        ]);
    }

    public function updateAkPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $complaint->update([
            'ak_payload' => $request->payload,
        ]);

        return response()->json([
            'message' => 'AK payload updated',
            'ak_payload' => $complaint->ak_payload,
        ]);
    }
    public function lookup(Request $request)
    {
        $request->validate([
            'reference_no' => 'required|string',
        ]);

        $complaint = Complaint::where('reference_no', $request->reference_no)->first();

        if (! $complaint) {
            return response()->json([
                'message' => 'No aduan tidak ditemui.',
            ], 404);
        }

        return response()->json([
            'message' => 'Complaint found',
            'data' => [
                'reference_no' => $complaint->reference_no,
                'case_type' => $complaint->case_type,
                'complaint_date' => $complaint->complaint_date,
                'complaint_time' => $complaint->complaint_time,
                'district_name' => $complaint->district_name,
                'current_stage' => $complaint->current_stage,
                'summary' => $complaint->summary,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'complainant_name' => 'required|string|max:255',
            'identification_number' => 'required|string|max:255',
            'contact_number' => 'required|string|max:255',
            'address' => 'required|string|max:1000',
            'district_id' => 'nullable|exists:districts,id',
            'case_type' => 'nullable|in:AJ,AK',
            'summary' => 'required|string|max:10000',
        ]);

        $now = now();
        $year = (int) $now->format('Y');
        $district = $request->district_id ? District::find($request->district_id) : null;

        // Store the complaint
        $caseType = $request->case_type ?? 'AJ';
        $referenceNo = $this->generateReferenceNo(
            $caseType,
            $district?->code,
            $now->format('ymd')
        );

        $complaint = Complaint::create([        
            'reference_no' => $referenceNo,
            'case_type' => $caseType,
            'complaint_year' => $year,
            'complaint_date' => $now->toDateString(),
            'complaint_time' => $now->format('H:i:s'),
            'complainant_name' => $request->complainant_name,
            'identification_number'    => $request->identification_number,
            'contact_number'    => $request->contact_number,
            'address'    => $request->address,
            'district_id' => $district?->id,
            'district_name' => $district?->name,
            'summary'    => $request->summary,
            'channel' => $request->channel ?? 'web',
            'current_stage' => 'baru',
            'submitted_at' => $now,
            'submitted_by_user_id' => Auth::guard('sanctum')->id(),
            'name' => $request->complainant_name,
            'contents' => $request->summary,
        ]);

        return response()->json([
            'message' => 'Complaint Submitted',
            'reference_no' => $referenceNo,
        ]);
    }

    private function generateReferenceNo(string $caseType, ?string $districtCode, string $dateCode): string
    {
        $type = strtoupper($caseType);
        $district = $districtCode ? strtoupper($districtCode) : 'NA';
        $prefix = "JAIS-{$type}-{$district}-{$dateCode}-";

        $latest = Complaint::where('reference_no', 'like', $prefix . '%')
            ->orderByDesc('reference_no')
            ->first();

        $next = 1;
        if ($latest && preg_match('/-(\d{4})$/', $latest->reference_no, $matches)) {
            $next = (int) $matches[1] + 1;
        }

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }
}
