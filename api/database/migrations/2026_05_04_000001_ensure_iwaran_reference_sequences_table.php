<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('iwaran_reference_sequences')) {
            return;
        }

        Schema::create('iwaran_reference_sequences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('district_id')->constrained('districts')->cascadeOnDelete();
            $table->unsignedSmallInteger('year');
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['district_id', 'year']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iwaran_reference_sequences');
    }
};
