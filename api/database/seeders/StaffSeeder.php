<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\Office;
use App\Models\Staff;
use Illuminate\Database\Seeder;

class StaffSeeder extends Seeder
{
    public function run(): void
    {
        \DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        \DB::table('staff')->truncate();
        \DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        $position = 'Pegawai Penguatkuasa Agama';
        $departmentHq = 'Penguatkuasa';

        $districtMap = District::query()
            ->pluck('id', 'name')
            ->all();

        $districtOfficeMap = Office::query()
            ->where('office_type', 'daerah')
            ->whereNotNull('district_id')
            ->pluck('id', 'district_id')
            ->all();

        $hqOfficeId = Office::query()
            ->where('code', 'HQ')
            ->value('id');

        $rows = [
            // PAID Sabak Bernam
            ['name' => 'MUHAMMAD SUHAILI BIN SAJIMAN', 'grade' => 'S6 TBK', 'ic' => '810601-10-5567', 'district' => 'Sabak Bernam'],
            ['name' => 'NADIAH BINTI HATIM', 'grade' => 'S2', 'ic' => '850203-10-5584', 'district' => 'Sabak Bernam'],
            ['name' => 'MOHD FAIRUZ BIN HAMDAN', 'grade' => 'S1', 'ic' => '851013-10-6249', 'district' => 'Sabak Bernam'],
            ['name' => 'SITI RAHMAH BINTI ANOR', 'grade' => 'S2 TBK', 'ic' => '871016-43-5564', 'district' => 'Sabak Bernam'],
            ['name' => 'NOR ASHIKIN BINTI ARSAT', 'grade' => 'S1', 'ic' => '860828-43-5136', 'district' => 'Sabak Bernam'],

            // PAID Kuala Selangor
            ['name' => 'MUHAMAD ALIF BIN JAMALI', 'grade' => 'S5', 'ic' => '950401-10-5663', 'district' => 'Kuala Selangor'],
            ['name' => 'S NORSHAWAL BIN SUYURNO', 'grade' => 'S2 TBK', 'ic' => '830711-10-5785', 'district' => 'Kuala Selangor'],
            ['name' => 'MOHD MAFAZI ZIL IKRAM BIN MISROL', 'grade' => 'S1', 'ic' => '891025-10-6453', 'district' => 'Kuala Selangor'],
            ['name' => 'NORAFIZ BIN AHMAD', 'grade' => 'S2 TBK', 'ic' => '840824-10-5705', 'district' => 'Kuala Selangor'],
            ['name' => 'NOOR BAIZURA BINTI ASKUR', 'grade' => 'S1', 'ic' => '900501-10-5796', 'district' => 'Kuala Selangor'],

            // PAID Klang
            ['name' => 'MOHD HAFIZ BIN RAZALI', 'grade' => 'S6 TBK', 'ic' => '841126-10-5913', 'district' => 'Klang'],
            ['name' => 'SALLEHUDDIN BIN MOHD SIDEK', 'grade' => 'S2', 'ic' => '760404-10-5135', 'district' => 'Klang'],
            ['name' => 'MOHAMAD ARIF NOR BIN MOHAMAD NAJIB', 'grade' => 'S1', 'ic' => '840531-10-5517', 'district' => 'Klang'],
            ['name' => 'WAN HASNIDA BINTI ABDUL HADI', 'grade' => 'S1', 'ic' => '860322-43-6270', 'district' => 'Klang'],
            ['name' => 'NOR HAFIZ BIN MOHD LEMAN', 'grade' => 'S2 TBK', 'ic' => '860213-14-5423', 'district' => 'Klang'],
            ['name' => 'FIRDAUS BIN AHMAD TARMIZI', 'grade' => 'S1 (K)', 'ic' => '860530-56-6387', 'district' => 'Klang'],
            ['name' => 'NUR IZZAH HAZWANI BINTI MOHD AMIN', 'grade' => 'S1', 'ic' => '000829-10-0952', 'district' => 'Klang'],

            // PAID Sepang
            ['name' => 'MUHAMMAD AZINUDDIN SYAZWAN BIN M.THAMRIN', 'grade' => 'S5', 'ic' => '900321-14-5803', 'district' => 'Sepang'],
            ['name' => 'MOHD SHOHADAK BIN MUZAKIR', 'grade' => 'S2', 'ic' => '720906-10-5243', 'district' => 'Sepang'],
            ['name' => 'NURUL AIN BINTI ROSLAN', 'grade' => 'S2 TBK', 'ic' => '850530-10-5792', 'district' => 'Sepang'],
            ['name' => 'ABDUL RASYID BIN HUSSAIN', 'grade' => 'S2 TBK', 'ic' => '870814-10-5039', 'district' => 'Sepang'],
            ['name' => 'ALFIAN BIN AHMAD', 'grade' => 'S2 TBK', 'ic' => '680418-13-5001', 'district' => 'Sepang'],

            // PAID Hulu Selangor
            ['name' => 'KHAIRUL HAZRI BIN SULAIMAN', 'grade' => 'S6 TBK', 'ic' => '830409-10-5469', 'district' => 'Hulu Selangor'],
            ['name' => 'RUZAIDA BINTI ISHAK', 'grade' => 'S2', 'ic' => '760418-14-5138', 'district' => 'Hulu Selangor'],
            ['name' => 'FARDZUAN HATTA BIN MAT KHODORI', 'grade' => 'S1', 'ic' => '890729-08-6249', 'district' => 'Hulu Selangor'],
            ['name' => 'FAZA SHA BINTI ZAINUDDIN', 'grade' => 'S1', 'ic' => '810530-14-5480', 'district' => 'Hulu Selangor'],
            ['name' => 'SITI AZATUL AIN BINTI IBRAHIM', 'grade' => 'S1', 'ic' => '850601-10-5838', 'district' => 'Hulu Selangor'],
            ['name' => 'NAZIZUL BIN MOHAMMED LEHAN', 'grade' => 'S1', 'ic' => '841103-10-5857', 'district' => 'Hulu Selangor'],

            // PAID Kuala Langat
            ['name' => 'MOHAMMAD HAFFIZI BIN MOHAMMAD RUSLAN', 'grade' => 'S6 TBK', 'ic' => '830521-14-6463', 'district' => 'Kuala Langat'],
            ['name' => 'AHYAR BIN HJ. ABDUL RAHMAN', 'grade' => 'S2', 'ic' => '660723-10-6903', 'district' => 'Kuala Langat'],
            ['name' => 'KASRIN BIN YAACOB', 'grade' => 'S2 TBK', 'ic' => '750407-10-5799', 'district' => 'Kuala Langat'],
            ['name' => 'ROLNIJAYAWIRAWAN BIN JAILANI', 'grade' => 'S2 TBK', 'ic' => '810512-10-5741', 'district' => 'Kuala Langat'],
            ['name' => 'ISMAIL BIN MARUDIN @ NORDIN', 'grade' => 'S2 TBK', 'ic' => '861218-43-6187', 'district' => 'Kuala Langat'],
            ['name' => 'NURUL AINI BINTI MOHD SARBINI', 'grade' => 'S1', 'ic' => '830221-10-5256', 'district' => 'Kuala Langat'],

            // PAID Gombak
            ['name' => 'JASLAN BIN ALI', 'grade' => 'S6 TBK', 'ic' => '840825-10-5715', 'district' => 'Gombak'],
            ['name' => 'MUHAMMAD HARIZ BIN HJ. DAMANHURI @ DAMANURI', 'grade' => 'S2', 'ic' => '840604-10-5711', 'district' => 'Gombak'],
            ['name' => 'NAFARUL AZIAN BIN CHE NAN', 'grade' => 'S2 TBK', 'ic' => '760624-09-5071', 'district' => 'Gombak'],
            ['name' => "MUHAMMAD SALEHUDDIN BIN MOHD SA'AT", 'grade' => 'S1', 'ic' => '930109-10-5203', 'district' => 'Gombak'],
            ['name' => 'REZMAN ABDULLAH @ JOHARI BIN MAGITAT', 'grade' => 'S2 TBK', 'ic' => '700101-12-6399', 'district' => 'Gombak'],
            ['name' => 'NURUL HUSNA BINTI YAHYA', 'grade' => 'S1', 'ic' => '831027-10-5548', 'district' => 'Gombak'],
            ['name' => 'NOR KHAIRINA ALIZA BINTI HUSIN', 'grade' => 'S1', 'ic' => '860703-38-6690', 'district' => 'Gombak'],
            ['name' => 'SHAIFUNA AMRI BIN ZAHARI', 'grade' => 'S2 TBK', 'ic' => '830221-14-5581', 'district' => 'Gombak'],

            // PAID Hulu Langat
            ['name' => 'ARIFF ALFIAN BIN NORAZMAN', 'grade' => 'S6 TBK', 'ic' => '850613-10-5587', 'district' => 'Hulu Langat'],
            ['name' => 'KHAIRUN NADZRI BIN MOHD SHAKOR', 'grade' => 'S1', 'ic' => '791228-10-5399', 'district' => 'Hulu Langat'],
            ['name' => 'HANIS ATIRA BINTI MISRAN', 'grade' => 'S1', 'ic' => '920426-10-5822', 'district' => 'Hulu Langat'],
            ['name' => 'MUHAMAD ZAIDI BIN HAMZAH', 'grade' => 'S1', 'ic' => '810417-08-5295', 'district' => 'Hulu Langat'],
            ['name' => 'AHMAD KAMAL BIN MOHAMD', 'grade' => 'S2 TBK', 'ic' => '860906-43-5087', 'district' => 'Hulu Langat'],
            ['name' => 'MOHD IZHAR BIN DOLLAH', 'grade' => 'S2 TBK', 'ic' => '831213-10-5779', 'district' => 'Hulu Langat'],
            ['name' => 'MOHD AZIZI BIN MOHAMAD SANI', 'grade' => 'S1', 'ic' => '850328-10-5537', 'district' => 'Hulu Langat'],

            // HQ - Penerima Aduan
            ['name' => 'MOHAMAD HUSAIRI BIN MOHAMED WILDAN', 'grade' => 'S9', 'ic' => '880616-04-5417', 'office' => 'hq'],
            ['name' => 'ALIFF FAZHIN BIN HAMDAN', 'grade' => 'S1 (K)', 'ic' => '960118-10-5755', 'office' => 'hq'],
            ['name' => 'MOHD IDHAM BIN MOHD IDRIS', 'grade' => 'S1', 'ic' => '851118-10-5605', 'office' => 'hq'],
            ['name' => 'FAHIZAR BIN PAIMAN', 'grade' => 'S1 (K)', 'ic' => '930731-10-6097', 'office' => 'hq'],
            ['name' => 'SYUHADA BINTI AHMAD SAIFUDDIN', 'grade' => 'S1', 'ic' => '820802-10-6098', 'office' => 'hq'],
            ['name' => 'SITI ROHAYA AINI BINTI ABDULLAH NAJIB', 'grade' => 'S1 (K)', 'ic' => '930618-10-5770', 'office' => 'hq'],
            ['name' => 'MOHD GHAZALI BIN MOHAMAD ISMAIL', 'grade' => 'S1', 'ic' => '870629-43-5693', 'office' => 'hq'],
            ['name' => 'ZAILILA BINTI MOHD YUSOF', 'grade' => 'S1', 'ic' => '900713-10-5480', 'office' => 'hq'],
            ['name' => 'ZAINORIZZATI BINTI MOHD JALANI', 'grade' => 'S1', 'ic' => '940914-10-6064', 'office' => 'hq'],

            // HQ - Pengesah Aduan
            ['name' => 'ABDUL RAHMAN BIN HAYAT @ ABDUL LATIFF', 'grade' => 'S3', 'ic' => '680722-10-5261', 'office' => 'hq'],
            ['name' => 'ROSLY BIN MOHAMED ARUS', 'grade' => 'S3', 'ic' => '670228-10-6083', 'office' => 'hq'],
            ['name' => 'MOHD RADZI BIN SALIMAN', 'grade' => 'S2', 'ic' => '840711-10-5637', 'office' => 'hq'],
            ['name' => 'KHAIRIL FIKRI BIN AHMAD PAIMAN', 'grade' => 'S2 TBK', 'ic' => '850313-10-5681', 'office' => 'hq'],
        ];

        foreach ($rows as $row) {
            $districtId = null;
            $officeType = $row['office'] ?? 'daerah';

            if ($officeType === 'daerah') {
                $districtId = $districtMap[$row['district']] ?? null;
                if (! $districtId) {
                    continue;
                }
            }

            $officeId = $officeType === 'hq'
                ? $hqOfficeId
                : ($districtOfficeMap[$districtId] ?? null);

            Staff::updateOrCreate(
                ['ic_number' => $row['ic']],
                [
                    'name' => $row['name'],
                    'grade' => $row['grade'] ?? null,
                    'position' => $position,
                    'department' => $officeType === 'hq' ? $departmentHq : 'PAID ' . $row['district'],
                    'office_type' => $officeType,
                    'district_id' => $districtId,
                    'office_id' => $officeId,
                    'is_active' => true,
                ]
            );
        }
    }
}
