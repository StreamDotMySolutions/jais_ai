<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('aj_prosecution_status')->nullable()->after('aj_investigation_notes');
            $table->foreignId('aj_prosecutor_staff_id')
                ->nullable()
                ->after('aj_prosecution_status')
                ->constrained('staff')
                ->nullOnDelete();
            $table->foreignId('aj_mahkamah_id')
                ->nullable()
                ->after('aj_prosecutor_staff_id')
                ->constrained('ref_mahkamah')
                ->nullOnDelete();
            $table->text('aj_fine')->nullable()->after('aj_mahkamah_id');
            $table->text('aj_prosecution_notes')->nullable()->after('aj_fine');
            $table->string('aj_fir_no')->nullable()->after('aj_prosecution_notes');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropConstrainedForeignId('aj_mahkamah_id');
            $table->dropConstrainedForeignId('aj_prosecutor_staff_id');
            $table->dropColumn([
                'aj_prosecution_status',
                'aj_fine',
                'aj_prosecution_notes',
                'aj_fir_no',
            ]);
        });
    }
};

