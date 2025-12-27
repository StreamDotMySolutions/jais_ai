<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\District;

class DistrictSeeder extends Seeder
{
    public function run(): void
    {
        $districts = [
            'Petaling',
            'Gombak',
            'Hulu Langat',
            'Klang',
            'Kuala Langat',
            'Sepang',
            'Kuala Selangor',
            'Hulu Selangor',
            'Sabak Bernam',
        ];

        foreach ($districts as $name) {
            District::firstOrCreate(
                ['name' => $name],
                ['is_active' => true]
            );
        }
    }
}
