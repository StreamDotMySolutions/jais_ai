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
        $districtIwaranAddresses = [
            'PET' => "BAHAGIAN PENGURUSAN PENGUATKUASAAN,\nJABATAN AGAMA ISLAM SELANGOR,\nTINGKAT 4 MENARA UTARA,\nBANGUNAN SULTAN IDRIS SHAH,\n40000 SHAH ALAM, SELANGOR DARUL EHSAN",
            'KLG' => "PEJABAT AGAMA ISLAM DAERAH KLANG,\nTINGKAT 1\nBANGUNAN PEJABAT-PEJABAT KERAJAAN,\nJALAN KOTA, 41000 KLANG\nSELANGOR DARUL EHSAN",
            'GOM' => "KOMPLEKS ISLAM DAERAH GOMBAK,\nKM 16, PERSIARAN PEGAWAI, BANDAR BARU SELAYANG,\n68100 BATU CAVES, SELANGOR DARUL EHSAN",
            'SEP' => "PEJABAT AGAMA ISLAM DAERAH SEPANG,\nBANDAR BARU SALAK TINGGI,\n43900 SEPANG\nSELANGOR DARUL EHSAN",
            'HLA' => "KOMPLEKS ISLAM DAERAH HULU LANGAT,\nPERSIARAN KEMAJUAN SEKSYEN 16,\n43650 BANDAR BARU BANGI,\nSELANGOR DARUL EHSAN",
            'KUL' => "KOMPLEKS ISLAM DAERAH KUALA LANGAT,\nPERSIARAN SULTAN ABDUL AZIZ SHAH,\nKOTA SERI LANGAT (SG. SEDU),\n42700 BANTING, KUALA LANGAT,\nSELANGOR DARUL EHSAN",
            'HLS' => "PEJABAT AGAMA ISLAM DAERAH HULU SELANGOR,\n44000 KUALA KUBU BHARU,\nSELANGOR DARUL EHSAN",
            'KSE' => "KOMPLEKS ISLAM DAERAH KUALA SELANGOR,\nJALAN MASJID,\n45000 KUALA SELANGOR,\nSELANGOR DARUL EHSAN",
            'SBN' => "PEJABAT AGAMA ISLAM DAERAH SABAK BERNAM,\nPARIT SATU TIMUR, 45300 SUNGAI BESAR,\nSELANGOR DARUL EHSAN",
        ];

        $hqOffice = Office::query()->updateOrCreate(
            ['code' => 'HQ'],
            [
                'name' => 'Ibu Pejabat JAIS',
                'office_type' => 'hq',
                'district_id' => $petalingDistrictId,
                'phone' => $officePhone,
                'address' => $hqOfficeAddress,
                'iwaran_address' => $districtIwaranAddresses['PET'],
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
                    'iwaran_address' => $districtIwaranAddresses[$code] ?? null,
                    'is_active' => true,
                ]
            );
        }

    }
}
