<?php

namespace App\Observers;

use App\Models\ArahanBeredarOyd;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class ArahanBeredarOydObserver
{
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
    ];

    private function writeLog(ArahanBeredarOyd $record, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => ArahanBeredarOyd::class,
            'auditable_id' => $record->id,
            'module' => 'arahan-beredar',
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

    public function created(ArahanBeredarOyd $record): void
    {
        $attrs = $record->getAttributes();
        $this->writeLog($record, 'created', null, $attrs, array_keys($attrs));
    }

    public function updated(ArahanBeredarOyd $record): void
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

    public function deleted(ArahanBeredarOyd $record): void
    {
        $original = $record->getOriginal();
        $this->writeLog($record, 'deleted', $original, null, array_keys($original));
    }
}

