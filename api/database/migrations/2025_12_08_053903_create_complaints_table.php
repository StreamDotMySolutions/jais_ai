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
        Schema::create('complaints', function (Blueprint $table) {
            $table->id();
            $table->string('reference_no')->nullable()->unique();
            $table->string('case_type')->nullable(); // AJ | AK
            $table->unsignedSmallInteger('complaint_year');
            $table->date('complaint_date');
            $table->time('complaint_time');
            $table->string('complainant_name');
            $table->string('identification_number');
            $table->string('contact_number');
            $table->text('address');
            $table->string('district_name')->nullable();
            $table->text('summary');
            $table->string('channel')->default('web'); // telegram / whatsapp / web

            $table->foreignId('submitted_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->foreignId('classification_id')->nullable()->constrained('complaint_classifications')->nullOnDelete();
            $table->foreignId('status_id')->nullable()->constrained('complaint_statuses')->nullOnDelete();
            $table->string('current_stage')->default('baru');
            $table->timestamp('submitted_at')->nullable();

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
