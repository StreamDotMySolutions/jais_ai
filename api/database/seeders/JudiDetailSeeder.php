<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class JudiDetailSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            'Komputer / Mesin',
            'Tiket',
            'Bekerja',
        ];

        foreach ($items as $index => $name) {
            DB::table('ref_judi_details')->updateOrInsert(
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
