<?php

namespace Database\Seeders;

use App\Models\Staff;
use Illuminate\Database\Seeder;

class UpdateHotlineOfficeContactSeeder extends Seeder
{
    public function run(): void
    {
        $officePhone = '1800882424';
        $officeAddress = 'HOTLINE 24 JAM BAHAGIAN PENGURUSAN PENGUATKUASA JAIS';

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
                    'no_tel_pejabat' => $officePhone,
                    'office_address' => $officeAddress,
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

