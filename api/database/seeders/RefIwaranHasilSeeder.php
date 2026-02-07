<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RefIwaranHasilSeeder extends Seeder
{
    public function run(): void
    {
        $items = [
            'Alamat di luar bidangkuasa',
            'Alamat tidak ditemui (Tanah Lot)',
            'Alamat tidak lengkap',
            'Alamat tidak wujud',
            'Butiran OKT bercanggah dengan butiran sebenar yang diperolehi',
            'Ditahan',
            'OKT sakit, tidak dapat dibawa',
            'OKT telah berhenti kerja',
            'OKT telah berpindah',
            'OKT telah meninggal dunia',
            'OKT telah tamat pengajian',
            'OKT tiada di alamat, salinan waran telah ditinggalkan / diserah kepada penghuni / waris yang ada',
            'OKT tiada di alamat, tetapi dapat bercakap dengan OKT melalui telefon dan memaklumkan akan hadir sepertimana ketetapan',
            'OKT tiada rekod di dalam syarikat',
            'OKT tidak menerima sebarang notis / saman kehadiran',
            'OKT tidak tinggal / bertugas di alamat',
            'Pemantauan telah dilakukan beberapa kali, OKT menetap di alamat tersebut, tetapi gagal ditemui',
            'Premis telah ditutup dan tidak beroperasi lagi',
            'Rumah kosong / ditinggalkan',
            'Waran berulang (pernah dilaksanakan sebelum ini dan gagal)',
            'Waran diterima setelah tarikh bicara',
            'Waran suntuk untuk dilaksanakan (masa terlalu pendek)',
        ];

        foreach ($items as $label) {
            DB::table('ref_iwaran_hasil')->updateOrInsert(
                ['nama' => $label],
                ['is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}
