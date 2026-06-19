<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('created_ip_address', 45)->nullable()->after('created_by_user_id');
            $table->string('updated_ip_address', 45)->nullable()->after('updated_by_user_id');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn('created_ip_address');
            $table->dropColumn('updated_ip_address');
        });
    }
};
