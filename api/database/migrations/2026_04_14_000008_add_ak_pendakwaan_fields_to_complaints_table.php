<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'ak_prosecution_status')) {
                $table->string('ak_prosecution_status')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_prosecutor_staff_id')) {
                $table->unsignedBigInteger('ak_prosecutor_staff_id')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_hearing_date')) {
                $table->date('ak_hearing_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_mahkamah_id')) {
                $table->unsignedBigInteger('ak_mahkamah_id')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_court_decision')) {
                $table->text('ak_court_decision')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_prosecution_notes')) {
                $table->text('ak_prosecution_notes')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_prosecution_charges')) {
                $table->json('ak_prosecution_charges')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            foreach ([
                'ak_prosecution_charges',
                'ak_prosecution_notes',
                'ak_court_decision',
                'ak_mahkamah_id',
                'ak_hearing_date',
                'ak_prosecutor_staff_id',
                'ak_prosecution_status',
            ] as $column) {
                if (Schema::hasColumn('complaints', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
