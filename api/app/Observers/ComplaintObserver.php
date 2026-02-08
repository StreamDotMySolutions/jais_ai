<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\Complaint;
use Illuminate\Support\Facades\Auth;

class ComplaintObserver
{
    /**
     * Fields that shouldn't be considered "meaningful" changes for audit.
     */
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
    ];

    private function writeLog(Complaint $complaint, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => Complaint::class,
            'auditable_id' => $complaint->id,
            'module' => 'aduan',
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

    public function created(Complaint $complaint): void
    {
        $this->writeLog($complaint, 'created', null, $complaint->getAttributes(), array_keys($complaint->getAttributes()));
    }

    public function updated(Complaint $complaint): void
    {
        $dirty = $complaint->getDirty(); // attributes that were changed in this save
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
            $oldValues[$key] = $complaint->getOriginal($key);
            $newValues[$key] = $complaint->getAttribute($key);
        }

        $this->writeLog($complaint, 'updated', $oldValues, $newValues, $changedKeys);
    }

    public function deleted(Complaint $complaint): void
    {
        $this->writeLog($complaint, 'deleted', $complaint->getOriginal(), null, array_keys($complaint->getOriginal()));
    }
}

