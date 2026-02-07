<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ref_iwaran_jenis_kes', function (Blueprint $table) {
            $table->id();
            $table->string('kategori', 20);
            $table->string('nama', 255);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['kategori', 'nama']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_iwaran_jenis_kes');
    }
};
