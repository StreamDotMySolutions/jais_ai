<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_payload')) {
                $table->json('aj_payload')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_payload')) {
                $table->json('ak_payload')->nullable();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_payload')) {
                $table->dropColumn('aj_payload');
            }
            if (Schema::hasColumn('complaints', 'ak_payload')) {
                $table->dropColumn('ak_payload');
            }
        });
    }
};
