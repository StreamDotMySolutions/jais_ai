<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\District;

class DistrictSeeder extends Seeder
{
    public function run(): void
    {
        $districts = [
            ['code' => 'PET', 'name' => 'Petaling'],
            ['code' => 'GOM', 'name' => 'Gombak'],
            ['code' => 'HLA', 'name' => 'Hulu Langat'],
            ['code' => 'KLG', 'name' => 'Klang'],
            ['code' => 'KUL', 'name' => 'Kuala Langat'],
            ['code' => 'SEP', 'name' => 'Sepang'],
            ['code' => 'KSE', 'name' => 'Kuala Selangor'],
            ['code' => 'HLS', 'name' => 'Hulu Selangor'],
            ['code' => 'SBN', 'name' => 'Sabak Bernam'],
        ];

        foreach ($districts as $district) {
            District::firstOrCreate(
                ['code' => $district['code']],
                [
                    'name' => $district['name'],
                    'is_active' => true,
                ]
            );
        }
    }
}
