<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Office;
use App\Models\Staff;
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
                    'address' => $address,
                    'is_active' => true,
                ]
            );
        }

        $targets = [
            [
                'label' => 'idham',
                'name' => 'MOHD IDHAM BIN MOHD IDRIS',
                'emails' => ['wnt5649@gmail.com'],
            ],
            [
                'label' => 'fahizar',
                'name' => 'FAHIZAR BIN PAIMAN',
                'emails' => ['fahizarp@gmail.com'],
            ],
            [
                'label' => 'syuhada',
                'name' => 'SYUHADA BINTI AHMAD SAIFUDDIN',
                'emails' => ['syuhada.saifudin@jais.gov', 'syuhada.saifudin@jais.gov.my'],
            ],
            [
                'label' => 'rohaya',
                'name' => 'SITI ROHAYA AINI BINTI ABDULLAH NAJIB',
                'emails' => ['s.rohayaaini@gmail.com'],
            ],
            [
                'label' => 'aliff',
                'name' => 'ALIFF FAZHIN BIN HAMDAN',
                'emails' => ['alifffazhin@jais.gov.my'],
            ],
            [
                'label' => 'ghazali',
                'name' => 'MOHD GHAZALI BIN MOHAMAD ISMAL',
                'emails' => ['rockazapin@gmail.com'],
            ],
            [
                'label' => 'izzati',
                'name' => 'ZAINORIZZATI BINTI MOHD JALANI',
                'emails' => ['zainorizzati@gmail.com'],
            ],
            [
                'label' => 'zailila',
                'name' => 'ZAILILA BINTI MOHD YUSOF',
                'emails' => ['zaimad2813@gmail.com'],
            ],
        ];

        foreach ($targets as $target) {
            $emails = array_values(array_filter(array_map(
                static fn ($email) => strtolower(trim((string) $email)),
                $target['emails'] ?? []
            )));

            $updated = Staff::query()
                ->where(function ($query) use ($target, $emails) {
                    $query->whereRaw('LOWER(name) = ?', [strtolower(trim((string) $target['name']))]);

                    if (! empty($emails)) {
                        $query->orWhereHas('user', function ($userQuery) use ($emails) {
                            $userQuery->where(function ($emailQuery) use ($emails) {
                                foreach ($emails as $email) {
                                    $emailQuery->orWhereRaw('LOWER(email) = ?', [$email]);
                                }
                            });
                        });
                    }
                })
                ->update([
                    'office_id' => $hqOffice->id,
                    'office_type' => 'hq',
                    'district_id' => $petalingDistrictId,
                    'no_tel_pejabat' => $officePhone,
                    'office_address' => $hqOfficeAddress,
                ]);

            if ($this->command) {
                $this->command->line(sprintf(
                    '[%s] %s -> %d rekod dikemaskini.',
                    $target['label'],
                    $target['name'],
                    $updated
                ));
            }
        }
    }
}
