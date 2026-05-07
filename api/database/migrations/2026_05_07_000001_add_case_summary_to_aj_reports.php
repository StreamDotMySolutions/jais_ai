<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (! Schema::hasColumn('cases', 'case_summary')) {
                $table->text('case_summary')->nullable()->after('report_notes');
            }
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (Schema::hasColumn('cases', 'case_summary')) {
                $table->dropColumn('case_summary');
            }
        });
    }
};
