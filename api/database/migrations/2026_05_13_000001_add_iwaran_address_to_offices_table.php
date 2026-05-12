<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            if (! Schema::hasColumn('offices', 'iwaran_address')) {
                $table->text('iwaran_address')->nullable()->after('address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            if (Schema::hasColumn('offices', 'iwaran_address')) {
                $table->dropColumn('iwaran_address');
            }
        });
    }
};
