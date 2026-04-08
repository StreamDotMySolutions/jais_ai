<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'informant_name')) {
                $table->string('informant_name')->nullable()->after('contact_number');
            }
            if (! Schema::hasColumn('complaints', 'informant_identification_number')) {
                $table->string('informant_identification_number')->nullable()->after('informant_name');
            }
            if (! Schema::hasColumn('complaints', 'informant_contact_number')) {
                $table->string('informant_contact_number')->nullable()->after('informant_identification_number');
            }
            if (! Schema::hasColumn('complaints', 'complainant_occupation')) {
                $table->string('complainant_occupation')->nullable()->after('informant_contact_number');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            foreach ([
                'complainant_occupation',
                'informant_contact_number',
                'informant_identification_number',
                'informant_name',
            ] as $column) {
                if (Schema::hasColumn('complaints', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
