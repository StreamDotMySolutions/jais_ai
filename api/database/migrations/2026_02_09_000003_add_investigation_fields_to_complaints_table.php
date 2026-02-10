<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_supervisor_staff_id')) {
                $table->foreignId('aj_supervisor_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'aj_ip_status')) {
                $table->string('aj_ip_status')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_supervisor_staff_id')) {
                $table->foreignId('ak_supervisor_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_supervisor_staff_id')) {
                $table->dropForeign(['aj_supervisor_staff_id']);
                $table->dropColumn('aj_supervisor_staff_id');
            }
            if (Schema::hasColumn('complaints', 'aj_ip_status')) {
                $table->dropColumn('aj_ip_status');
            }
            if (Schema::hasColumn('complaints', 'ak_supervisor_staff_id')) {
                $table->dropForeign(['ak_supervisor_staff_id']);
                $table->dropColumn('ak_supervisor_staff_id');
            }
        });
    }
};

