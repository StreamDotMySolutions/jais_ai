export const MAINTENANCE_OVERRIDE_ROLES = ['admin', 'system'];

export const isMaintenanceOverrideRole = (role) => (
    MAINTENANCE_OVERRIDE_ROLES.includes(String(role || '').trim().toLowerCase())
);
