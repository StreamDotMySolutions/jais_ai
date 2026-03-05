<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $menusTable = config('permission.table_names.menus', 'sys_menus');
        $rolesTable = config('permission.table_names.roles', 'roles');
        $pivotTable = 'sys_menu_role';

        if (! Schema::hasTable($menusTable) || ! Schema::hasTable($rolesTable) || ! Schema::hasTable($pivotTable)) {
            return;
        }

        $menuId = DB::table($menusTable)
            ->where('path', '/app/audit-trail')
            ->value('id');

        if (! $menuId) {
            $sortOrder = (int) DB::table($menusTable)->max('sort_order') + 1;
            $menuId = DB::table($menusTable)->insertGetId([
                'label' => 'Audit Trail',
                'path' => '/app/audit-trail',
                'icon' => 'bi-clock-history',
                'sort_order' => $sortOrder > 0 ? $sortOrder : 1,
                'is_active' => true,
                'parent_id' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $roleIds = DB::table($rolesTable)
            ->whereIn('name', ['admin', 'system', 'pegawai', 'pegawai_hq', 'pegawai_daerah'])
            ->pluck('id');

        foreach ($roleIds as $roleId) {
            $exists = DB::table($pivotTable)
                ->where('menu_id', $menuId)
                ->where('role_id', $roleId)
                ->exists();

            if (! $exists) {
                DB::table($pivotTable)->insert([
                    'menu_id' => $menuId,
                    'role_id' => $roleId,
                ]);
            }
        }
    }

    public function down(): void
    {
        $menusTable = config('permission.table_names.menus', 'sys_menus');
        $pivotTable = 'sys_menu_role';

        if (! Schema::hasTable($menusTable) || ! Schema::hasTable($pivotTable)) {
            return;
        }

        $menuId = DB::table($menusTable)
            ->where('path', '/app/audit-trail')
            ->value('id');

        if ($menuId) {
            DB::table($pivotTable)->where('menu_id', $menuId)->delete();
            DB::table($menusTable)->where('id', $menuId)->delete();
        }
    }
};

