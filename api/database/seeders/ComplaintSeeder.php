<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Complaint;
use App\Models\District;
use App\Models\User;

class ComplaintSeeder extends Seeder
{
    public function run(): void
    {
        $districts = District::all()->keyBy('name');

        $publicUser = User::where('email', 'user@local')->first();
        $pegawaiHq = User::where('email', 'pegawai@local')->first();

        $statusId = DB::table('complaint_statuses')
            ->where('code', 'baru')
            ->value('id');
        $classificationIds = DB::table('complaint_classifications')
            ->pluck('id', 'code')
            ->all();

        $pegawaiGombak = User::updateOrCreate(
            ['email' => 'pegawai.gombak@local'],
            [
                'name' => 'Pegawai Gombak',
                'office_type' => 'daerah',
                'district_id' => $districts->get('Gombak')->id ?? null,
                'password' => Hash::make('password'),
            ]
        );
        $pegawaiGombak->markEmailAsVerified();
        if (method_exists($pegawaiGombak, 'syncRoles')) {
            $pegawaiGombak->syncRoles(['pegawai']);
        }

        $baseDate = now()->subDays(20);

        $records = [
            [
                'reference_no' => 'ADU-2025-0001',
                'case_type' => 'AJ',
                'complainant_name' => 'Ahmad Rahman',
                'identification_number' => '900101101234',
                'contact_number' => '0123456789',
                'address' => 'No 1, Jalan Aman, Petaling, Selangor',
                'district_name' => 'Petaling',
                'district_id' => $districts->get('Petaling')->id ?? null,
                'summary' => 'Aduan awam (tidak berdaftar) melalui web.',
                'channel' => 'web',
                'submitted_by_user_id' => null,
            ],
            [
                'reference_no' => 'ADU-2025-0002',
                'case_type' => 'AK',
                'complainant_name' => 'Siti Aminah',
                'identification_number' => '920202085432',
                'contact_number' => '0134567890',
                'address' => 'No 12, Jalan Melur, Hulu Langat, Selangor',
                'district_name' => 'Hulu Langat',
                'district_id' => $districts->get('Hulu Langat')->id ?? null,
                'summary' => 'Aduan awam (tidak berdaftar) melalui web.',
                'channel' => 'web',
                'submitted_by_user_id' => null,
            ],
            [
                'reference_no' => 'ADU-2025-0003',
                'case_type' => 'AJ',
                'complainant_name' => 'Nurul Huda',
                'identification_number' => '930303065678',
                'contact_number' => '0145678901',
                'address' => 'No 7, Jalan Kenanga, Klang, Selangor',
                'district_name' => 'Klang',
                'district_id' => $districts->get('Klang')->id ?? null,
                'summary' => 'Aduan awam berdaftar melalui portal.',
                'channel' => 'web',
                'submitted_by_user_id' => optional($publicUser)->id,
            ],
            [
                'reference_no' => 'ADU-2025-0004',
                'case_type' => 'AK',
                'complainant_name' => 'Mohd Fikri',
                'identification_number' => '940404115432',
                'contact_number' => '0156789012',
                'address' => 'No 18, Jalan Jati, Kuala Langat, Selangor',
                'district_name' => 'Kuala Langat',
                'district_id' => $districts->get('Kuala Langat')->id ?? null,
                'summary' => 'Aduan awam berdaftar melalui portal.',
                'channel' => 'web',
                'submitted_by_user_id' => optional($publicUser)->id,
            ],
            [
                'reference_no' => 'ADU-2025-0005',
                'case_type' => 'AJ',
                'complainant_name' => 'Azlan Kassim',
                'identification_number' => '950505075678',
                'contact_number' => '0167890123',
                'address' => 'No 5, Jalan Meranti, Sepang, Selangor',
                'district_name' => 'Sepang',
                'district_id' => $districts->get('Sepang')->id ?? null,
                'summary' => 'Aduan dimasukkan oleh pegawai HQ.',
                'channel' => 'web',
                'submitted_by_user_id' => optional($pegawaiHq)->id,
            ],
            [
                'reference_no' => 'ADU-2025-0006',
                'case_type' => 'AK',
                'complainant_name' => 'Farah Zain',
                'identification_number' => '960606045432',
                'contact_number' => '0178901234',
                'address' => 'No 20, Jalan Anggerik, Kuala Selangor, Selangor',
                'district_name' => 'Kuala Selangor',
                'district_id' => $districts->get('Kuala Selangor')->id ?? null,
                'summary' => 'Aduan dimasukkan oleh pegawai HQ.',
                'channel' => 'web',
                'submitted_by_user_id' => optional($pegawaiHq)->id,
            ],
            [
                'reference_no' => 'ADU-2025-0007',
                'case_type' => 'AJ',
                'complainant_name' => 'Hafiz Idris',
                'identification_number' => '970707035678',
                'contact_number' => '0189012345',
                'address' => 'No 9, Jalan Murni, Gombak, Selangor',
                'district_name' => 'Gombak',
                'district_id' => $districts->get('Gombak')->id ?? null,
                'summary' => 'Aduan dimasukkan oleh pegawai Gombak.',
                'channel' => 'web',
                'submitted_by_user_id' => $pegawaiGombak->id,
            ],
            [
                'reference_no' => 'ADU-2025-0008',
                'case_type' => 'AK',
                'complainant_name' => 'Aina Syafiqah',
                'identification_number' => '980808055432',
                'contact_number' => '0190123456',
                'address' => 'No 3, Jalan Melati, Hulu Selangor, Selangor',
                'district_name' => 'Hulu Selangor',
                'district_id' => $districts->get('Hulu Selangor')->id ?? null,
                'summary' => 'Aduan dimasukkan oleh pegawai Gombak.',
                'channel' => 'web',
                'submitted_by_user_id' => $pegawaiGombak->id,
            ],
            [
                'reference_no' => 'ADU-2025-0009',
                'case_type' => 'AJ',
                'complainant_name' => 'Zulkifli Omar',
                'identification_number' => '990909095678',
                'contact_number' => '0112345678',
                'address' => 'No 11, Jalan Bakau, Sabak Bernam, Selangor',
                'district_name' => 'Sabak Bernam',
                'district_id' => $districts->get('Sabak Bernam')->id ?? null,
                'summary' => 'Aduan dari saluran AI WhatsApp.',
                'channel' => 'whatsapp',
                'submitted_by_user_id' => null,
            ],
            [
                'reference_no' => 'ADU-2025-0010',
                'case_type' => 'AK',
                'complainant_name' => 'Salmah Yusof',
                'identification_number' => '000101105432',
                'contact_number' => '0113456789',
                'address' => 'No 6, Presint 9, Putrajaya',
                'district_name' => 'Putrajaya',
                'district_id' => null,
                'summary' => 'Aduan dari saluran AI WhatsApp.',
                'channel' => 'whatsapp',
                'submitted_by_user_id' => null,
            ],
        ];

        foreach ($records as $index => $record) {
            $date = $baseDate->copy()->addDays($index);
            $payload = array_merge($record, [
                'status_id' => $statusId,
                'classification_id' => $classificationIds[$record['case_type']] ?? null,
                'complaint_year' => (int) $date->format('Y'),
                'complaint_date' => $date->toDateString(),
                'complaint_time' => $date->format('H:i:s'),
                'submitted_at' => $date,
            ]);

            Complaint::updateOrCreate(
                ['reference_no' => $record['reference_no']],
                $payload
            );
        }
    }
}
