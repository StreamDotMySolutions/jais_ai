<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_handover_staff_id')) {
                $table->foreignId('aj_handover_staff_id')->nullable()->after('aj_directive_staff_id')->constrained('staff')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_handover_staff_id')) {
                $table->dropConstrainedForeignId('aj_handover_staff_id');
            }
        });
    }
};
