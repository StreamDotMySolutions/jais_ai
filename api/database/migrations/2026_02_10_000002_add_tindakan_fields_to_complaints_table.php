<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dateTime('aj_directive_at')->nullable()->after('aj_directive_staff_id');
            $table->text('aj_directive_notes')->nullable()->after('aj_directive_at');

            $table->dateTime('handover_at')->nullable()->after('aj_directive_notes');
            $table->text('handover_notes')->nullable()->after('handover_at');

            $table->string('case_register_no')->nullable()->after('handover_notes');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn([
                'aj_directive_at',
                'aj_directive_notes',
                'handover_at',
                'handover_notes',
                'case_register_no',
            ]);
        });
    }
};

