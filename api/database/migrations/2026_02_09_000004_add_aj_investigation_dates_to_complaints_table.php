<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_ip_due_date')) {
                $table->date('aj_ip_due_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'aj_kpp_due_date')) {
                $table->date('aj_kpp_due_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'aj_jpss_due_date')) {
                $table->date('aj_jpss_due_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'aj_investigation_notes')) {
                $table->text('aj_investigation_notes')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_ip_due_date')) {
                $table->dropColumn('aj_ip_due_date');
            }
            if (Schema::hasColumn('complaints', 'aj_kpp_due_date')) {
                $table->dropColumn('aj_kpp_due_date');
            }
            if (Schema::hasColumn('complaints', 'aj_jpss_due_date')) {
                $table->dropColumn('aj_jpss_due_date');
            }
            if (Schema::hasColumn('complaints', 'aj_investigation_notes')) {
                $table->dropColumn('aj_investigation_notes');
            }
        });
    }
};

