<?php

namespace App\Observers;

use App\Models\Appointment;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class AppointmentObserver
{
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    public function creating(Appointment $appointment): void
    {
        $authUserId = Auth::id();
        if (! $authUserId || $appointment->created_by_user_id) {
            return;
        }

        $appointment->created_by_user_id = $authUserId;
    }

    public function updating(Appointment $appointment): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        if (! $appointment->isDirty()) {
            return;
        }

        $meaningfulDirtyKeys = array_diff(array_keys($appointment->getDirty()), ['updated_by_user_id']);
        if (! $meaningfulDirtyKeys) {
            return;
        }

        $appointment->updated_by_user_id = $authUserId;
    }

    public function deleting(Appointment $appointment): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        $appointment->deleted_by_user_id = $authUserId;
        $appointment->saveQuietly();
    }

    private function writeLog(Appointment $appointment, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Appointment::class,
            'auditable_id' => $appointment->id,
            'module' => 'temujanji',
            'event' => $event,
            'url' => $request?->fullUrl(),
            'method' => $request?->method(),
            'ip' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'changed_keys' => $changedKeys,
            'old_values' => $oldValues,
            'new_values' => $newValues,
        ]);
    }

    public function created(Appointment $appointment): void
    {
        $attrs = $appointment->getAttributes();
        $this->writeLog($appointment, 'created', null, $attrs, array_keys($attrs));
    }

    public function updated(Appointment $appointment): void
    {
        $dirty = $appointment->getDirty();
        if (! $dirty) {
            return;
        }

        $changedKeys = array_values(array_diff(array_keys($dirty), $this->ignoredKeys));
        if (! $changedKeys) {
            return;
        }

        $oldValues = [];
        $newValues = [];
        foreach ($changedKeys as $key) {
            $oldValues[$key] = $appointment->getOriginal($key);
            $newValues[$key] = $appointment->getAttribute($key);
        }

        $this->writeLog($appointment, 'updated', $oldValues, $newValues, $changedKeys);
    }

    public function deleted(Appointment $appointment): void
    {
        $original = $appointment->getOriginal();
        $this->writeLog($appointment, 'deleted', $original, null, array_keys($original));
    }
}
