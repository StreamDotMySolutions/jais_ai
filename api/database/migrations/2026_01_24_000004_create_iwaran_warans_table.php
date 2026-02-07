<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iwaran_warans', function (Blueprint $table) {
            $table->id();
            $table->string('no_ruj_fail')->nullable();
            $table->string('jenis_waran', 20);
            $table->dateTime('tarikh_masa_terima')->nullable();
            $table->unsignedSmallInteger('tahun')->nullable();
            $table->string('no_kes')->nullable();
            $table->foreignId('jenis_kes_mal_id')->nullable()->constrained('ref_iwaran_jenis_kes')->nullOnDelete();
            $table->foreignId('jenis_kes_jenayah_id')->nullable()->constrained('ref_iwaran_jenis_kes')->nullOnDelete();
            $table->foreignId('mahkamah_id')->nullable()->constrained('ref_mahkamah')->nullOnDelete();
            $table->foreignId('daerah_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->string('emel')->nullable();
            $table->string('emel_mahkamah')->nullable();
            $table->date('tarikh_bicara')->nullable();
            $table->string('fail_waran')->nullable();
            $table->string('nama_okt')->nullable();
            $table->string('no_kp_okt')->nullable();
            $table->text('alamat_okt')->nullable();
            $table->string('telefon_okt')->nullable();
            $table->text('catatan_pendaftar')->nullable();

            $table->foreignId('tindakan_oleh_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->text('alamat_pejabat')->nullable();
            $table->string('status', 30)->default('draf');
            $table->unsignedTinyInteger('jumlah_perlaksanaan')->nullable();
            $table->dateTime('tarikh_masa_perlaksanaan_1')->nullable();
            $table->dateTime('tarikh_masa_perlaksanaan_2')->nullable();
            $table->dateTime('tarikh_masa_perlaksanaan_3')->nullable();
            $table->foreignId('hasil_perlaksanaan_id')->nullable()->constrained('ref_iwaran_hasil')->nullOnDelete();
            $table->longText('laporan')->nullable();
            $table->text('catatan_pelaksana')->nullable();

            $table->foreignId('pendaftar_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iwaran_warans');
    }
};
