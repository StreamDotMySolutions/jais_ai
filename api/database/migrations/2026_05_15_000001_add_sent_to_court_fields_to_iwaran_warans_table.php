<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->foreignId('sent_to_court_by_user_id')
                ->nullable()
                ->after('received_at')
                ->constrained('users')
                ->nullOnDelete();
            $table->dateTime('sent_to_court_at')
                ->nullable()
                ->after('sent_to_court_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('sent_to_court_by_user_id');
            $table->dropColumn('sent_to_court_at');
        });
    }
};
