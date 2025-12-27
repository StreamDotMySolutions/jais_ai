<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'submitted_by_user_id')) {
                $table->foreignId('submitted_by_user_id')->nullable()
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'submitted_by_user_id')) {
                $table->dropForeign(['submitted_by_user_id']);
                $table->dropColumn('submitted_by_user_id');
            }
        });
    }
};
