<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // arahan_beredars: move created_by_user_id, updated_by_user_id, deleted_by_user_id
        // after status (currently at pos 3,4,5 — want them after status at pos 11)
        DB::statement('ALTER TABLE arahan_beredars MODIFY created_by_user_id BIGINT UNSIGNED NULL AFTER status');
        DB::statement('ALTER TABLE arahan_beredars MODIFY updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id');
        DB::statement('ALTER TABLE arahan_beredars MODIFY deleted_by_user_id BIGINT UNSIGNED NULL AFTER updated_by_user_id');

        // cases: move created_by_user_id, updated_by_user_id, deleted_by_user_id
        // after charge_recommendations (currently at pos 8,9,10 — want them after charge_recommendations at pos 51)
        DB::statement('ALTER TABLE cases MODIFY created_by_user_id BIGINT UNSIGNED NULL AFTER charge_recommendations');
        DB::statement('ALTER TABLE cases MODIFY updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id');
        DB::statement('ALTER TABLE cases MODIFY deleted_by_user_id BIGINT UNSIGNED NULL AFTER updated_by_user_id');

        // complaints: move created_by_user_id, updated_by_user_id, deleted_by_user_id,
        // created_at, updated_at to the end after ak_prosecution_charges
        DB::statement('ALTER TABLE complaints MODIFY created_by_user_id BIGINT UNSIGNED NULL AFTER ak_prosecution_charges');
        DB::statement('ALTER TABLE complaints MODIFY updated_by_user_id BIGINT UNSIGNED NULL AFTER created_by_user_id');
        DB::statement('ALTER TABLE complaints MODIFY deleted_by_user_id BIGINT UNSIGNED NULL AFTER updated_by_user_id');
        DB::statement('ALTER TABLE complaints MODIFY created_at TIMESTAMP NULL AFTER deleted_by_user_id');
        DB::statement('ALTER TABLE complaints MODIFY updated_at TIMESTAMP NULL AFTER created_at');
    }

    public function down(): void
    {
        // Reverting column order is not supported.
        // Restore from backup if needed.
    }
};
