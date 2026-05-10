<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('iwaran_court_documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('iwaran_waran_id')->constrained('iwaran_warans')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('file_name');
            $table->string('disk', 20)->default('local');
            $table->string('path');
            $table->string('mime', 100)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->timestamps();

            $table->index(['iwaran_waran_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('iwaran_court_documents');
    }
};
