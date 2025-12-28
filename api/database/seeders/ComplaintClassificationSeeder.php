<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplaintClassificationSeeder extends Seeder
{
    public function run(): void
    {
        $classifications = [
            [
                'code' => 'AJ',
                'name' => 'Aduan Jenayah',
                'description' => 'Kategori aduan berkaitan jenayah.',
            ],
            [
                'code' => 'AK',
                'name' => 'Aduan Keluarga',
                'description' => 'Kategori aduan berkaitan keluarga.',
            ],
        ];

        foreach ($classifications as $classification) {
            DB::table('complaint_classifications')->updateOrInsert(
                ['code' => $classification['code']],
                [
                    'name' => $classification['name'],
                    'description' => $classification['description'],
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
