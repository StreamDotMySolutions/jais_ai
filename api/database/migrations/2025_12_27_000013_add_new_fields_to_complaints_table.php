<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'complainant_name')) {
                $table->string('complainant_name')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'district_name')) {
                $table->string('district_name')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'summary')) {
                $table->text('summary')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'complaint_year')) {
                $table->unsignedSmallInteger('complaint_year')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'complaint_date')) {
                $table->date('complaint_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'complaint_time')) {
                $table->time('complaint_time')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'channel')) {
                $table->string('channel')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'complainant_name')) {
                $table->dropColumn('complainant_name');
            }
            if (Schema::hasColumn('complaints', 'district_name')) {
                $table->dropColumn('district_name');
            }
            if (Schema::hasColumn('complaints', 'summary')) {
                $table->dropColumn('summary');
            }
            if (Schema::hasColumn('complaints', 'complaint_year')) {
                $table->dropColumn('complaint_year');
            }
            if (Schema::hasColumn('complaints', 'complaint_date')) {
                $table->dropColumn('complaint_date');
            }
            if (Schema::hasColumn('complaints', 'complaint_time')) {
                $table->dropColumn('complaint_time');
            }
            if (Schema::hasColumn('complaints', 'channel')) {
                $table->dropColumn('channel');
            }
        });
    }
};
