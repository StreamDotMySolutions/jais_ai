<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_police_report_status')) {
                $table->string('aj_police_report_status')->nullable()->after('aj_seizure_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_police_report_status')) {
                $table->dropColumn('aj_police_report_status');
            }
        });
    }
};

