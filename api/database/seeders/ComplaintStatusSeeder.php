<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplaintStatusSeeder extends Seeder
{
    public function run(): void
    {
        $statuses = [
            ['code' => 'baru', 'name' => 'Baharu', 'is_final' => 0, 'sort_order' => 1],
            ['code' => 'dalam_tindakan', 'name' => 'Dalam Tindakan', 'is_final' => 0, 'sort_order' => 2],
            ['code' => 'kiv', 'name' => 'KIV', 'is_final' => 0, 'sort_order' => 3],
            ['code' => 'selesai', 'name' => 'Selesai', 'is_final' => 1, 'sort_order' => 4],
        ];

        foreach ($statuses as $status) {
            DB::table('complaint_statuses')->updateOrInsert(
                ['code' => $status['code']],
                [
                    'name' => $status['name'],
                    'is_final' => $status['is_final'],
                    'sort_order' => $status['sort_order'],
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
