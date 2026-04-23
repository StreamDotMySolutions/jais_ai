<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_current_status_other')) {
                $table->string('aj_current_status_other')->nullable()->after('aj_current_status');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_current_status_other')) {
                $table->dropColumn('aj_current_status_other');
            }
        });
    }
};

