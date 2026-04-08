<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_current_status')) {
                $table->string('aj_current_status')->nullable()->after('aj_ppa_classification');
            }
            if (! Schema::hasColumn('complaints', 'aj_op_category')) {
                $table->string('aj_op_category')->nullable()->after('aj_current_status');
            }
            if (! Schema::hasColumn('complaints', 'aj_op_case_status')) {
                $table->string('aj_op_case_status')->nullable()->after('aj_op_category');
            }
            if (! Schema::hasColumn('complaints', 'aj_op_notes')) {
                $table->text('aj_op_notes')->nullable()->after('aj_op_case_status');
            }
            if (! Schema::hasColumn('complaints', 'aj_file_no')) {
                $table->string('aj_file_no')->nullable()->after('aj_op_notes');
            }
        });

        Schema::create('complaint_action_updates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->unsignedInteger('sort_order')->default(1);
            $table->string('classification', 10)->nullable();
            $table->date('action_date')->nullable();
            $table->string('action_time', 10)->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_action_updates');

        Schema::table('complaints', function (Blueprint $table) {
            foreach (['aj_current_status', 'aj_op_category', 'aj_op_case_status', 'aj_op_notes', 'aj_file_no'] as $column) {
                if (Schema::hasColumn('complaints', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
