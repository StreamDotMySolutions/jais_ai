<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RefIwaranJenisKesSeeder extends Seeder
{
    public function run(): void
    {
        $rawData = <<<'DATA'
001 - Rayuan MAL
002 - Permohonan Kebenaran Merayu MAL
003 - Semakan MAL
004 - Permohonan Tegahan / Injunksi Membawa Anak Keluar Malaysia MAL
005 - Permohonan Tegahan / Injunksi Terhadap Gangguan MAL
006 - Permohonan Pengesahtarafan Anak MAL
007 - Tuntutan Pengesahan Waqaf MAL
008 - Tuntutan Pengesahan Nazar MAL
009 - Tuntutan Gantirugi Pertunangan MAL
010 / 131 - Permohonan / Tuntutan Pengesahan / Perintah Nikah MAL
011 / 113 - Permohonan / Tuntutan Kebenaran Poligami MAL
012 - Permohonan Perintah Daftar Nikah Poligami MAL
013 - Permohonan Perisytiharan Pembubaran Perkahwinan Sebab Pertukaran Agama MAL
014 / 162 - Tuntutan Fasakh MAL
015 - Permohonan Anggapan Mati MAL
016 - Tuntutan Muta'ah MAL
017 - Tuntutan Harta Sepencarian MAL
018 - Tuntutan Nafkah Isteri MAL
019 - Tuntutan Nafkah Kepada Pihak Tak Upaya MAL
020 - Tuntutan Cagaran Nafkah MAL
021 - Tuntutan Nafkah Eddah MAL
022 / 254 - Tuntutan Mengubah Perintah Nafkah MAL
023 / 256 - Tuntutan Tunggakan Nafkah MAL
024 / 251 - Tuntutan Nafkah Anak MAL
025 - Tuntutan Mengubah Perintah Hak Jagaan Anak / Nafkah Anak MAL
026 - Tuntutan Mengubah Perjanjian Hak Jagaan Anak / Nafkah Anak MAL
027 - Permohonan / Tuntutan Membatalkan Perintah Nafkah MAL
028 / 231 - Tuntuan Hadhanah MAL
029 - Tuntutan Pemecatan Penjaga Anak MAL
030 - Permohonan Perintah Larangan Berkaitan Harta Anak Yang Belum Dewasa MAL
031 - Permohonan Penjaga Anak Yatim MAL
032 - Permohonan Pembekuan Transaksi Harta MAL
033 - Permohonan Penguatkuasaan Perintah Nafkah MAL
034 - Permohonan Perlaksanaan Perintah Mahkamah MAL
035 - Tuntutan Ganishmen / Hiwalah MAL
036 / 456 - Permohonan Perintah Menghina Mahkamah MAL
037 / 424 - Tuntutan Penghutang Penghakiman MAL
038 - Permohonan Perintah Interim MAL
039 - Permohonan Pengesahan Wasiat MAL
040 / 311 - Permohonan Sijil Faraid / Akuan Pusaka MAL
041 - Permohonan Interlokutori MAL
042 / 163 - Permohonan Faraq Nikah MAL
043 - Permohonan Keluar Islam MAL
044 - Permohonan Pengesahan Hibah MAL
045 - Permohonan Pengesahan Hibah Semasa Maradul Maut MAL
046 / 313 - Tuntutan Pengesahan Sabitan Nasab / Ahli Waris MAL
047 - Permohonan Mendakwa / Membela Sebagai Orang Miskin MAL
048 - Permohonan Interplider MAL
049 - Tuntutan Gantirugi Perkahwinan MAL
050 - Permohonan Kebenaran Nikah Bawah Umur MAL
051 - Permohonan Wali Hakim / Am MAL
052 / 124 - Tuntutan Wali Enggan / Engkar MAL
053 / 112 - Permohonan Kebenaran Bernikah Perempuan Yang Bercerai Tanpa Eddah / Janda Berhias MAL
054 / 152 - Tuntutan Pengesahan Lafaz Cerai MAL
055 / 151 - Tuntutan Perceraian MAL
056 / 154 - Tuntutan Khuluk / Tebus Talaq MAL
057 / 153 - Tuntutan Pengesahan Cerai Takliq MAL
058 / 143 - Tuntutan Sabitan Nusyuz MAL
059 - Tuntutan Hak Tempat Tinggal MAL
060 - Tuntutan Perintah Supaya Suami Tinggal Bersama Semula MAL
061 / 155 - Permohonan Pengesahan Rujuk MAL
072 - Tuntutan / Permohonan Penyelesaian/ Penjelasan Hutang Simati MAL
073 - Perintah Penyitaan Dan Penjualan MAL
074 / 416 - Perintah Pengkomitan-Pelaksanaan Penghakiman Bagi Penyerahan Anak MAL
075 / 415 - Perintah Pengkomitan-Penguatkuasaan Penghakiman Untuk Menahan Diri Dari Melakukan Sesuatu Perbuatan MAL
076 / 425 - Notis Penghakiman MAL
077 - Permohonan Melanjutkan Tempoh Rayuan MAL
078 - Permohonan Notis Tunjuk Sebab MAL
079 - Permohonan Pengesahan Eddah MAL
080 - Permohonan Memulakan Prosiding Baru Bagi Kes-kes Yang Ditarik Balik MAL
081 - Permohonan Taksiran Kos MAL
082 - Permohonan Perintah Bersaling MAL
099 - Lain-lain MAL
101 - Rayuan JENAYAH
102 - Permohonan Kebenaran Merayu JENAYAH
103 - Semakan JENAYAH
104 / 611 - Pemujaan Salah JENAYAH
105 / 612 - Mendakwa Bukan Islam JENAYAH
106 / 613 - Takfir JENAYAH
107 / 614 - Doktrin Palsu JENAYAH
108 / 615 - Dakwaan Palsu JENAYAH
109 / 633 - Menyebarkan Pendapat Bertentangan Dengan Fatwa JENAYAH
110 / 634 - Mengingkari Perintah Mahkamah JENAYAH
111 / 623 - Penerbitan Bertentangan Hukum Syarak JENAYAH
112 / 641 - Sumbang Mahram JENAYAH
113 / 643 - Muncikari JENAYAH
114 / 647 - Persediaan Bersetubuh Luar Nikah JENAYAH
115 - Hubungan Jenis Sesama Jantina JENAYAH
116 / 645 - Persetubuhan Bertentangan Dengan Hukum Tabi'i JENAYAH
117 / 731 - Memujuk Lari Perempuan Bersuami JENAYAH
118 / 733 - Menghasut Suami Isteri Supaya Bercerai JENAYAH
119 - Menjual / Memberikan Anak Kepada Bukan Islam JENAYAH
120 / 657 - Qazaf JENAYAH
121 / 652 - Liwat JENAYAH
122 / 653 - Musahaqah JENAYAH
123 / 664 - Mendirikan Masjid / Surau Tanpa Kebenaran JENAYAH
124 - Memujuk Lari Orang Perempuan JENAYAH
125 - Pecah Amanah JENAYAH
126 - Pecah Rahsia JENAYAH
127 - Pegawai Mengingkari Arahan Undang-Undang Dengan Niat Hendak Menyebabkan Bencana Kepada Mana-Mana Orang JENAYAH
128 - Tidak Mengemukakan Dokumen Kepada Pegawai Agama Di Sisi Undang-Undang Syarak JENAYAH
129 / 813 - Enggan Mengangkat Sumpah Yang Dikehendaki Oleh Pegawai Agama JENAYAH
130 / 814 - Enggan Menjawab Soalan Pegawai Agama Yang Diberi Kuasa JENAYAH
131 - Sengaja Menghina Dan Mengganggu Pegawai Agama Yang Sedang Bersidang Dalam Prosiding Mahkamah JENAYAH
132 / 655 - Menggalakkan Maksiat JENAYAH
133 / 618 - Mempersendakan Ayat Al-Quran dll JENAYAH
134 / 621 - Menghina Agama Islam JENAYAH
135 / 631 - Memusnahkan / Mencemarkan Tempat Beribadat JENAYAH
136 / 632 - Menghina Pihak Berkuasa Agama JENAYAH
137 / 622 - Mengajar Tanpa Tauliah JENAYAH
138 / 625 - Berjudi JENAYAH
139 / 626 - Minuman Yang Memabukkan JENAYAH
140 / 661 - Tidak Membayar Zakat / Fitrah JENAYAH
141 / 642 - Pelacuran JENAYAH
142 / 646 - Bersetubuh Luar Nikah JENAYAH
143 / 651 - Khalwat JENAYAH
144 / 732 - Menghalang Suami Isteri Hidup Bersama JENAYAH
145 / 663 - Pemungutan Zakat / Fitrah Tanpa Diberi Kuasa JENAYAH
146 / 673 - Penyalahgunaan Tanda Halal JENAYAH
147 / 682 - Subahat JENAYAH
148 / 713 - Gangguan Terhadap Perkahwinan JENAYAH
149 / 714 - Akuan Palsu Untuk Berkahwin JENAYAH
150 - Tidak Memberikan Keadilan Sewajarnya Kepada Isteri JENAYAH
151 - Murtad Untuk Membatalkan Nikah JENAYAH
152 / 624 - Menghasut Supaya Mengabai Kewajipan Agama JENAYAH
153 / 681 - Percubaan Melakukan Kesalahan Di Bawah UndangUndang Syarak JENAYAH
154 - Kesalahan Yang Tidak Ditentukan Hukuman Berkaitan Undang-Undang, Kaedah Dan Peraturan Pentadbiran Undang-Undang Islam JENAYAH
155 - Penghinaan Mahkamah JENAYAH
156 - Permohonan Jenayah Pelbagai JENAYAH
157 / 628 - Tidak Menghormati Ramadan JENAYAH
158 / 629 - Tidak Solat Jumaat JENAYAH
159 / 654 - Lelaki Berlagak Perempuan JENAYAH
160 / 656 - Perbuatan Tidak Sopan Di Tempat Awam JENAYAH
161 / 711 - Tidak Hadir Dihadapan Pendaftar NCR JENAYAH
162 - Penyelenggaraan Buku Negeri Perakuan Nikah Tak Legal / Tak Mengikut Undang-Undang JENAYAH
163 / 715 - Mengakad Nikah Tanpa Kuasa Yang Sah JENAYAH
164 / 715 - Kesalahan Berhubung Akad Nikah JENAYAH
165 / 716 - Berkahwin Bersalahan Dengan Bahagian Dua UndangUndang Keluarga Islam JENAYAH
166 / 717 - Poligami Tanpa Kebenaran Mahkamah JENAYAH
167 / 721 - Perceraian Tanpa Kebenaran Mahkamah JENAYAH
168 / 722 - Tidak Membuat Laporan Berkaitan Undang-Undang Keluarga Islam JENAYAH
169 - Meninggal Langsung Isteri JENAYAH
170 - Menganiaya Isteri JENAYAH
171 - Isteri Tidak Menurut Perintah (Nusyus) JENAYAH
172 - Persetubuhan Luar Nikah Antara Orang-Orang Bercerai JENAYAH
173 - Kecuaian Dengan Sengaja Untuk Tidak Mematuhi Perintah Di Bawah Undang-Undang Keluarga Islam JENAYAH
174 - Merujuk Tanpa Kebenaran Isteri JENAYAH
175 / 737 - Tidak Melaporkan Rujuk JENAYAH
176 - Persetubuhan Dalam Tempoh Eddah Raji'e JENAYAH
177 / 665 - Memungut Khairat Tanpa Kebenaran JENAYAH
178 - Memberi Maklumat / Keterangan Palsu Kepada Pendaftar Muallaf JENAYAH
179 - Menceroboh Atau Menduduki Secara Haram Harta Waqaf / Harta Majlis JENAYAH
180 / 648 - Hamil Luar Nikah JENAYAH
181 / 627 - Membuat Dan Menjual Minuman Yang Memabukkan JENAYAH
182 - Tidak Menghiraukan Titah Perintah Mengenai Awal Ramadhan Dan Dua Hari Raya JENAYAH
183 - Bertindak Salah Sebagai Imam, Khatib Atau Bilal Dalam Soal Jumaat JENAYAH
184 - Memberi Syarahan Dalam Masjid Tanpa Kebenaran JENAYAH
185 - Kesalahan-Kesalahan Berkaitan Baitulmal JENAYAH
186 / 815 - Enggan Menandatangani Pernyataan JENAYAH
187 - Beramal Sebagai Peguam Syarie Tanpa Tauliah JENAYAH
199 - Lain-lain JENAYAH
DATA;

        $rows = [];
        $lines = preg_split('/\R/u', $rawData) ?: [];

        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '') {
                continue;
            }

            if (! preg_match('/^(?<code>.+?)\s*-\s*(?<nama>.+?)\s+(?<kategori>MAL|JENAYAH)$/u', $line, $matches)) {
                continue;
            }

            $rows[] = [
                'code' => preg_replace('/\s+/', ' ', trim($matches['code'])),
                'nama' => preg_replace('/\s+/', ' ', trim($matches['nama'])),
                'kategori' => strtolower(trim($matches['kategori'])),
            ];
        }

        foreach ($rows as $row) {
            DB::table('ref_iwaran_jenis_kes')->updateOrInsert(
                ['kategori' => $row['kategori'], 'code' => $row['code']],
                ['nama' => $row['nama'], 'is_active' => true, 'updated_at' => now(), 'created_at' => now()]
            );
        }
    }
}
