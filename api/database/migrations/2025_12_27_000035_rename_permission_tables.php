<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('roles') && ! Schema::hasTable('sys_roles')) {
            Schema::rename('roles', 'sys_roles');
        }
        if (Schema::hasTable('permissions') && ! Schema::hasTable('sys_permissions')) {
            Schema::rename('permissions', 'sys_permissions');
        }
        if (Schema::hasTable('role_has_permissions') && ! Schema::hasTable('sys_role_has_permissions')) {
            Schema::rename('role_has_permissions', 'sys_role_has_permissions');
        }
        if (Schema::hasTable('model_has_roles') && ! Schema::hasTable('sys_model_has_roles')) {
            Schema::rename('model_has_roles', 'sys_model_has_roles');
        }
        if (Schema::hasTable('model_has_permissions') && ! Schema::hasTable('sys_model_has_permissions')) {
            Schema::rename('model_has_permissions', 'sys_model_has_permissions');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sys_model_has_permissions') && ! Schema::hasTable('model_has_permissions')) {
            Schema::rename('sys_model_has_permissions', 'model_has_permissions');
        }
        if (Schema::hasTable('sys_model_has_roles') && ! Schema::hasTable('model_has_roles')) {
            Schema::rename('sys_model_has_roles', 'model_has_roles');
        }
        if (Schema::hasTable('sys_role_has_permissions') && ! Schema::hasTable('role_has_permissions')) {
            Schema::rename('sys_role_has_permissions', 'role_has_permissions');
        }
        if (Schema::hasTable('sys_permissions') && ! Schema::hasTable('permissions')) {
            Schema::rename('sys_permissions', 'permissions');
        }
        if (Schema::hasTable('sys_roles') && ! Schema::hasTable('roles')) {
            Schema::rename('sys_roles', 'roles');
        }
    }
};
