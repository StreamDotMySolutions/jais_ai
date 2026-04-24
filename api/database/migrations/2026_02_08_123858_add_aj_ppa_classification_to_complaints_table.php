<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_ppa_classification')) {
                // PPA classification: FNA/KIV/NFA/OP (AJ only)
                $table->string('aj_ppa_classification', 10)->nullable()->after('aj_notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_ppa_classification')) {
                $table->dropColumn('aj_ppa_classification');
            }
        });
    }
};
