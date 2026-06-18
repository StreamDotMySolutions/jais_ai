<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('arahan_beredars', function (Blueprint $table) {
            if (! Schema::hasColumn('arahan_beredars', 'updated_by_user_id')) {
                $table->foreignId('updated_by_user_id')
                    ->nullable()
                    ->after('created_by_user_id')
                    ->constrained('users')
                    ->nullOnDelete();
            }

            if (! Schema::hasColumn('arahan_beredars', 'deleted_by_user_id')) {
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
        Schema::table('arahan_beredars', function (Blueprint $table) {
            if (Schema::hasColumn('arahan_beredars', 'deleted_by_user_id')) {
                $table->dropForeign(['deleted_by_user_id']);
                $table->dropColumn('deleted_by_user_id');
            }

            if (Schema::hasColumn('arahan_beredars', 'updated_by_user_id')) {
                $table->dropForeign(['updated_by_user_id']);
                $table->dropColumn('updated_by_user_id');
            }
        });
    }
};
