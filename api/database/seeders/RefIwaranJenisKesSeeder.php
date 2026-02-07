<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RefIwaranJenisKesSeeder extends Seeder
{
    public function run(): void
    {
        $rows = [
            ['kategori' => 'mal', 'nama' => 'Lain-lain Kes Mal'],
            ['kategori' => 'mal', 'nama' => 'Kes Mal Umum'],
            ['kategori' => 'jenayah', 'nama' => 'Lain-lain Kes Jenayah'],
            ['kategori' => 'jenayah', 'nama' => 'Kes Jenayah Umum'],
        ];

        foreach ($rows as $row) {
            DB::table('ref_iwaran_jenis_kes')->updateOrInsert(
                ['kategori' => $row['kategori'], 'nama' => $row['nama']],
                ['is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}
