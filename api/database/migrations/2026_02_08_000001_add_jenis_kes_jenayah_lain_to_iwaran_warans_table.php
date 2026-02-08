<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->string('jenis_kes_jenayah_lain')->nullable()->after('jenis_kes_jenayah_id');
        });
    }

    public function down(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->dropColumn('jenis_kes_jenayah_lain');
        });
    }
};

