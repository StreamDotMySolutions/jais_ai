<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table): void {
            if (! Schema::hasColumn('complaints', 'laporan_tindakan_auto_emailed_at')) {
                $table->timestamp('laporan_tindakan_auto_emailed_at')
                    ->nullable()
                    ->after('borang5_auto_emailed_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table): void {
            if (Schema::hasColumn('complaints', 'laporan_tindakan_auto_emailed_at')) {
                $table->dropColumn('laporan_tindakan_auto_emailed_at');
            }
        });
    }
};

