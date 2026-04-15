<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->unsignedTinyInteger('ak_poligami_marriage_count')->nullable();
            $table->unsignedTinyInteger('ak_poligami_wife_count')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn([
                'ak_poligami_marriage_count',
                'ak_poligami_wife_count',
            ]);
        });
    }
};
