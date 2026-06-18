<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            if (! Schema::hasColumn('iwaran_warans', 'created_by_user_id')) {
                $table->foreignId('created_by_user_id')
                    ->nullable()
                    ->after('pendaftar_staff_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('iwaran_warans', 'updated_by_user_id')) {
                $table->foreignId('updated_by_user_id')
                    ->nullable()
                    ->after('created_by_user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('iwaran_warans', 'deleted_by_user_id')) {
                $table->foreignId('deleted_by_user_id')
                    ->nullable()
                    ->after('updated_by_user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            if (Schema::hasColumn('iwaran_warans', 'deleted_by_user_id')) {
                $table->dropForeign(['deleted_by_user_id']);
                $table->dropColumn('deleted_by_user_id');
            }

            if (Schema::hasColumn('iwaran_warans', 'updated_by_user_id')) {
                $table->dropForeign(['updated_by_user_id']);
                $table->dropColumn('updated_by_user_id');
            }

            if (Schema::hasColumn('iwaran_warans', 'created_by_user_id')) {
                $table->dropForeign(['created_by_user_id']);
                $table->dropColumn('created_by_user_id');
            }
        });
    }
};
