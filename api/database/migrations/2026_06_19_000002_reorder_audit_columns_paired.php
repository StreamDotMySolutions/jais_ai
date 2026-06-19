<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        $tables = ['arahan_beredars', 'cases', 'complaints', 'appointments', 'iwaran_warans'];

        foreach ($tables as $table) {
            // Pair each _by_user_id with its timestamp:
            // created_by_user_id, created_at, updated_by_user_id, updated_at, deleted_by_user_id, deleted_at
            DB::statement("ALTER TABLE {$table} MODIFY created_at TIMESTAMP NULL AFTER created_by_user_id");
            DB::statement("ALTER TABLE {$table} MODIFY updated_at TIMESTAMP NULL AFTER updated_by_user_id");
        }
    }

    public function down(): void
    {
    }
};
