<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'approver_confirmed_at')) {
                $table->timestamp('approver_confirmed_at')->nullable()->after('approver_assigned_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'approver_confirmed_at')) {
                $table->dropColumn('approver_confirmed_at');
            }
        });
    }
};
