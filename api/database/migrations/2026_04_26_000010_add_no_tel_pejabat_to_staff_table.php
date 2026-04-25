<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (! Schema::hasColumn('staff', 'no_tel_pejabat')) {
                $table->string('no_tel_pejabat')->nullable()->after('phone');
            }
        });
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (Schema::hasColumn('staff', 'no_tel_pejabat')) {
                $table->dropColumn('no_tel_pejabat');
            }
        });
    }
};

