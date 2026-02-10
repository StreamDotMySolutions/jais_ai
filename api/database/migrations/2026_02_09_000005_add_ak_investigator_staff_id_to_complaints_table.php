<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'ak_investigator_staff_id')) {
                $table->foreignId('ak_investigator_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'ak_investigator_staff_id')) {
                $table->dropForeign(['ak_investigator_staff_id']);
                $table->dropColumn('ak_investigator_staff_id');
            }
        });
    }
};

