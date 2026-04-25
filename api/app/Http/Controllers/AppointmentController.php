<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use App\Models\District;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
            'district_id' => 'nullable|integer|exists:districts,id',
        ]);

        $startAt = Carbon::parse($validated['start_at'])->startOfDay();
        $endAt = Carbon::parse($validated['end_at'])->endOfDay();
        $isDistrictScope = $this->isDistrictScopedUser($user);
        $isHqScope = ! $isDistrictScope;

        $viewerDistrictId = $this->resolveUserDistrictId($user);
        $selectedDistrictId = null;
        if ($isDistrictScope) {
            $selectedDistrictId = $viewerDistrictId;
        } elseif ($isHqScope) {
            $selectedDistrictId = ! empty($validated['district_id']) ? (int) $validated['district_id'] : null;
        }

        $appointmentsQuery = Appointment::query()
            ->where('status', 'booked')
            ->where('start_at', '<=', $endAt)
            ->where('end_at', '>=', $startAt)
            ->whereHas('complaint', function ($query) use ($selectedDistrictId, $isDistrictScope) {
                if ($selectedDistrictId) {
                    $query->where('district_id', $selectedDistrictId);
                    return;
                }

                if ($isDistrictScope) {
                    // Pegawai daerah tanpa district yang valid tidak boleh lihat rekod daerah lain.
                    $query->whereRaw('1 = 0');
                }
            })
            ->with(['complaint:id,reference_no,case_type,complainant_name,identification_number,contact_number,complaint_date,complaint_time,address,district_id,district_name,summary,current_stage'])
            ->orderBy('start_at')
            ->get(['id', 'complaint_id', 'title', 'start_at', 'end_at', 'status']);

        $viewerDistrict = null;
        if ($viewerDistrictId) {
            $viewerDistrict = District::query()->where('id', $viewerDistrictId)->first(['id', 'name']);
        }

        $availableDistricts = [];
        if ($isHqScope) {
            $availableDistricts = District::query()
                ->where('is_active', true)
                ->orderBy('name')
                ->get(['id', 'name']);
        }

        return response()->json([
            'message' => 'Appointment list',
            'scope' => $isDistrictScope ? 'daerah' : 'hq',
            'viewer' => [
                'district_id' => $viewerDistrict?->id,
                'district_name' => $viewerDistrict?->name,
            ],
            'filters' => [
                'district_id' => $selectedDistrictId,
                'available_districts' => $availableDistricts,
            ],
            'data' => $appointmentsQuery,
        ]);
    }

    public function check(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'start_at' => 'required|date',
            'duration_minutes' => 'nullable|integer|min:15|max:480',
            'complaint_id' => 'nullable|exists:complaints,id',
        ]);

        $startAt = Carbon::parse($validated['start_at']);
        $duration = $validated['duration_minutes'] ?? 60;
        $endAt = (clone $startAt)->addMinutes($duration);

        $conflictQuery = Appointment::query()
            ->where('status', 'booked')
            ->where('start_at', '<', $endAt)
            ->where('end_at', '>', $startAt);

        if (! empty($validated['complaint_id'])) {
            $existingId = Appointment::query()
                ->where('complaint_id', $validated['complaint_id'])
                ->value('id');
            if ($existingId) {
                $conflictQuery->where('id', '!=', $existingId);
            }
        }

        $hasConflict = $conflictQuery->exists();

        return response()->json([
            'message' => $hasConflict ? 'Slot tidak tersedia.' : 'Slot tersedia.',
            'available' => ! $hasConflict,
        ]);
    }

    private function resolveUserDistrictId($user): ?int
    {
        if (! $user) {
            return null;
        }

        if (! empty($user->district_id)) {
            return (int) $user->district_id;
        }

        $user->loadMissing('staff:id,user_id,district_id');
        if ($user->staff && ! empty($user->staff->district_id)) {
            return (int) $user->staff->district_id;
        }

        return null;
    }

    private function isDistrictScopedUser($user): bool
    {
        if (! $user) {
            return false;
        }

        if ($user->hasAnyRole(['admin', 'system', 'pegawai_hq'])) {
            return false;
        }

        if ($user->hasRole('pegawai_daerah')) {
            return true;
        }

        $userOfficeType = strtolower(trim((string) ($user->office_type ?? '')));
        if ($userOfficeType === 'daerah') {
            return true;
        }

        $user->loadMissing('staff:id,user_id,office_type');
        $staffOfficeType = strtolower(trim((string) ($user->staff->office_type ?? '')));

        return $staffOfficeType === 'daerah';
    }
}
