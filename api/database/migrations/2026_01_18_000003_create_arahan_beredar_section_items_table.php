<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arahan_beredar_section_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arahan_beredar_id')->constrained('arahan_beredars')->cascadeOnDelete();
            $table->foreignId('section_id')->constrained('ref_arahan_beredar_sections')->cascadeOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arahan_beredar_section_items');
    }
};
