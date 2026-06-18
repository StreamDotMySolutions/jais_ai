<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            if (! Schema::hasColumn('appointments', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('arahan_beredars', function (Blueprint $table) {
            if (! Schema::hasColumn('arahan_beredars', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('arahan_beredar_oyds', function (Blueprint $table) {
            if (! Schema::hasColumn('arahan_beredar_oyds', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('arahan_beredar_oyds_media', function (Blueprint $table) {
            if (! Schema::hasColumn('arahan_beredar_oyds_media', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('iwaran_warans', function (Blueprint $table) {
            if (! Schema::hasColumn('iwaran_warans', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('iwaran_waran_attachments', function (Blueprint $table) {
            if (! Schema::hasColumn('iwaran_waran_attachments', 'deleted_at')) {
                $table->softDeletes();
            }
        });

        Schema::table('iwaran_court_documents', function (Blueprint $table) {
            if (! Schema::hasColumn('iwaran_court_documents', 'deleted_at')) {
                $table->softDeletes();
            }
        });
    }

    public function down(): void
    {
        Schema::table('iwaran_court_documents', function (Blueprint $table) {
            if (Schema::hasColumn('iwaran_court_documents', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('iwaran_waran_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('iwaran_waran_attachments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('iwaran_warans', function (Blueprint $table) {
            if (Schema::hasColumn('iwaran_warans', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('arahan_beredar_oyds_media', function (Blueprint $table) {
            if (Schema::hasColumn('arahan_beredar_oyds_media', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('arahan_beredar_oyds', function (Blueprint $table) {
            if (Schema::hasColumn('arahan_beredar_oyds', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('arahan_beredars', function (Blueprint $table) {
            if (Schema::hasColumn('arahan_beredars', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });

        Schema::table('appointments', function (Blueprint $table) {
            if (Schema::hasColumn('appointments', 'deleted_at')) {
                $table->dropSoftDeletes();
            }
        });
    }
};
