<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();

            // Polymorphic target: e.g. App\Models\Complaint
            $table->string('auditable_type', 255);
            $table->unsignedBigInteger('auditable_id');

            $table->string('module', 100)->nullable();
            $table->string('event', 50); // created|updated|deleted|...

            $table->string('url', 2048)->nullable();
            $table->string('method', 20)->nullable();
            $table->ipAddress('ip')->nullable();
            $table->text('user_agent')->nullable();

            $table->json('changed_keys')->nullable();
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();

            $table->timestamps();

            $table->index(['auditable_type', 'auditable_id']);
            $table->index(['module', 'event']);
            $table->index(['user_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};

