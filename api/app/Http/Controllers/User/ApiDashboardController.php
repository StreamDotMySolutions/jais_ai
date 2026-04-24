<?php

namespace App\Http\Controllers\User; 

use App\Http\Controllers\Controller; 
use App\Models\Complaint;
use App\Models\District;
use Illuminate\Http\Request;
use App\Models\ApiToken;
use App\Models\ApiLog;
use Illuminate\Support\Facades\DB;

class ApiDashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $role = (string) ($user?->roles?->pluck('name')->first() ?? '');

        $isHqScope = $user && $user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq']);
        $isDistrictScope = $user && $user->hasRole('pegawai_daerah');
        $viewerDistrictId = $this->resolveUserDistrictId($user);

        $selectedDistrictId = null;
        if ($isDistrictScope) {
            $selectedDistrictId = $viewerDistrictId;
        } elseif ($isHqScope) {
            $candidate = (int) $request->query('district_id', 0);
            $selectedDistrictId = $candidate > 0 ? $candidate : null;
        }

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

        $complaintQuery = Complaint::query();
        $this->applyDashboardScope($complaintQuery, $user, $isHqScope, $isDistrictScope, $selectedDistrictId);

        $totalComplaints = (clone $complaintQuery)->count();
        $newComplaints = (clone $complaintQuery)->where('current_stage', 'baru')->count();
        $waitingApprovalStage = (clone $complaintQuery)->where('current_stage', 'tunggu_pengesahan')->count();
        $waitingPiStage = (clone $complaintQuery)->where('current_stage', 'menunggu_tindakan_pi')->count();
        $approvedStage = (clone $complaintQuery)->where('current_stage', 'disahkan')->count();
        $dispatchedToDistrictStage = (clone $complaintQuery)->where('current_stage', 'dihantar_ke_daerah')->count();
        $underActionStage = (clone $complaintQuery)->where('current_stage', 'dalam_tindakan')->count();
        $kivStage = (clone $complaintQuery)->where('current_stage', 'kiv')->count();
        $reportCompletedStage = (clone $complaintQuery)->where('current_stage', 'laporan_tindakan')->count();
        $finishedStage = (clone $complaintQuery)->where('current_stage', 'selesai')->count();
        $inProgressComplaints = (clone $complaintQuery)
            ->whereIn('current_stage', ['tunggu_pengesahan', 'menunggu_tindakan_pi', 'disahkan', 'dihantar_ke_daerah', 'dalam_tindakan', 'kiv'])
            ->count();
        $completedComplaints = (clone $complaintQuery)
            ->whereIn('current_stage', ['laporan_tindakan', 'selesai'])
            ->count();
        $pendingApproval = (clone $complaintQuery)
            ->whereNotNull('approver_staff_id')
            ->whereNull('approver_confirmed_at')
            ->count();
        $myPicComplaints = (clone $complaintQuery)
            ->where('pic_user_id', $user->id)
            ->count();

        $stageSummary = (clone $complaintQuery)
            ->select('current_stage', DB::raw('COUNT(*) as total'))
            ->groupBy('current_stage')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'stage' => (string) $row->current_stage,
                'total' => (int) $row->total,
            ])
            ->values();

        $recentComplaints = (clone $complaintQuery)
            ->select(['id', 'reference_no', 'district_id', 'district_name', 'current_stage', 'complaint_date', 'summary'])
            ->orderByDesc('complaint_date')
            ->orderByDesc('id')
            ->limit(6)
            ->get();

        $districtSummary = [];
        if ($isHqScope) {
            $districtSummary = (clone $complaintQuery)
                ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
                ->select(
                    'districts.id as district_id',
                    'districts.name as district_name',
                    DB::raw('COUNT(complaints.id) as total')
                )
                ->groupBy('districts.id', 'districts.name')
                ->orderByDesc('total')
                ->limit(12)
                ->get()
                ->map(fn ($row) => [
                    'district_id' => $row->district_id ? (int) $row->district_id : null,
                    'district_name' => (string) ($row->district_name ?? 'Tidak diketahui'),
                    'total' => (int) $row->total,
                ])
                ->values();
        }

        $scope = 'user';
        if ($isHqScope) {
            $scope = 'hq';
        } elseif ($isDistrictScope) {
            $scope = 'daerah';
        }

        $viewerDistrict = null;
        if ($viewerDistrictId) {
            $viewerDistrict = District::query()
                ->where('id', $viewerDistrictId)
                ->first(['id', 'name']);
        }

        $availableDistricts = [];
        if ($isHqScope) {
            $availableDistricts = District::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return response()->json([
            'message'       => 'Api Dashboard',
            'totalApiKeys'  => $totalApiKeys,
            'totalRequests' => $totalRequests,
            'totalSeconds'  => $totalSeconds,
            'totalMB'       => $totalMB,
            'scope'         => $scope,
            'role'          => $role,
            'viewer' => [
                'district_id' => $viewerDistrict?->id,
                'district_name' => $viewerDistrict?->name,
            ],
            'filters' => [
                'district_id' => $selectedDistrictId,
                'available_districts' => $availableDistricts,
            ],
            'metrics' => [
                'total' => $totalComplaints,
                'new' => $newComplaints,
                'in_progress' => $inProgressComplaints,
                'completed' => $completedComplaints,
                'pending_approval' => $pendingApproval,
                'my_pic' => $myPicComplaints,
                'operational' => [
                    'tunggu_pengesahan' => $waitingApprovalStage,
                    'menunggu_tindakan_pi' => $waitingPiStage,
                    'disahkan' => $approvedStage,
                    'dihantar_ke_daerah' => $dispatchedToDistrictStage,
                    'dalam_tindakan' => $underActionStage,
                    'kiv' => $kivStage,
                    'laporan_tindakan' => $reportCompletedStage,
                    'selesai' => $finishedStage,
                ],
            ],
            'stage_summary' => $stageSummary,
            'district_summary' => $districtSummary,
            'recent_complaints' => $recentComplaints,
        ]);
    }

    private function applyDashboardScope($query, $user, bool $isHqScope, bool $isDistrictScope, ?int $selectedDistrictId): void
    {
        if ($isHqScope) {
            if ($selectedDistrictId) {
                $query->where('district_id', $selectedDistrictId);
            }
            return;
        }

        if ($isDistrictScope) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
            return;
        }

        $query->where('submitted_by_user_id', $user->id);
    }

    private function resolveUserDistrictId($user): ?int
    {
        if (! $user) {
            return null;
        }

        if (! empty($user->district_id)) {
            return (int) $user->district_id;
        }

        if ($user->staff && ! empty($user->staff->district_id)) {
            return (int) $user->staff->district_id;
        }

        return null;
    }
}
