<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'pic_user_id')) {
                $table->foreignId('pic_user_id')->nullable()->constrained('users')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'pic_assigned_at')) {
                $table->timestamp('pic_assigned_at')->nullable()->after('pic_user_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'pic_user_id')) {
                $table->dropForeign(['pic_user_id']);
                $table->dropColumn('pic_user_id');
            }
            if (Schema::hasColumn('complaints', 'pic_assigned_at')) {
                $table->dropColumn('pic_assigned_at');
            }
        });
    }
};
