<?php

namespace App\Observers;

use App\Models\ArahanBeredar;
use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;

class ArahanBeredarObserver
{
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    public function creating(ArahanBeredar $record): void
    {
        $authUserId = Auth::id();
        if (! $authUserId || $record->created_by_user_id) {
            return;
        }

        $record->created_by_user_id = $authUserId;
    }

    public function updating(ArahanBeredar $record): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        if (! $record->isDirty()) {
            return;
        }

        $meaningfulDirtyKeys = array_diff(array_keys($record->getDirty()), ['updated_by_user_id']);
        if (! $meaningfulDirtyKeys) {
            return;
        }

        $record->updated_by_user_id = $authUserId;
    }

    public function deleting(ArahanBeredar $record): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        $record->deleted_by_user_id = $authUserId;
        $record->saveQuietly();

        if (! $record->isForceDeleting()) {
            $record->loadMissing('oyds.media');
            foreach ($record->oyds as $oyd) {
                foreach ($oyd->media as $media) {
                    if (! $media->trashed()) {
                        $media->delete();
                    }
                }

                if (! $oyd->trashed()) {
                    $oyd->delete();
                }
            }
        }
    }

    private function writeLog(ArahanBeredar $record, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => ArahanBeredar::class,
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

    public function created(ArahanBeredar $record): void
    {
        $attrs = $record->getAttributes();
        $this->writeLog($record, 'created', null, $attrs, array_keys($attrs));
    }

    public function updated(ArahanBeredar $record): void
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

    public function deleted(ArahanBeredar $record): void
    {
        $original = $record->getOriginal();
        $this->writeLog($record, 'deleted', $original, null, array_keys($original));
    }

    public function restored(ArahanBeredar $record): void
    {
        $this->writeLog($record, 'restored', null, $record->getAttributes(), ['deleted_at']);
    }
}
