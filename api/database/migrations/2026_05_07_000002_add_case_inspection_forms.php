<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (! Schema::hasColumn('cases', 'inspection_form_status')) {
                $table->string('inspection_form_status', 20)->nullable()->after('police_report_status');
            }
        });

        Schema::create('case_inspection_forms', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('form_no')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });

        Schema::create('case_inspection_form_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_inspection_form_id')->constrained('case_inspection_forms')->cascadeOnDelete();
            $table->string('category', 50)->default('dokumen');
            $table->string('file_name');
            $table->string('stored_name');
            $table->string('path');
            $table->string('disk', 30)->default('local');
            $table->string('mime', 120)->nullable();
            $table->unsignedBigInteger('size')->nullable();
            $table->foreignId('uploaded_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes()->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_inspection_form_media');
        Schema::dropIfExists('case_inspection_forms');

        Schema::table('cases', function (Blueprint $table) {
            if (Schema::hasColumn('cases', 'inspection_form_status')) {
                $table->dropColumn('inspection_form_status');
            }
        });
    }
};
