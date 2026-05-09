<?php

namespace Database\Seeders;

use App\Models\Menu;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Role;

class JanaTindakanAduanMenuSeeder extends Seeder
{
    public function run(): void
    {
        $menu = Menu::query()->updateOrCreate(
            ['path' => '/app/jana-tindakan-aduan'],
            [
                'label' => 'Jana Tindakan Aduan',
                'icon' => 'bi-list-task',
                'sort_order' => 3,
                'parent_id' => null,
                'is_active' => 1,
            ]
        );

        $roleIds = Role::query()
            ->whereIn('name', ['system', 'admin', 'pegawai', 'pegawai_hq', 'pegawai_daerah'])
            ->pluck('id')
            ->all();

        if (!empty($roleIds)) {
            $menu->roles()->sync($roleIds);
        }

        DB::table('sys_menus')
            ->where('path', '/app/cases')
            ->update([
                'sort_order' => 4,
                'updated_at' => now(),
            ]);
    }
}
