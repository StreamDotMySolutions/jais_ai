<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaint_attachments', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_attachments', 'title')) {
                $table->string('title')->nullable()->after('category');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaint_attachments', function (Blueprint $table) {
            if (Schema::hasColumn('complaint_attachments', 'title')) {
                $table->dropColumn('title');
            }
        });
    }
};
