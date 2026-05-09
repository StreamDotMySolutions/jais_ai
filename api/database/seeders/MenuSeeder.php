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
            ['label' => 'Aduan', 'path' => '/app/aduan', 'icon' => 'bi-clipboard-check', 'sort_order' => 2],
            ['label' => 'Senarai Aduan', 'path' => '/app/complaints', 'icon' => 'bi-clipboard-check', 'sort_order' => 1],
            ['label' => 'Aduan Jenayah', 'path' => '/app/complaints/aj', 'icon' => 'bi-exclamation-triangle', 'sort_order' => 2],
            ['label' => 'Aduan Keluarga', 'path' => '/app/complaints/ak', 'icon' => 'bi-people', 'sort_order' => 3],
            ['label' => 'Aduan Untuk Disahkan', 'path' => '/app/complaints/pending-approval', 'icon' => 'bi-check2-square', 'sort_order' => 4],
            ['label' => 'Aduan Untuk Diambil', 'path' => '/app/complaints/pickup-queue', 'icon' => 'bi-inbox', 'sort_order' => 5],
            ['label' => 'Aduan Saya (PIC)', 'path' => '/app/complaints/my-pic', 'icon' => 'bi-person-check', 'sort_order' => 6],
            ['label' => 'Laporan Aduan', 'path' => '/app/complaints/report', 'icon' => 'bi-clipboard-data', 'sort_order' => 8],
            ['label' => 'Jana Tindakan Aduan', 'path' => '/app/jana-tindakan-aduan', 'icon' => 'bi-list-task', 'sort_order' => 3],
            ['label' => 'Temujanji', 'path' => '/app/appointments-root', 'icon' => 'bi-calendar2-week', 'sort_order' => 4],
            ['label' => 'Kalendar', 'path' => '/app/appointments', 'icon' => 'bi-calendar2-week', 'sort_order' => 1],
            ['label' => 'Laporan Temujanji', 'path' => '/app/appointments/report', 'icon' => 'bi-clipboard-data', 'sort_order' => 2],
            ['label' => 'Arahan Beredar', 'path' => '/app/arahan-beredar-root', 'icon' => 'bi-journal-text', 'sort_order' => 5],
            ['label' => 'Senarai Arahan Beredar', 'path' => '/app/arahan-beredar', 'icon' => 'bi-journal-text', 'sort_order' => 1],
            ['label' => 'Laporan Arahan Beredar', 'path' => '/app/arahan-beredar/report', 'icon' => 'bi-clipboard-data', 'sort_order' => 2],
            ['label' => 'i-WARAN', 'path' => '/app/i-waran-root', 'icon' => 'bi-file-earmark-text', 'sort_order' => 6],
            ['label' => 'Senarai Waran', 'path' => '/app/i-waran', 'icon' => 'bi-file-earmark-text', 'sort_order' => 1],
            ['label' => 'Semakan Nama OKT Waran', 'path' => '/app/i-waran/semakan-okt', 'icon' => 'bi-search', 'sort_order' => 2],
            ['label' => 'Laporan i-WARAN', 'path' => '/app/i-waran/report', 'icon' => 'bi-clipboard-data', 'sort_order' => 3],
            ['label' => 'Kakitangan', 'path' => '/app/staff', 'icon' => 'bi-people', 'sort_order' => 7],
            ['label' => 'Pengguna', 'path' => '/app/users', 'icon' => 'bi-person-lines-fill', 'sort_order' => 8],
            ['label' => 'System Setting', 'path' => '/app/system-settings', 'icon' => 'bi-gear', 'sort_order' => 99],
            ['label' => 'Roles', 'path' => '/app/roles', 'icon' => 'bi-shield-check', 'sort_order' => 1],
            ['label' => 'Menu', 'path' => '/app/menus', 'icon' => 'bi-list-nested', 'sort_order' => 2],
            ['label' => 'Api Token', 'path' => '/app/api-token', 'icon' => 'bi-key', 'sort_order' => 3],
            ['label' => 'Api Logs', 'path' => '/app/api-logs', 'icon' => 'bi-activity', 'sort_order' => 4],
            ['label' => 'Scan QR', 'path' => '/app/scan-qr', 'icon' => 'bi-qr-code-scan', 'sort_order' => 5],
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

            if (in_array($menu['path'], [
                '/app/complaints',
                '/app/complaints/aj',
                '/app/complaints/ak',
                '/app/complaints/pending-approval',
                '/app/complaints/pickup-queue',
                '/app/complaints/my-pic',
                '/app/complaints/report',
            ], true)) {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/aduan')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if (in_array($menu['path'], [
                '/app/roles',
                '/app/menus',
                '/app/api-token',
                '/app/api-logs',
                '/app/scan-qr',
            ], true)) {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/system-settings')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/appointments') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/appointments-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/appointments/report') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/appointments-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/arahan-beredar') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/arahan-beredar-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/arahan-beredar/report') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/arahan-beredar-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/i-waran') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/i-waran-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/i-waran/report') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/i-waran-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }
            if ($menu['path'] === '/app/i-waran/semakan-okt') {
                $parentMenu = DB::table('sys_menus')->where('path', '/app/i-waran-root')->first();
                if ($parentMenu) {
                    DB::table('sys_menus')->where('id', $menuRecord->id)->update([
                        'parent_id' => $parentMenu->id,
                        'updated_at' => now(),
                    ]);
                }
            }

            $allowedRoles = ['system', 'admin', 'pegawai', 'user', 'awam'];
            if ($menu['path'] === '/app/complaints') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah', 'user', 'awam'];
            }
            if (in_array($menu['path'], ['/app/staff', '/app/roles', '/app/menus'], true)) {
                $allowedRoles = ['system', 'admin'];
            }
            if (in_array($menu['path'], ['/app/api-token', '/app/api-logs'], true)) {
                $allowedRoles = ['system', 'admin', 'user'];
            }
            if ($menu['path'] === '/app/aduan') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/complaints/report') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/jana-tindakan-aduan') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if (in_array($menu['path'], ['/app/appointments-root', '/app/appointments'], true)) {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/appointments/report') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if (in_array($menu['path'], ['/app/arahan-beredar-root', '/app/arahan-beredar'], true)) {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/arahan-beredar/report') {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/complaints/pending-approval') {
                $allowedRoles = ['system', 'admin', 'pegawai_hq'];
            }
            if (in_array($menu['path'], ['/app/complaints/aj', '/app/complaints/ak'], true)) {
                $allowedRoles = ['system', 'admin', 'pegawai_hq'];
            }
            if (in_array($menu['path'], ['/app/complaints/pickup-queue', '/app/complaints/my-pic'], true)) {
                $allowedRoles = ['system', 'admin', 'pegawai_daerah'];
            }
            if (in_array($menu['path'], ['/app/i-waran-root', '/app/i-waran', '/app/i-waran/report', '/app/i-waran/semakan-okt'], true)) {
                $allowedRoles = ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'];
            }
            if ($menu['path'] === '/app/users') {
                $allowedRoles = ['system', 'admin'];
            }
            if ($menu['path'] === '/app/system-settings') {
                $allowedRoles = ['system', 'admin'];
            }
            if ($menu['path'] === '/app/scan-qr') {
                $allowedRoles = ['system', 'admin'];
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
