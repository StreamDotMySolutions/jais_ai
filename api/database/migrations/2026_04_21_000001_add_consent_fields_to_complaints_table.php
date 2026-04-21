<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'consent_accepted')) {
                $table->boolean('consent_accepted')->default(false)->after('channel');
            }
            if (! Schema::hasColumn('complaints', 'consent_accepted_at')) {
                $table->timestamp('consent_accepted_at')->nullable()->after('consent_accepted');
            }
            if (! Schema::hasColumn('complaints', 'consent_text_version')) {
                $table->string('consent_text_version', 50)->nullable()->after('consent_accepted_at');
            }
            if (! Schema::hasColumn('complaints', 'consent_ip_address')) {
                $table->string('consent_ip_address', 45)->nullable()->after('consent_text_version');
            }
            if (! Schema::hasColumn('complaints', 'consent_user_agent')) {
                $table->text('consent_user_agent')->nullable()->after('consent_ip_address');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            foreach ([
                'consent_user_agent',
                'consent_ip_address',
                'consent_text_version',
                'consent_accepted_at',
                'consent_accepted',
            ] as $column) {
                if (Schema::hasColumn('complaints', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }
};
