<?php

namespace Database\Seeders;

use App\Models\Complaint;
use App\Models\District;
use App\Models\Staff;
use Illuminate\Database\Seeder;

class FatTestComplaintSeeder extends Seeder
{
    private function upsertDistrict(string $name, string $code): District
    {
        return District::updateOrCreate(
            ['code' => $code],
            [
                'name' => $name,
                'is_active' => true,
            ]
        );
    }

    private function upsertStaff(array $lookup, array $data): Staff
    {
        return Staff::updateOrCreate($lookup, $data);
    }

    public function run(): void
    {
        $klang = $this->upsertDistrict('Klang', 'KLG');
        $huluLangat = $this->upsertDistrict('Hulu Langat', 'HLG');

        $informantKlang = $this->upsertStaff(
            ['user_id' => 69],
            [
                'name' => 'SYUHADA BINTI AHMAD SAIFUDDIN',
                'ic_number' => '980713035198',
                'staff_id' => 'BPN 300106',
                'phone' => '1-800-88-2424',
                'address' => 'HOTLINE 24 JAM BAHAGIAN PENGURUSAN PENGUATKUASAAN JAIS',
                'position' => 'Pegawai Penguatkuasa Agama',
                'department' => 'Bahagian Pengurusan Penguatkuasaan',
                'district_id' => $klang->id,
                'is_active' => true,
            ]
        );

        $informantHuluLangat = $this->upsertStaff(
            ['user_id' => 55],
            [
                'name' => 'HANIS ATIRA BINTI MISRAN',
                'ic_number' => '920426-10-5822',
                'staff_id' => '300103',
                'phone' => '0389221843',
                'address' => 'PEJABAT AGAMA ISLAM DAERAH HULU LANGAT, PERSIARAN KEMAJUAN, SEKSYEN 16, 43650 BANDAR BARU BANGI, SELANGOR',
                'position' => 'Pegawai Penguatkuasa Agama',
                'department' => 'Bahagian Pengurusan Penguatkuasaan',
                'district_id' => $huluLangat->id,
                'is_active' => true,
            ]
        );

        $approverStaff = $this->upsertStaff(
            ['name' => 'SITI NUR FATEMAH BINTI SAYUTI'],
            [
                'user_id' => null,
                'ic_number' => null,
                'staff_id' => 'BPN 300107',
                'phone' => '1-800-88-2424',
                'address' => 'HOTLINE 24 JAM BAHAGIAN PENGURUSAN PENGUATKUASAAN JAIS',
                'position' => 'Pegawai Penguatkuasa Agama',
                'department' => 'Bahagian Pengurusan Penguatkuasaan',
                'district_id' => $klang->id,
                'is_active' => true,
            ]
        );

        $directiveStaff = $this->upsertStaff(
            ['name' => 'ABDUL RAHMAN BIN HAYAT @ ABDUL LATIFF'],
            [
                'user_id' => 59,
                'ic_number' => '680722-10-5261',
                'staff_id' => 'BPN 300175',
                'phone' => '03-33726924',
                'address' => 'UNIT PENGURUSAN PENGUATKUASAAN, PAID KLANG',
                'position' => 'Pegawai Penguatkuasa Agama',
                'department' => 'Bahagian Pengurusan Penguatkuasaan',
                'district_id' => $klang->id,
                'is_active' => true,
            ]
        );

        $handoverStaff = $this->upsertStaff(
            ['name' => 'MOHD IDHAM BIN MOHD IDRIS'],
            [
                'user_id' => 62,
                'ic_number' => '851118-10-5605',
                'staff_id' => 'BPN 300102',
                'phone' => '0389221843',
                'address' => 'PEJABAT AGAMA ISLAM DAERAH HULU LANGAT, PERSIARAN KEMAJUAN, SEKSYEN 16, 43650 BANDAR BARU BANGI, SELANGOR',
                'position' => 'Pegawai Penguatkuasa Agama',
                'department' => 'Bahagian Pengurusan Penguatkuasaan',
                'district_id' => $huluLangat->id,
                'is_active' => true,
            ]
        );

        Complaint::updateOrCreate(
            ['reference_no' => 'AJ-Klang / 265 / 2026'],
            [
                'case_type' => 'AJ',
                'complaint_year' => 2026,
                'complaint_date' => '2026-04-11',
                'complaint_time' => '23:15:00',
                'incident_date' => '2026-04-11',
                'incident_time' => '23:10:00',
                'complainant_name' => 'SYUHADA BINTI AHMAD SAIFUDDIN',
                'identification_number' => 'BPN 300106',
                'contact_number' => '1-800-88-2424',
                'address' => 'HOTLINE 24 JAM BAHAGIAN PENGURUSAN PENGUATKUASAAN JAIS',
                'district_name' => 'Klang',
                'district_id' => $klang->id,
                'summary' => 'PADA 11/04/2026 JAM LEBIH KURANG 11.10 MALAM, SAYA TELAH MENERIMA MAKLUMAT BERKENAAN INDIVIDU BERAGAMA ISLAM YANG DISYAKI BERLAKU PELANGGARAN ENAKMEN JENAYAH SYARIAH NEGERI SELANGOR NO. 9 TAHUN 1995. MAKLUMAT BERKENAAN LELAKI DAN PEREMPUAN BERADA BERSAMA DI DALAM SEBUAH PREMIS YANG DISYAKI TIADA HUBUNGAN MAHRAM ATAU IKATAN HUBUNGAN SUAMI ISTERI YANG SAH.',
                'borang5_statement' => 'LOKASI : D-3-7 TINGKAT 3 BLOK D VISTA INDAH PUTRA APARTMENT JALAN BATU UNJUR 8, TAMAN BAYU PERDANA, 42000 PORT KLANG, SELANGOR. PADA 11/04/2026 JAM LEBIH KURANG 11.10 MALAM, SAYA TELAH MENERIMA MAKLUMAT BERKENAAN INDIVIDU BERAGAMA ISLAM YANG DISYAKI BERLAKU PELANGGARAN ENAKMEN JENAYAH SYARIAH NEGERI SELANGOR NO. 9 TAHUN 1995. PEMBERI MAKLUMAT MENGESAHKAN KEJADIAN SEDANG BERLAKU. MOHON TINDAKAN LANJUT DARIPADA BAHAGIAN PENGURUSAN PENGUATKUASAAN, JAIS. SEKIAN, LAPORAN SAYA.',
                'channel' => 'portal',
                'submitted_by_user_id' => 69,
                'current_stage' => 'selesai',
                'aj_ppa_classification' => 'FFA',
                'aj_current_status' => 'Selesai Tanpa Kes',
                'aj_report_notes' => 'PADA 11/04/2026 JAM LEBIH KURANG 11.10 MALAM, SAYA TELAH MENERIMA MAKLUMAT BERKENAAN INSIDEN DI SEBUAH PREMIS YANG DISYAKI MELIBATKAN PELANGGARAN ENAKMEN JENAYAH SYARIAH. HASIL PEMERIKSAAN MENUNJUKKAN PREMIS BERKENAAN TIDAK BEROPERASI DAN TIADA BERLAKU PELANGGARAN YANG JELAS.',
                'aj_directive_staff_id' => $directiveStaff->id,
                'aj_directive_at' => '2026-04-16 01:00:00',
                'aj_directive_notes' => 'Laksanakan aduan dengan berhemah mengikut undang-undang yang sedia ada.',
                'aj_handover_staff_id' => $handoverStaff->id,
                'handover_at' => '2026-04-16 01:00:00',
                'handover_notes' => 'Aduan diserahkan kepada anggota pelaksana untuk tindakan lanjut.',
                'approver_staff_id' => $approverStaff->id,
                'approver_confirmed_at' => '2026-04-11 23:20:00',
                'received_by_user_id' => 69,
                'case_register_no' => '265',
                'aj_action_datetime' => '2026-04-16 01:00:00',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        Complaint::updateOrCreate(
            ['reference_no' => 'AJ-Hulu Langat / 225 / 2026'],
            [
                'case_type' => 'AJ',
                'complaint_year' => 2026,
                'complaint_date' => '2026-04-09',
                'complaint_time' => '12:54:00',
                'incident_date' => '2026-04-09',
                'incident_time' => '12:54:00',
                'complainant_name' => 'HANIS ATIRA BINTI MISRAN',
                'identification_number' => '300103',
                'contact_number' => '0389221843',
                'address' => 'PEJABAT AGAMA ISLAM DAERAH HULU LANGAT, PERSIARAN KEMAJUAN, SEKSYEN 16, 43650 BANDAR BARU BANGI, SELANGOR',
                'district_name' => 'Hulu Langat',
                'district_id' => $huluLangat->id,
                'summary' => 'PADA 27/3/2026 LEBIH KURANG PUKUL 7.00 PETANG, TINDAKAN PEMERIKSAAN TELAH DILAKUKAN KE ATAS LAPORAN POLIS AMPANG/00664/26 BERKAITAN PREMIS BERKENAAN.',
                'borang5_statement' => 'TINDAKAN PEMERIKSAAN TELAH DIBUAT KE ATAS SATU LAPORAN MELIBATKAN PREMIS YANG DISYAKI. SEKIAN LAPORAN SAYA.',
                'channel' => 'portal',
                'submitted_by_user_id' => 55,
                'current_stage' => 'selesai',
                'aj_ppa_classification' => 'FFA',
                'aj_current_status' => 'Selesai Tanpa Kes',
                'aj_report_notes' => 'PADA 27/3/2026 LEBIH KURANG PUKUL 7.00 PETANG, BERDASARKAN LAPORAN POLIS AMPANG/00664/26, PEMERIKSAAN TELAH DIBUAT KE ATAS SEBUAH PREMIS. HASIL PEMERIKSAAN MENDAPATI PREMIS BERKENAAN TIDAK BEROPERASI DAN TIADA PELANGGARAN JELAS YANG DIJUMPAI.',
                'aj_directive_staff_id' => $directiveStaff->id,
                'aj_directive_at' => '2026-04-09 13:00:00',
                'aj_directive_notes' => 'Rujukan laporan disemak dan tindakan pemeriksaan direkodkan.',
                'aj_handover_staff_id' => $informantHuluLangat->id,
                'handover_at' => '2026-04-09 13:00:00',
                'handover_notes' => 'Laporan tindakan disahkan untuk semakan lanjut.',
                'approver_staff_id' => $approverStaff->id,
                'approver_confirmed_at' => '2026-04-09 13:05:00',
                'received_by_user_id' => 55,
                'case_register_no' => '225',
                'aj_action_datetime' => '2026-04-09 13:00:00',
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $this->command?->info('FAT complaint test records seeded.');
    }
}
