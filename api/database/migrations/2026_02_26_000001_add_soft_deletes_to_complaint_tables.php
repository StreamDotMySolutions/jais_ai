<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });

        Schema::table('complaint_oyds', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_oyds', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });

        Schema::table('complaint_seizure_items', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_seizure_items', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });

        Schema::table('complaint_oyd_media', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_oyd_media', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });

        Schema::table('complaint_seizure_item_media', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_seizure_item_media', 'deleted_at')) {
                $table->softDeletes()->index();
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('complaint_oyds', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_oyds', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('complaint_seizure_items', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_seizure_items', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('complaint_oyd_media', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_oyd_media', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('complaint_seizure_item_media', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_seizure_item_media', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};

