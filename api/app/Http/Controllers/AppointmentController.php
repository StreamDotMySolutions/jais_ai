<?php

namespace App\Http\Controllers;

use App\Models\Appointment;
use Carbon\Carbon;
use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'start_at' => 'required|date',
            'end_at' => 'required|date|after_or_equal:start_at',
        ]);

        $startAt = Carbon::parse($validated['start_at'])->startOfDay();
        $endAt = Carbon::parse($validated['end_at'])->endOfDay();

        $appointments = Appointment::query()
            ->where('status', 'booked')
            ->where('start_at', '<=', $endAt)
            ->where('end_at', '>=', $startAt)
            ->with(['complaint:id,reference_no,case_type,complainant_name,identification_number,contact_number,complaint_date,complaint_time,address,district_name,summary,current_stage'])
            ->orderBy('start_at')
            ->get(['id', 'complaint_id', 'title', 'start_at', 'end_at', 'status']);

        return response()->json([
            'message' => 'Appointment list',
            'data' => $appointments,
        ]);
    }

    public function check(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'admin', 'system'])) {
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
}
