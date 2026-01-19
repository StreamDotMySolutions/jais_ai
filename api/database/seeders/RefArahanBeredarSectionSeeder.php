<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class RefArahanBeredarSectionSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            [
                'code' => 'EJSS-31',
                'name' => 'Seksyen 31 EJSS - Perbuatan tidak sopan di tempat awam',
                'sort_order' => 1,
            ],
            [
                'code' => 'LAIN',
                'name' => 'Lain-lain Kesalahan',
                'sort_order' => 2,
            ],
        ];

        foreach ($items as $item) {
            DB::table('ref_arahan_beredar_sections')->updateOrInsert(
                ['code' => $item['code']],
                [
                    'name' => $item['name'],
                    'sort_order' => $item['sort_order'],
                    'is_active' => true,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
