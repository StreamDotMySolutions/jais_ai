<?php

namespace App\Observers;

use App\Models\AuditLog;
use App\Models\CaseRecord;
use Illuminate\Support\Facades\Auth;

class CaseRecordObserver
{
    /**
     * Fields that shouldn't be considered "meaningful" changes for audit.
     */
    private array $ignoredKeys = [
        'updated_at',
        'created_at',
        'deleted_at',
    ];

    public function creating(CaseRecord $caseRecord): void
    {
        $authUserId = Auth::id();
        if (! $authUserId || $caseRecord->created_by_user_id) {
            return;
        }

        $caseRecord->created_by_user_id = $authUserId;
    }

    public function updating(CaseRecord $caseRecord): void
    {
        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        if (! $caseRecord->isDirty()) {
            return;
        }

        $meaningfulDirtyKeys = array_diff(array_keys($caseRecord->getDirty()), ['updated_by_user_id']);
        if (! $meaningfulDirtyKeys) {
            return;
        }

        $caseRecord->updated_by_user_id = $authUserId;
    }

    public function deleting(CaseRecord $caseRecord): void
    {
        if ($caseRecord->isForceDeleting()) {
            return;
        }

        $authUserId = Auth::id();
        if (! $authUserId) {
            return;
        }

        $caseRecord->deleted_by_user_id = $authUserId;
        $caseRecord->saveQuietly();

        $caseRecord->loadMissing([
            'oyds.media',
            'inspectionForms.media',
            'seizureItems.media',
            'policeReports.media',
        ]);

        foreach ($caseRecord->oyds as $oyd) {
            foreach ($oyd->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $oyd->trashed()) {
                $oyd->delete();
            }
        }

        foreach ($caseRecord->inspectionForms as $form) {
            foreach ($form->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $form->trashed()) {
                $form->delete();
            }
        }

        foreach ($caseRecord->seizureItems as $item) {
            foreach ($item->media as $media) {
                if (! $media->trashed()) {
                    $media->delete();
                }
            }

            if (! $item->trashed()) {
                $item->delete();
            }
        }

        foreach ($caseRecord->policeReports as $report) {
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

    private function writeLog(CaseRecord $caseRecord, string $event, array $oldValues = null, array $newValues = null, array $changedKeys = null): void
    {
        $request = request();

        AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => CaseRecord::class,
            'auditable_id' => $caseRecord->id,
            'module' => 'kes',
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

    public function created(CaseRecord $caseRecord): void
    {
        $this->writeLog($caseRecord, 'created', null, $caseRecord->getAttributes(), array_keys($caseRecord->getAttributes()));
    }

    public function updated(CaseRecord $caseRecord): void
    {
        $dirty = $caseRecord->getDirty();
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
            $oldValues[$key] = $caseRecord->getOriginal($key);
            $newValues[$key] = $caseRecord->getAttribute($key);
        }

        $this->writeLog($caseRecord, 'updated', $oldValues, $newValues, $changedKeys);
    }

    public function deleted(CaseRecord $caseRecord): void
    {
        $this->writeLog($caseRecord, 'deleted', $caseRecord->getOriginal(), null, array_keys($caseRecord->getOriginal()));
    }

    public function restored(CaseRecord $caseRecord): void
    {
        $this->writeLog($caseRecord, 'restored', null, $caseRecord->getAttributes(), ['deleted_at']);
    }
}
