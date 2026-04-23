<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'borang5_auto_emailed_at')) {
                $table->timestamp('borang5_auto_emailed_at')->nullable()->after('borang5_statement');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'borang5_auto_emailed_at')) {
                $table->dropColumn('borang5_auto_emailed_at');
            }
        });
    }
};

