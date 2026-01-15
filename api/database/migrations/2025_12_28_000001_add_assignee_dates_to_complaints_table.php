<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'received_at')) {
                $table->timestamp('received_at')->nullable()->after('received_by_user_id');
            }
            if (! Schema::hasColumn('complaints', 'approver_assigned_at')) {
                $table->timestamp('approver_assigned_at')->nullable()->after('approver_staff_id');
            }
            if (! Schema::hasColumn('complaints', 'approver_confirmed_at')) {
                $table->timestamp('approver_confirmed_at')->nullable()->after('approver_assigned_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'approver_assigned_at')) {
                $table->dropColumn('approver_assigned_at');
            }
            if (Schema::hasColumn('complaints', 'approver_confirmed_at')) {
                $table->dropColumn('approver_confirmed_at');
            }
            if (Schema::hasColumn('complaints', 'received_at')) {
                $table->dropColumn('received_at');
            }
        });
    }
};
