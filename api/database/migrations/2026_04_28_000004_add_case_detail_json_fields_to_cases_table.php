<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (! Schema::hasColumn('cases', 'seizure_items')) {
                $table->json('seizure_items')->nullable()->after('police_report_status');
            }
        });

        Schema::table('cases', function (Blueprint $table) {
            if (! Schema::hasColumn('cases', 'police_reports')) {
                $table->json('police_reports')->nullable()->after('seizure_items');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (Schema::hasColumn('cases', 'police_reports')) {
                $table->dropColumn('police_reports');
            }
            if (Schema::hasColumn('cases', 'seizure_items')) {
                $table->dropColumn('seizure_items');
            }
        });
    }
};
