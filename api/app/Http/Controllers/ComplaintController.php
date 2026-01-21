<?php

namespace App\Http\Controllers; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\Complaint;
use App\Models\ComplaintOyd;
use App\Models\ComplaintSeizureItem;
use App\Models\Staff;
use App\Models\District;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()->orderByDesc('id');
        $this->applyComplaintAccessScope($query, $user);
        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'List of complaints');
    }

    public function myComplaints(Request $request)
    {
        $user = $request->user();

        $query = Complaint::query()
            ->where('submitted_by_user_id', $user->id)
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'My complaints');
    }

    public function pendingApprovals(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Complaint::query()
            ->whereNotNull('approver_staff_id')
            ->whereNull('approver_confirmed_at')
            ->orderByDesc('id');

        if ($user->staff) {
            $query->where('approver_staff_id', $user->staff->id);
        } elseif ($user->name) {
            $query->whereHas('approverStaff', function ($subQuery) use ($user) {
                $subQuery->whereRaw('LOWER(name) = ?', [strtolower($user->name)]);
            });
        }

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'Pending approvals');
    }

    public function pickupQueue(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $complaintIds = DB::table('complaint_assignments')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('complaint_id');

        $query = Complaint::query()
            ->whereIn('id', $complaintIds)
            ->whereNull('pic_user_id')
            ->whereNotNull('approver_confirmed_at')
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'Pickup queue');
    }

    public function myPicComplaints(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Complaint::query()
            ->where('pic_user_id', $user->id)
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'PIC complaints');
    }

    public function show(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $complaint->load([
            'submittedBy:id,name,email,office_type,district_id',
            'submittedBy.staff',
            'receivedBy:id,name,email',
            'approverStaff:id,name,staff_id',
            'picUser:id,name',
            'appointment:id,complaint_id,start_at,end_at,status',
            'oyds:id,complaint_id,name,id_number,investigator_name,file_no',
            'seizureItems:id,complaint_id,item_no,description,storage',
        ]);
        if ($complaint->classification_id) {
            $complaint->classification_code = DB::table('complaint_classifications')
                ->where('id', $complaint->classification_id)
                ->value('code');
        }
        $isAssignedApprover = false;
        if ($user && $complaint->approverStaff) {
            if ($user->staff && $complaint->approver_staff_id) {
                $isAssignedApprover = (int) $user->staff->id === (int) $complaint->approver_staff_id;
            }
            if (! $isAssignedApprover && $user->name) {
                $isAssignedApprover = strcasecmp($user->name, $complaint->approverStaff->name) === 0;
            }
        }
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
                'is_assigned_approver' => $isAssignedApprover,
            ],
        ]);
    }

    public function approve(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $complaint->load('approverStaff:id,name');
        $isApprover = false;
        if ($user->staff && $complaint->approver_staff_id) {
            $isApprover = (int) $user->staff->id === (int) $complaint->approver_staff_id;
        }
        if (! $isApprover && $user->name && $complaint->approverStaff) {
            $isApprover = strcasecmp($user->name, $complaint->approverStaff->name) === 0;
        }
        if (! $isApprover) {
            return response()->json(['message' => 'Anda bukan pegawai pengesah yang ditetapkan.'], 403);
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

        $complaint->update([
            'approver_confirmed_at' => now(),
            'current_stage' => 'disahkan',
        ]);

        $this->assignPpaToDistrict($complaint, $user->id);

        return response()->json([
            'message' => 'Approved',
            'approvals_count' => $approvalsCount,
            'current_stage' => $complaint->current_stage,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function updateStatus(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
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
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
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

    public function updateAssignees(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'approver_staff_id' => 'nullable|exists:staff,id',
        ]);

        $payload = [];
        if ($request->filled('approver_staff_id')) {
            if ((int) $request->approver_staff_id !== (int) $complaint->approver_staff_id) {
                $payload['approver_staff_id'] = $request->approver_staff_id;
                $payload['approver_assigned_at'] = now();
            }
        }
        $payload['received_by_user_id'] = $user->id;
        $payload['received_at'] = now();

        if (! empty($payload)) {
            $complaint->update($payload);
        }

        return response()->json([
            'message' => 'Assignees updated',
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function pickup(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $assignment = DB::table('complaint_assignments')
            ->where('complaint_id', $complaint->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (! $assignment) {
            return response()->json(['message' => 'Aduan ini belum ditugaskan kepada anda.'], 403);
        }

        if ($complaint->pic_user_id) {
            return response()->json(['message' => 'Aduan ini sudah diambil oleh pegawai lain.'], 409);
        }

        DB::transaction(function () use ($complaint, $user) {
            $complaint->update([
                'pic_user_id' => $user->id,
                'pic_assigned_at' => now(),
            ]);

            DB::table('complaint_assignments')
                ->where('complaint_id', $complaint->id)
                ->where('user_id', $user->id)
                ->update([
                    'status' => 'accepted',
                    'accepted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('complaint_assignments')
                ->where('complaint_id', $complaint->id)
                ->where('user_id', '<>', $user->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'released',
                    'released_at' => now(),
                    'updated_at' => now(),
                ]);
        });

        return response()->json([
            'message' => 'Aduan berjaya diambil.',
            'data' => $complaint->load(['picUser:id,name']),
        ]);
    }

    public function updateAjPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $classificationCode = $request->payload['classification'] ?? null;
        $classificationId = null;
        if ($classificationCode) {
            $classificationId = DB::table('complaint_classifications')
                ->where('code', $classificationCode)
                ->value('id');
        }

        $payload = [
            'aj_offense_id' => $request->payload['offense_id'] ?? null,
            'aj_offense_type' => $request->payload['offense_type_id'] ?? null,
            'aj_khalwat_detail_id' => $request->payload['khalwat_detail_id'] ?? null,
            'aj_judi_detail_id' => $request->payload['judi_detail_id'] ?? null,
            'aj_notes' => $request->payload['notes'] ?? null,
            'classification_id' => $classificationId,
        ];
        $payload['received_by_user_id'] = $user->id;
        $payload['received_at'] = now();

        $complaint->update($payload);

        return response()->json([
            'message' => 'AJ payload updated',
            'aj_payload' => $request->payload,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function updateAjReport(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'report' => 'required|array',
            'report.oyds' => 'nullable|array',
            'report.seizure_items' => 'nullable|array',
        ]);

        $report = $request->report;

        $complaint->update([
            'aj_arrest_status' => $report['arrest_status'] ?? null,
            'aj_male_count' => $report['male_count'] !== '' ? $report['male_count'] : null,
            'aj_female_count' => $report['female_count'] !== '' ? $report['female_count'] : null,
            'aj_report_no' => $report['report_no'] ?? null,
            'aj_action_datetime' => $report['action_datetime'] ?? null,
            'aj_report_offense_id' => $report['offense_id'] ?? null,
            'aj_arrest_by' => $report['arrest_by'] ?? null,
            'aj_statement_datetime' => $report['statement_datetime'] ?? null,
            'aj_court_date' => $report['court_date'] ?? null,
            'aj_report_notes' => $report['report_notes'] ?? null,
            'aj_directive_staff_id' => $report['directive_staff_id'] ?? null,
            'aj_seizure_status' => $report['seizure_status'] ?? null,
        ]);

        DB::transaction(function () use ($complaint, $report) {
            ComplaintOyd::where('complaint_id', $complaint->id)->delete();
            $oyds = $report['oyds'] ?? [];
            foreach ($oyds as $row) {
                if (!array_filter($row ?? [])) {
                    continue;
                }
                ComplaintOyd::create([
                    'complaint_id' => $complaint->id,
                    'name' => $row['name'] ?? null,
                    'id_number' => $row['id_number'] ?? null,
                    'investigator_name' => $row['investigator_name'] ?? null,
                    'file_no' => $row['file_no'] ?? null,
                ]);
            }

            ComplaintSeizureItem::where('complaint_id', $complaint->id)->delete();
            $items = $report['seizure_items'] ?? [];
            foreach ($items as $row) {
                if (!array_filter($row ?? [])) {
                    continue;
                }
                ComplaintSeizureItem::create([
                    'complaint_id' => $complaint->id,
                    'item_no' => $row['item_no'] ?? null,
                    'description' => $row['description'] ?? null,
                    'storage' => $row['storage'] ?? null,
                ]);
            }
        });

        return response()->json([
            'message' => 'AJ report updated',
            'data' => $complaint->load([
                'oyds:id,complaint_id,name,id_number,investigator_name,file_no',
                'seizureItems:id,complaint_id,item_no,description,storage',
            ]),
        ]);
    }

    public function updateAkPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $payload = [
            'ak_offense_id' => $request->payload['offense_id'] ?? null,
            'ak_offense_type' => $request->payload['offense_type_id'] ?? null,
            'ak_email_cc' => $request->payload['email_cc'] ?? [],
            'ak_investigation_datetime' => $request->payload['investigation_datetime'] ?? null,
            'ak_investigator_name' => $request->payload['investigator_name'] ?? null,
            'ak_file_received_date' => $request->payload['file_received_date'] ?? null,
            'ak_ip_status' => $request->payload['ip_status'] ?? null,
            'ak_ip_due_date' => $request->payload['ip_due_date'] ?? null,
            'ak_prosecution_date' => $request->payload['prosecution_date'] ?? null,
            'ak_notes' => $request->payload['notes'] ?? null,
        ];
        $payload['received_by_user_id'] = $user->id;
        $payload['received_at'] = now();

        $appointmentMessage = null;
        $complaint->update($payload);

        if (! empty($payload['ak_investigation_datetime'])) {
            $startAt = Carbon::parse($payload['ak_investigation_datetime']);
            $endAt = (clone $startAt)->addHour();

            Appointment::updateOrCreate(
                ['complaint_id' => $complaint->id],
                [
                    'title' => $complaint->reference_no,
                    'start_at' => $startAt,
                    'end_at' => $endAt,
                    'status' => 'booked',
                    'created_by_user_id' => $user->id,
                ]
            );
            $appointmentMessage = 'Temujanji siasatan telah ditempah.';
        }

        return response()->json([
            'message' => 'AK payload updated',
            'appointment_message' => $appointmentMessage,
            'ak_payload' => $request->payload,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id', 'appointment:id,complaint_id,start_at,end_at,status']),
        ]);
    }

    public function destroy(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('pegawai_hq')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($complaint->current_stage !== 'baru') {
            return response()->json(['message' => 'Hanya aduan status baru boleh dipadam.'], 422);
        }

        DB::transaction(function () use ($complaint) {
            DB::table('complaint_approvals')->where('complaint_id', $complaint->id)->delete();
            DB::table('complaint_assignments')->where('complaint_id', $complaint->id)->delete();
            Appointment::where('complaint_id', $complaint->id)->delete();
            ComplaintOyd::where('complaint_id', $complaint->id)->delete();
            ComplaintSeizureItem::where('complaint_id', $complaint->id)->delete();
            $complaint->delete();
        });

        return response()->json([
            'message' => 'Aduan dipadam.',
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

    private function assignPpaToDistrict(Complaint $complaint, int $assignedByUserId): void
    {
        if (! $complaint->district_id) {
            return;
        }

        $ppaStaff = Staff::query()
            ->where('is_active', true)
            ->where('district_id', $complaint->district_id)
            ->where('office_type', 'daerah')
            ->where('position', 'Pegawai Penguatkuasa Agama')
            ->whereNotNull('user_id')
            ->get(['id', 'user_id']);

        foreach ($ppaStaff as $staff) {
            DB::table('complaint_assignments')->updateOrInsert(
                [
                    'complaint_id' => $complaint->id,
                    'user_id' => $staff->user_id,
                ],
                [
                    'assigned_by_user_id' => $assignedByUserId,
                    'status' => 'active',
                    'assigned_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    private function applyComplaintFilters($query, Request $request): void
    {
        $keyword = trim((string) $request->query('keyword', ''));
        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery
                    ->where('reference_no', 'like', '%' . $keyword . '%')
                    ->orWhere('complainant_name', 'like', '%' . $keyword . '%')
                    ->orWhere('district_name', 'like', '%' . $keyword . '%')
                    ->orWhere('summary', 'like', '%' . $keyword . '%');
            });
        }

        $status = trim((string) $request->query('status', ''));
        if ($status !== '') {
            $query->whereRaw('LOWER(current_stage) = ?', [strtolower($status)]);
        }

        $districtId = $request->query('district_id');
        if ($districtId !== null && $districtId !== '') {
            $query->where('district_id', (int) $districtId);
        }

        $fromDate = trim((string) $request->query('from_date', ''));
        if ($fromDate !== '') {
            $query->whereDate('complaint_date', '>=', $fromDate);
        }

        $toDate = trim((string) $request->query('to_date', ''));
        if ($toDate !== '') {
            $query->whereDate('complaint_date', '<=', $toDate);
        }

        $caseType = trim((string) $request->query('case_type', ''));
        if ($caseType !== '') {
            $query->where('case_type', strtoupper($caseType));
        }
    }

    private function applyComplaintAccessScope($query, $user): void
    {
        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            return;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
            return;
        }

        if ($user->hasAnyRole(['awam', 'user'])) {
            $query->where('submitted_by_user_id', $user->id);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function canViewComplaint(Complaint $complaint, $user): bool
    {
        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            return true;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            return $districtId && (int) $complaint->district_id === (int) $districtId;
        }

        if ($user->hasAnyRole(['awam', 'user'])) {
            return (int) $complaint->submitted_by_user_id === (int) $user->id;
        }

        return false;
    }

    private function resolveUserDistrictId($user): ?int
    {
        if (! empty($user->district_id)) {
            return (int) $user->district_id;
        }

        if ($user->staff && ! empty($user->staff->district_id)) {
            return (int) $user->staff->district_id;
        }

        return null;
    }

    private function respondWithPagination($query, Request $request, string $message)
    {
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 10;
        }

        $items = $query->paginate($perPage);

        return response()->json([
            'message' => $message,
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }
}
