<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('aj_arrest_status', 20)->nullable();
            $table->unsignedInteger('aj_male_count')->nullable();
            $table->unsignedInteger('aj_female_count')->nullable();
            $table->string('aj_report_no')->nullable();
            $table->dateTime('aj_action_datetime')->nullable();
            $table->unsignedBigInteger('aj_report_offense_id')->nullable();
            $table->string('aj_arrest_by')->nullable();
            $table->dateTime('aj_statement_datetime')->nullable();
            $table->date('aj_court_date')->nullable();
            $table->text('aj_report_notes')->nullable();
            $table->foreignId('aj_directive_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->string('aj_seizure_status', 20)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropForeign(['aj_directive_staff_id']);
            $table->dropColumn([
                'aj_arrest_status',
                'aj_male_count',
                'aj_female_count',
                'aj_report_no',
                'aj_action_datetime',
                'aj_report_offense_id',
                'aj_arrest_by',
                'aj_statement_datetime',
                'aj_court_date',
                'aj_report_notes',
                'aj_directive_staff_id',
                'aj_seizure_status',
            ]);
        });
    }
};
