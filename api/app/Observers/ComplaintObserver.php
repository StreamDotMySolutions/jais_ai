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
        'deleted_at',
    ];

    public function creating(Complaint $complaint): void
    {
        $authUserId = Auth::id();
        if ($complaint->created_by_user_id) {
            return;
        }

        $complaint->created_by_user_id = $authUserId ?: ($complaint->submitted_by_user_id ?: null);
        $complaint->created_ip_address = request()->ip();
    }

    public function updating(Complaint $complaint): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        if (! $complaint->isDirty()) {
            return;
        }

        $meaningfulDirtyKeys = array_diff(array_keys($complaint->getDirty()), ['updated_by_user_id']);
        if (! $meaningfulDirtyKeys) {
            return;
        }

        $complaint->updated_by_user_id = $authUserId;
        $complaint->updated_ip_address = request()->ip();
    }

    public function deleting(Complaint $complaint): void
    {
        if ($complaint->isForceDeleting()) {
            return;
        }

        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        $complaint->deleted_by_user_id = $authUserId;
        $complaint->saveQuietly();

        $complaint->loadMissing([
            'appointment',
            'attachments',
            'oyds.media',
            'seizureItems.media',
            'policeReports.media',
        ]);

        if ($complaint->appointment && ! $complaint->appointment->trashed()) {
            $complaint->appointment->delete();
        }

        foreach ($complaint->attachments as $attachment) {
            if (! $attachment->trashed()) {
                $attachment->delete();
            }
        }

        foreach ($complaint->oyds as $oyd) {
            foreach ($oyd->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $oyd->trashed()) {
                $oyd->delete();
            }
        }

        foreach ($complaint->seizureItems as $item) {
            foreach ($item->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $item->trashed()) {
                $item->delete();
            }
        }

        foreach ($complaint->policeReports as $report) {
            foreach ($report->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $report->trashed()) {
                $report->delete();
            }
        }
    }

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

    public function restored(Complaint $complaint): void
    {
        $this->writeLog($complaint, 'restored', null, $complaint->getAttributes(), ['deleted_at']);
    }
}
