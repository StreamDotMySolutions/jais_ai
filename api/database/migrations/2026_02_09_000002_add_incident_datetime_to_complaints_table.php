<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            // Separate incident datetime from complaint submission/record datetime.
            // Keep nullable for legacy rows; UI can require for new records.
            $table->date('incident_date')->nullable()->after('complaint_time');
            $table->time('incident_time')->nullable()->after('incident_date');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn(['incident_date', 'incident_time']);
        });
    }
};

