<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Office;
use Illuminate\Database\Seeder;

class UpdateHotlineOfficeContactSeeder extends Seeder
{
    public function run(): void
    {
        $officePhone = '1800882424';
        $hqOfficeAddress = 'HOTLINE 24 JAM BAHAGIAN PENGURUSAN PENGUATKUASA JAIS';
        $petalingDistrictId = District::query()
            ->where('code', 'PET')
            ->orWhere('name', 'Petaling')
            ->value('id');

        $districtOfficeAddresses = [
            'APG' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID AMPANG',
            'GOM' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID GOMBAK',
            'HLA' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID HULU LANGAT',
            'HLS' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID HULU SELANGOR',
            'KLG' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID KLANG',
            'KSE' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID KUALA SELANGOR',
            'KUL' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID KUALA LANGAT',
            'PET' => 'TINGKAT 4, MENARA UTARA, BSIS BAHAGIAN PENGURUSAN PENGUATKUASAAN JAIS',
            'SBN' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID SABAK BERNAM',
            'SEP' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID SEPANG',
            'SHA' => 'UNIT PENGURUSAN PENGUATKUASAAN PAID SHAH ALAM',
        ];
        $districtOfficeEmails = [
            'GOM' => 'bpn.gombak@gmail.com',
            'HLA' => 'bpn.hululangat@gmail.com',
            'HLS' => 'bpn.huluselangor@gmail.com',
            'KLG' => 'bpn.klang@gmail.com',
            'KSE' => 'bpn.kualaselangor@gmail.com',
            'KUL' => 'bpn.kualalangat22@gmail.com',
            'SBN' => 'bpn.sabakbernam@gmail.com',
            'SEP' => 'jais.sepang@gmail.com',
        ];

        $hqOffice = Office::query()->updateOrCreate(
            ['code' => 'HQ'],
            [
                'name' => 'Ibu Pejabat JAIS',
                'office_type' => 'hq',
                'district_id' => $petalingDistrictId,
                'phone' => $officePhone,
                'address' => $hqOfficeAddress,
                'is_active' => true,
            ]
        );

        foreach ($districtOfficeAddresses as $code => $address) {
            $district = District::query()
                ->where('code', $code)
                ->first();

            if (! $district) {
                continue;
            }

            Office::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => 'PAID ' . $district->name,
                    'office_type' => 'daerah',
                    'district_id' => $district->id,
                    'phone' => $officePhone,
                    'email' => $districtOfficeEmails[$code] ?? null,
                    'address' => $address,
                    'is_active' => true,
                ]
            );
        }

    }
}
