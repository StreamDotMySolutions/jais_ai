<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{

public function up(): void
{
    Schema::create('api_logs', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')
              ->constrained()
              ->onDelete('cascade');

        $table->string('ai_name', 255)->nullable();
        $table->string('model_name', 255)->nullable();
        $table->string('token', 64)->nullable();
        $table->string('module_name', 255)->nullable();
        $table->unsignedBigInteger('attachment_size')->nullable();
        $table->unsignedInteger('tokens_used')->default(0);
         $table->ipAddress('ip')->nullable();

        $table->timestamp('start_request')->nullable();
        $table->timestamp('end_request')->nullable();

        // Generated column - time taken dalam seconds (decimal)
        $table->decimal('time_taken', 8, 3)->nullable();
        $table->timestamp('request_date')->useCurrent();

        $table->timestamps();
    });
}


    public function down(): void
    {
        Schema::dropIfExists('api_logs');
    }
};
