<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class KhalwatDetailSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            'Aduan biasa',
            'Bersekedudukan',
            'Rumah Urut',
            'Hotel',
            'Pasangan bercerai',
            'Pernikahan tanpa kebenaran',
        ];

        foreach ($items as $index => $name) {
            DB::table('ref_khalwat_details')->updateOrInsert(
                ['name' => $name],
                [
                    'sort_order' => $index + 1,
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
