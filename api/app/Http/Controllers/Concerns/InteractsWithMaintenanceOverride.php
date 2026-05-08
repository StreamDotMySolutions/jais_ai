<?php

namespace App\Http\Controllers\Concerns;

trait InteractsWithMaintenanceOverride
{
    protected function maintenanceOverrideRoles(): array
    {
        return ['admin', 'system'];
    }

    protected function canBypassWorkflowLocks($user): bool
    {
        return (bool) ($user && $user->hasAnyRole($this->maintenanceOverrideRoles()));
    }
}
