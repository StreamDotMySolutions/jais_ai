<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('document_jobs', function (Blueprint $table) {
            $table->id();
            $table->integer('user_id')->nullable();  
            $table->integer('api_log_id')->nullable();  
            $table->string('file_name');
            $table->string('file_path');
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->text('result')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('document_jobs');
    }
};
