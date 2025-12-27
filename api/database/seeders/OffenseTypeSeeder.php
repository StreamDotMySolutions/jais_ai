<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OffenseTypeSeeder extends Seeder
{
    public function run(): void
    {
        $types = [
            ['code' => 'BT', 'name' => 'Kesalahan Boleh Tangkap'],
            ['code' => 'TBT', 'name' => 'Kesalahan Tak Boleh Tangkap'],
        ];

        foreach ($types as $type) {
            DB::table('ref_offense_types')->updateOrInsert(
                ['code' => $type['code']],
                [
                    'name' => $type['name'],
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
