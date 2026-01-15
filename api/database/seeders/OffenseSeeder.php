<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class OffenseSeeder extends Seeder
{
    public function run(): void
    {
        $offenses = [
            ['code' => 'EJSS-4', 'section' => 'EJSS / Sec 4', 'name' => 'Pemujaan salah.'],
            ['code' => 'EJSS-5', 'section' => 'EJSS / Sec 5', 'name' => 'Mendakwa bukan orang Islam untuk mengelakkan tindakan.'],
            ['code' => 'EJSS-6', 'section' => 'EJSS / Sec 6', 'name' => 'Takfir.'],
            ['code' => 'EJSS-7', 'section' => 'EJSS / Sec 7', 'name' => 'Doktrin palsu.'],
            ['code' => 'EJSS-8', 'section' => 'EJSS / Sec 8', 'name' => 'Dakwaan palsu.'],
            ['code' => 'EJSS-9', 'section' => 'EJSS / Sec 9', 'name' => 'Mempersendakan, dll., ayat Al-Quran dan Hadith.'],
            ['code' => 'EJSS-10', 'section' => 'EJSS / Sec 10', 'name' => 'Menghina atau menyebabkan dipandang hina, dll., agama Islam.'],
            ['code' => 'EJSS-11', 'section' => 'EJSS / Sec 11', 'name' => 'Memusnahkan atau mencemarkan tempat beribadat.'],
            ['code' => 'EJSS-12', 'section' => 'EJSS / Sec 12', 'name' => 'Menghina pihak berkuasa agama.'],
            ['code' => 'EJSS-13', 'section' => 'EJSS / Sec 13', 'name' => 'Pendapat yang bertentangan dengan fatwa.'],
            ['code' => 'EJSS-15', 'section' => 'EJSS / Sec 15', 'name' => 'Mengingkari perintah Mahkamah.'],
            ['code' => 'EJSS-16', 'section' => 'EJSS / Sec 16', 'name' => "Penerbitan agama yang bertentangan dengan Hukum Syara'."],
            ['code' => 'EJSS-17', 'section' => 'EJSS / Sec 17', 'name' => 'Berjudi.'],
            ['code' => 'EJSS-18', 'section' => 'EJSS / Sec 18', 'name' => 'Minuman yang memabukkan.'],
            ['code' => 'EJSS-19', 'section' => 'EJSS / Sec 19', 'name' => 'Tidak menghormati Ramadhan.'],
            ['code' => 'EJSS-20', 'section' => 'EJSS / Sec 20', 'name' => 'Tidak menunaikan sembahyang Jumaat.'],
            ['code' => 'EJSS-21', 'section' => 'EJSS / Sec 21', 'name' => 'Tidak membayar zakat atau fitrah.'],
            ['code' => 'EJSS-22', 'section' => 'EJSS / Sec 22', 'name' => 'Perbuatan sumbang mahram.'],
            ['code' => 'EJSS-23', 'section' => 'EJSS / Sec 23', 'name' => 'Pelacuran.'],
            ['code' => 'EPAIS-121F', 'section' => 'EPAIS / Sec 121F', 'name' => 'Kesalahan melakukan sembelihan halal dan sertu tanpa perakuan.'],
            ['code' => 'EJSS-24', 'section' => 'EJSS / Sec 24', 'name' => 'Muncikari.'],
            ['code' => 'EJSS-25', 'section' => 'EJSS / Sec 25', 'name' => 'Persetubuhan luar nikah.'],
            ['code' => 'EJSS-26', 'section' => 'EJSS / Sec 26', 'name' => 'Perbuatan sebagai persediaan untuk melakukan persetubuhan luar nikah.'],
            ['code' => 'EJSS-27', 'section' => 'EJSS / Sec 27', 'name' => 'Hubungan jenis antara orang yang sama jantina.'],
            ['code' => 'EJSS-28', 'section' => 'EJSS / Sec 28', 'name' => 'Persetubuhan bertentangan dengan hukum tabii.'],
            ['code' => 'EJSS-29', 'section' => 'EJSS / Sec 29', 'name' => 'Khalwat.'],
            ['code' => 'EJSS-30', 'section' => 'EJSS / Sec 30', 'name' => 'Lelaki berlagak seperti perempuan.'],
            ['code' => 'EJSS-31', 'section' => 'EJSS / Sec 31', 'name' => 'Perbuatan tidak sopan di tempat awam.'],
            ['code' => 'EJSS-32', 'section' => 'EJSS / Sec 32', 'name' => 'Memujuk lari perempuan bersuami.'],
            ['code' => 'EJSS-33', 'section' => 'EJSS / Sec 33', 'name' => 'Menghalang pasangan yang sudah bernikah daripada hidup sebagai suami isteri.'],
            ['code' => 'EJSS-34', 'section' => 'EJSS / Sec 34', 'name' => 'Menghasut suami atau isteri supaya bercerai atau mengabaikan kewajipan.'],
            ['code' => 'EJSS-35', 'section' => 'EJSS / Sec 35', 'name' => 'Menjual atau memberikan anak kepada orang bukan Islam.'],
            ['code' => 'EJSS-36', 'section' => 'EJSS / Sec 36', 'name' => 'Qazaf.'],
            ['code' => 'EJSS-37', 'section' => 'EJSS / Sec 37', 'name' => 'Pungutan zakat atau fitrah tanpa diberikuasa.'],
            ['code' => 'EJSS-38', 'section' => 'EJSS / Sec 38', 'name' => 'Penyalahgunaan tanda halal.'],
            ['code' => 'EPAIS-106', 'section' => 'EPAIS / Seksyen 106', 'name' => 'Pungutan Khairat Tanpa Kebenaran.'],
            ['code' => 'EPAIS-119', 'section' => 'EPAIS / Seksyen 119', 'name' => 'Mengajar Tanpa Tauliah.'],
            ['code' => 'LAIN', 'section' => null, 'name' => 'Lain-lain Kesalahan.'],
        ];

        foreach ($offenses as $index => $offense) {
            DB::table('ref_offenses')->updateOrInsert(
                ['code' => $offense['code']],
                [
                    'name' => $offense['name'],
                    'section' => $offense['section'],
                    'sort_order' => $index + 1,
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
