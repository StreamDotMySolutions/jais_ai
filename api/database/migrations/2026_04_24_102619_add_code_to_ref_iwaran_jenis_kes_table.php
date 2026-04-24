<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ref_iwaran_jenis_kes', function (Blueprint $table) {
            $table->string('code', 20)->nullable()->after('id');
            $table->index('code');
            $table->unique(['kategori', 'code']);
        });
    }

    public function down(): void
    {
        Schema::table('ref_iwaran_jenis_kes', function (Blueprint $table) {
            $table->dropUnique('ref_iwaran_jenis_kes_kategori_code_unique');
            $table->dropIndex(['code']);
            $table->dropColumn('code');
        });
    }
};
