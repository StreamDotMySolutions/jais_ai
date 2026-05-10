<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->string('current_stage', 40)->default('baru')->after('status');
            $table->foreignId('sent_to_district_by_user_id')->nullable()->after('current_stage')->constrained('users')->nullOnDelete();
            $table->dateTime('sent_to_district_at')->nullable()->after('sent_to_district_by_user_id');
            $table->foreignId('received_by_user_id')->nullable()->after('sent_to_district_at')->constrained('users')->nullOnDelete();
            $table->dateTime('received_at')->nullable()->after('received_by_user_id');
        });

        DB::table('iwaran_warans')
            ->whereNull('current_stage')
            ->update(['current_stage' => 'baru']);
    }

    public function down(): void
    {
        Schema::table('iwaran_warans', function (Blueprint $table) {
            $table->dropConstrainedForeignId('received_by_user_id');
            $table->dropColumn('received_at');
            $table->dropColumn('sent_to_district_at');
            $table->dropConstrainedForeignId('sent_to_district_by_user_id');
            $table->dropColumn('current_stage');
        });
    }
};
