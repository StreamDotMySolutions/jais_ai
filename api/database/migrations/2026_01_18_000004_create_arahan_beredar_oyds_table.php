<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arahan_beredar_oyds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('arahan_beredar_id')->constrained('arahan_beredars')->cascadeOnDelete();
            $table->string('name');
            $table->string('ic_number')->nullable();
            $table->string('phone')->nullable();
            $table->text('address')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arahan_beredar_oyds');
    }
};
