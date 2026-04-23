<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaint_police_report_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('complaint_police_report_id')->constrained('complaint_police_reports')->cascadeOnDelete();
            $table->string('category', 50)->default('lain_lain');
            $table->string('file_name');
            $table->string('stored_name');
            $table->string('path');
            $table->string('disk', 30)->default('local');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaint_police_report_media');
    }
};

