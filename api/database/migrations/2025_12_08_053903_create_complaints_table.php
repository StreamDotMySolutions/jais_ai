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
           
            $table->string('name')->nullable();
            $table->string('occupation')->nullable();
            $table->string('identification_number')->nullable();
            $table->string('identification_type')->nullable(); 
            $table->string('contact_number')->nullable();
            $table->text('address')->nullable();
            $table->text('contents')->nullable();

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
