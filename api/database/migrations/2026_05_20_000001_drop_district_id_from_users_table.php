<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasColumn('users', 'district_id')) {
            return;
        }

        $database = DB::getDatabaseName();

        $foreignKeys = DB::table('information_schema.KEY_COLUMN_USAGE')
            ->select('CONSTRAINT_NAME')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', 'users')
            ->where('COLUMN_NAME', 'district_id')
            ->whereNotNull('REFERENCED_TABLE_NAME')
            ->pluck('CONSTRAINT_NAME');

        foreach ($foreignKeys as $foreignKey) {
            DB::statement(sprintf(
                'ALTER TABLE `users` DROP FOREIGN KEY `%s`',
                str_replace('`', '``', (string) $foreignKey)
            ));
        }

        $indexes = DB::table('information_schema.STATISTICS')
            ->select('INDEX_NAME')
            ->where('TABLE_SCHEMA', $database)
            ->where('TABLE_NAME', 'users')
            ->where('COLUMN_NAME', 'district_id')
            ->where('INDEX_NAME', '!=', 'PRIMARY')
            ->pluck('INDEX_NAME')
            ->unique()
            ->values();

        foreach ($indexes as $indexName) {
            DB::statement(sprintf(
                'ALTER TABLE `users` DROP INDEX `%s`',
                str_replace('`', '``', (string) $indexName)
            ));
        }

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('district_id');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('users', 'district_id')) {
            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unsignedBigInteger('district_id')->nullable()->after('office_type');
            $table->foreign('district_id')->references('id')->on('districts')->nullOnDelete();
        });
    }
};
