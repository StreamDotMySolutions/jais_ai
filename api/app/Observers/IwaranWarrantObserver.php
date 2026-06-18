<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\IwaranWarrant;
use Illuminate\Support\Facades\Auth;

class IwaranWarrantObserver
{
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    public function creating(IwaranWarrant $record): void
    {
        $authUserId = Auth::id();
        if (! $authUserId || $record->created_by_user_id) {
            return;
        }

        $record->created_by_user_id = $authUserId;
    }

    public function updating(IwaranWarrant $record): void
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

    public function deleting(IwaranWarrant $record): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        $record->deleted_by_user_id = $authUserId;
        $record->saveQuietly();

        if (! $record->isForceDeleting()) {
            $record->loadMissing(['attachments', 'courtDocuments']);

            foreach ($record->attachments as $attachment) {
                if (! $attachment->trashed()) {
                    $attachment->delete();
                }
            }

            foreach ($record->courtDocuments as $document) {
                if (! $document->trashed()) {
                    $document->delete();
                }
            }
        }
    }

    private function writeLog(IwaranWarrant $record, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => IwaranWarrant::class,
            'auditable_id' => $record->id,
            'module' => 'i-waran',
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

    public function created(IwaranWarrant $record): void
    {
        $attrs = $record->getAttributes();
        $this->writeLog($record, 'created', null, $attrs, array_keys($attrs));
    }

    public function updated(IwaranWarrant $record): void
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

    public function deleted(IwaranWarrant $record): void
    {
        $original = $record->getOriginal();
        $this->writeLog($record, 'deleted', $original, null, array_keys($original));
    }

    public function restored(IwaranWarrant $record): void
    {
        $this->writeLog($record, 'restored', null, $record->getAttributes(), ['deleted_at']);
    }
}
