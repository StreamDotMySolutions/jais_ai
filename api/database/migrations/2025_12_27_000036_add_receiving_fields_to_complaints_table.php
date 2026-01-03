<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'received_by_user_id')) {
                $table->foreignId('received_by_user_id')->nullable()
                    ->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'approver_staff_id')) {
                $table->foreignId('approver_staff_id')->nullable()
                    ->constrained('staff')->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'approver_staff_id')) {
                $table->dropForeign(['approver_staff_id']);
                $table->dropColumn('approver_staff_id');
            }
            if (Schema::hasColumn('complaints', 'received_by_user_id')) {
                $table->dropForeign(['received_by_user_id']);
                $table->dropColumn('received_by_user_id');
            }
        });
    }
};
