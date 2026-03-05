<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\ComplaintSeizureItemMedia;
use Illuminate\Support\Facades\Auth;

class ComplaintSeizureItemMediaObserver
{
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    private function writeLog(ComplaintSeizureItemMedia $record, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => ComplaintSeizureItemMedia::class,
            'auditable_id' => $record->id,
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

    public function created(ComplaintSeizureItemMedia $record): void
    {
        $attrs = $record->getAttributes();
        $this->writeLog($record, 'created', null, $attrs, array_keys($attrs));
    }

    public function updated(ComplaintSeizureItemMedia $record): void
    {
        $dirty = $record->getDirty();
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
            $oldValues[$key] = $record->getOriginal($key);
            $newValues[$key] = $record->getAttribute($key);
        }

        $this->writeLog($record, 'updated', $oldValues, $newValues, $changedKeys);
    }

    public function deleted(ComplaintSeizureItemMedia $record): void
    {
        $original = $record->getOriginal();
        $this->writeLog($record, 'deleted', $original, null, array_keys($original));
    }

    public function restored(ComplaintSeizureItemMedia $record): void
    {
        $this->writeLog($record, 'restored', null, $record->getAttributes(), ['deleted_at']);
    }
}

