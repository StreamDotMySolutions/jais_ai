<?php

namespace Database\Seeders;

use App\Models\District;
use App\Models\IwaranWarrant;
use App\Models\RefIwaranHasil;
use App\Models\RefIwaranJenisKes;
use App\Models\RefMahkamah;
use App\Models\Staff;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class IwaranWarrantSeeder extends Seeder
{
    public function run(): void
    {
        if (IwaranWarrant::query()->exists()) {
            return;
        }

        $districts = District::query()->pluck('id')->all();
        $staffIds = Staff::query()->pluck('id')->all();
        $hasilIds = RefIwaranHasil::query()->pluck('id')->all();
        $mahkamahIds = RefMahkamah::query()->pluck('id')->all();
        $jenisMal = RefIwaranJenisKes::query()->where('kategori', 'mal')->pluck('id')->all();
        $jenisJenayah = RefIwaranJenisKes::query()->where('kategori', 'jenayah')->pluck('id')->all();

        if (empty($districts)) {
            return;
        }

        $now = now();
        $samples = [];
        for ($i = 1; $i <= 10; $i++) {
            $districtId = $districts[array_rand($districts)];
            $samples[] = [
                'no_ruj_fail' => str_pad((string) (400 + $i), 3, '0', STR_PAD_LEFT),
                'jenis_waran' => $i % 2 === 0 ? 'geledah' : 'tangkap',
                'tarikh_masa_terima' => $now->copy()->subDays($i),
                'tahun' => (int) $now->format('Y'),
                'no_kes' => "2505-L0510-65{$i}-0418",
                'jenis_kes_mal_id' => $jenisMal ? $jenisMal[array_rand($jenisMal)] : null,
                'jenis_kes_jenayah_id' => $jenisJenayah ? $jenisJenayah[array_rand($jenisJenayah)] : null,
                'mahkamah_id' => $mahkamahIds ? $mahkamahIds[array_rand($mahkamahIds)] : null,
                'daerah_id' => $districtId,
                'emel' => "waran{$i}@jais.gov.my",
                'emel_mahkamah' => "mahkamah{$i}@jais.gov.my",
                'tarikh_bicara' => $now->copy()->addDays(10 + $i)->toDateString(),
                'fail_waran' => null,
                'nama_okt' => "OKT Contoh {$i}",
                'no_kp_okt' => "9501170" . str_pad((string) $i, 4, '0', STR_PAD_LEFT),
                'alamat_okt' => "Alamat contoh {$i}, Selangor",
                'telefon_okt' => "012-555{$i}{$i}",
                'catatan_pendaftar' => "Catatan pendaftar contoh {$i}.",
                'tindakan_oleh_staff_id' => $staffIds ? $staffIds[array_rand($staffIds)] : null,
                'alamat_pejabat' => 'Bahagian Pengurusan Penguatkuasaan, JAIS',
                'status' => $i % 3 === 0 ? 'dalam_proses' : 'draf',
                'jumlah_perlaksanaan' => $i % 3 === 0 ? 2 : 1,
                'tarikh_masa_perlaksanaan_1' => $now->copy()->addDays($i),
                'tarikh_masa_perlaksanaan_2' => $i % 3 === 0 ? $now->copy()->addDays($i + 2) : null,
                'tarikh_masa_perlaksanaan_3' => null,
                'hasil_perlaksanaan_id' => $hasilIds ? $hasilIds[array_rand($hasilIds)] : null,
                'laporan' => "Laporan perlaksanaan contoh untuk rekod {$i}.",
                'catatan_pelaksana' => "Catatan pelaksana contoh {$i}.",
                'pendaftar_staff_id' => $staffIds ? $staffIds[array_rand($staffIds)] : null,
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        IwaranWarrant::query()->insert($samples);
    }
}
