<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DistrictNormalizeSeeder extends Seeder
{
    public function run(): void
    {
        $map = [
            'Petaling' => 'PET',
            'Gombak' => 'GOM',
            'Hulu Langat' => 'HLA',
            'Klang' => 'KLG',
            'Kuala Langat' => 'KUL',
            'Sepang' => 'SEP',
            'Kuala Selangor' => 'KSE',
            'Hulu Selangor' => 'HLS',
            'Sabak Bernam' => 'SBN',
        ];

        foreach ($map as $name => $code) {
            $exists = DB::table('districts')
                ->where('name', $name)
                ->where('code', $code)
                ->exists();

            if ($exists) {
                DB::table('districts')
                    ->where('name', $name)
                    ->whereNull('code')
                    ->delete();
            } else {
                DB::table('districts')
                    ->where('name', $name)
                    ->whereNull('code')
                    ->update([
                        'code' => $code,
                        'is_active' => 1,
                    ]);
            }
        }

        $duplicateIds = DB::table('districts as d')
            ->select('d.id')
            ->whereNull('d.code')
            ->whereExists(function ($query) {
                $query->select(DB::raw(1))
                    ->from('districts as d2')
                    ->whereColumn('d2.name', 'd.name')
                    ->whereNotNull('d2.code');
            })
            ->pluck('d.id')
            ->all();

        if (!empty($duplicateIds)) {
            DB::table('districts')
                ->whereIn('id', $duplicateIds)
                ->delete();
        }
    }
}
