<?php

namespace Database\Seeders;

use App\Models\District;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RefMahkamahSeeder extends Seeder
{
    public function run(): void
    {
        $districts = District::query()->orderBy('name')->get(['id', 'name']);

        foreach ($districts as $district) {
            $name = "Mahkamah Rendah Syariah {$district->name}";
            DB::table('ref_mahkamah')->updateOrInsert(
                ['nama' => $name],
                [
                    'daerah_id' => $district->id,
                    'emel' => null,
                    'is_active' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
