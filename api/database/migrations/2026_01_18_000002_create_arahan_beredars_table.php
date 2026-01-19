<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('arahan_beredars', function (Blueprint $table) {
            $table->id();
            $table->foreignId('staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('created_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('email')->nullable();
            $table->text('location');
            $table->date('incident_date');
            $table->text('other_section')->nullable();
            $table->text('notes')->nullable();
            $table->string('status')->default('draf');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('arahan_beredars');
    }
};
