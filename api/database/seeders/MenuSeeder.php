<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class MenuSeeder extends Seeder
{
    public function run(): void
    {
        $menus = [
            ['label' => 'Dashboard', 'path' => '/app/dashboard', 'icon' => 'bi-grid', 'sort_order' => 1],
            ['label' => 'Senarai Aduan', 'path' => '/app/complaints', 'icon' => 'bi-clipboard-check', 'sort_order' => 2],
            ['label' => 'Staff', 'path' => '/app/staff', 'icon' => 'bi-people', 'sort_order' => 3],
            ['label' => 'Roles', 'path' => '/app/roles', 'icon' => 'bi-shield-check', 'sort_order' => 4],
            ['label' => 'Menu', 'path' => '/app/menus', 'icon' => 'bi-list-nested', 'sort_order' => 5],
            ['label' => 'Api Token', 'path' => '/app/api-token', 'icon' => 'bi-key', 'sort_order' => 6],
            ['label' => 'Api Logs', 'path' => '/app/api-logs', 'icon' => 'bi-activity', 'sort_order' => 7],
        ];

        $roleMap = Role::query()->pluck('id', 'name');

        foreach ($menus as $menu) {
            $menuId = DB::table('sys_menus')->updateOrInsert(
                ['path' => $menu['path']],
                [
                    'label' => $menu['label'],
                    'icon' => $menu['icon'],
                    'sort_order' => $menu['sort_order'],
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );

            $menuRecord = DB::table('sys_menus')->where('path', $menu['path'])->first();
            if (! $menuRecord) {
                continue;
            }

            $allowedRoles = ['system', 'admin', 'pegawai', 'user', 'awam'];
            if (in_array($menu['path'], ['/app/staff', '/app/roles', '/app/menus'], true)) {
                $allowedRoles = ['system', 'admin'];
            }
            if (in_array($menu['path'], ['/app/api-token', '/app/api-logs'], true)) {
                $allowedRoles = ['system', 'admin', 'user'];
            }

            foreach ($allowedRoles as $roleName) {
                $roleId = $roleMap[$roleName] ?? null;
                if (! $roleId) {
                    continue;
                }
                DB::table('sys_menu_role')->updateOrInsert(
                    ['menu_id' => $menuRecord->id, 'role_id' => $roleId],
                    ['created_at' => now(), 'updated_at' => now()]
                );
            }
        }
    }
}
