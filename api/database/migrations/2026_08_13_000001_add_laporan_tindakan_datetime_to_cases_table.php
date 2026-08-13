<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The actual date/time the enforcement action took place (at the location).
     * Kept separate from `action_datetime`, which records when the report was
     * registered. Nullable so existing cases stay empty until re-saved.
     */
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dateTime('laporan_tindakan_datetime')->nullable()->after('action_datetime');
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropColumn('laporan_tindakan_datetime');
        });
    }
};
