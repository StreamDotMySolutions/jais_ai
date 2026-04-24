<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('complaints', 'ak_event_location') && !Schema::hasColumn('complaints', 'current_address')) {
            DB::statement('ALTER TABLE `complaints` RENAME COLUMN `ak_event_location` TO `current_address`');
        }
    }

    public function down(): void
    {
        if (Schema::hasColumn('complaints', 'current_address') && !Schema::hasColumn('complaints', 'ak_event_location')) {
            DB::statement('ALTER TABLE `complaints` RENAME COLUMN `current_address` TO `ak_event_location`');
        }
    }
};

