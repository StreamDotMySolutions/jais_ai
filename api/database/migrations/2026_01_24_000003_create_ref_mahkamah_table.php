<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ref_mahkamah', function (Blueprint $table) {
            $table->id();
            $table->string('nama', 255)->unique();
            $table->foreignId('daerah_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->string('emel')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ref_mahkamah');
    }
};
