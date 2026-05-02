<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            if (! Schema::hasColumn('cases', 'laporan_tindakan_auto_emailed_at')) {
                $table->timestamp('laporan_tindakan_auto_emailed_at')
                    ->nullable()
                    ->after('closed_at');
            }
        });

        Schema::create('case_oyds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('name')->nullable();
            $table->string('id_number')->nullable();
            $table->string('investigator_name')->nullable();
            $table->string('file_no')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });

        Schema::create('case_oyd_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_oyd_id')->constrained('case_oyds')->cascadeOnDelete();
            $table->string('category', 30)->nullable();
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

        Schema::create('case_seizure_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('item_no')->nullable();
            $table->text('description')->nullable();
            $table->string('storage')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });

        Schema::create('case_seizure_item_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_seizure_item_id')->constrained('case_seizure_items')->cascadeOnDelete();
            $table->string('category', 50)->default('lain_lain');
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

        Schema::create('case_police_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->string('report_no')->nullable();
            $table->text('description')->nullable();
            $table->string('station')->nullable();
            $table->timestamps();
            $table->softDeletes()->index();
        });

        Schema::create('case_police_report_media', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_police_report_id')->constrained('case_police_reports')->cascadeOnDelete();
            $table->string('category', 50)->default('lain_lain');
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

        $this->backfillFromComplaintDetailTables();
    }

    public function down(): void
    {
        Schema::dropIfExists('case_police_report_media');
        Schema::dropIfExists('case_police_reports');
        Schema::dropIfExists('case_seizure_item_media');
        Schema::dropIfExists('case_seizure_items');
        Schema::dropIfExists('case_oyd_media');
        Schema::dropIfExists('case_oyds');

        Schema::table('cases', function (Blueprint $table) {
            if (Schema::hasColumn('cases', 'laporan_tindakan_auto_emailed_at')) {
                $table->dropColumn('laporan_tindakan_auto_emailed_at');
            }
        });
    }

    private function backfillFromComplaintDetailTables(): void
    {
        if (! Schema::hasTable('case_complaint_links')) {
            return;
        }

        $this->backfillOyds();
        $this->backfillSeizureItems();
        $this->backfillPoliceReports();
        $this->backfillCaseAutoEmailTimestamps();
    }

    private function primaryCaseIdForComplaint(int $complaintId): ?int
    {
        $primary = DB::table('case_complaint_links')
            ->where('complaint_id', $complaintId)
            ->orderByDesc('is_primary')
            ->orderBy('case_id')
            ->value('case_id');

        return $primary ? (int) $primary : null;
    }

    private function backfillOyds(): void
    {
        if (! Schema::hasTable('complaint_oyds')) {
            return;
        }

        DB::table('complaint_oyds')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                $caseId = $this->primaryCaseIdForComplaint((int) $row->complaint_id);
                if (! $caseId) {
                    continue;
                }

                $caseOydId = DB::table('case_oyds')->insertGetId([
                    'case_id' => $caseId,
                    'name' => $row->name,
                    'id_number' => $row->id_number,
                    'investigator_name' => $row->investigator_name,
                    'file_no' => $row->file_no,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                    'deleted_at' => $row->deleted_at ?? null,
                ]);

                if (Schema::hasTable('complaint_oyd_media')) {
                    $mediaRows = DB::table('complaint_oyd_media')
                        ->where('complaint_oyd_id', $row->id)
                        ->get();
                    foreach ($mediaRows as $media) {
                        DB::table('case_oyd_media')->insert([
                            'case_oyd_id' => $caseOydId,
                            'category' => $media->category,
                            'file_name' => $media->file_name,
                            'stored_name' => $media->stored_name,
                            'path' => $media->path,
                            'disk' => $media->disk,
                            'mime' => $media->mime,
                            'size' => $media->size,
                            'uploaded_by_user_id' => $media->uploaded_by_user_id,
                            'created_at' => $media->created_at,
                            'updated_at' => $media->updated_at,
                            'deleted_at' => $media->deleted_at ?? null,
                        ]);
                    }
                }
            }
        });
    }

    private function backfillSeizureItems(): void
    {
        if (! Schema::hasTable('complaint_seizure_items')) {
            return;
        }

        DB::table('complaint_seizure_items')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                $caseId = $this->primaryCaseIdForComplaint((int) $row->complaint_id);
                if (! $caseId) {
                    continue;
                }

                $caseItemId = DB::table('case_seizure_items')->insertGetId([
                    'case_id' => $caseId,
                    'item_no' => $row->item_no,
                    'description' => $row->description,
                    'storage' => $row->storage,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                    'deleted_at' => $row->deleted_at ?? null,
                ]);

                if (Schema::hasTable('complaint_seizure_item_media')) {
                    $mediaRows = DB::table('complaint_seizure_item_media')
                        ->where('complaint_seizure_item_id', $row->id)
                        ->get();
                    foreach ($mediaRows as $media) {
                        DB::table('case_seizure_item_media')->insert([
                            'case_seizure_item_id' => $caseItemId,
                            'category' => $media->category,
                            'file_name' => $media->file_name,
                            'stored_name' => $media->stored_name,
                            'path' => $media->path,
                            'disk' => $media->disk,
                            'mime' => $media->mime,
                            'size' => $media->size,
                            'uploaded_by_user_id' => $media->uploaded_by_user_id,
                            'created_at' => $media->created_at,
                            'updated_at' => $media->updated_at,
                            'deleted_at' => $media->deleted_at ?? null,
                        ]);
                    }
                }
            }
        });
    }

    private function backfillPoliceReports(): void
    {
        if (! Schema::hasTable('complaint_police_reports')) {
            return;
        }

        DB::table('complaint_police_reports')->orderBy('id')->chunkById(200, function ($rows) {
            foreach ($rows as $row) {
                $caseId = $this->primaryCaseIdForComplaint((int) $row->complaint_id);
                if (! $caseId) {
                    continue;
                }

                $caseReportId = DB::table('case_police_reports')->insertGetId([
                    'case_id' => $caseId,
                    'report_no' => $row->report_no,
                    'description' => $row->description,
                    'station' => $row->station,
                    'created_at' => $row->created_at,
                    'updated_at' => $row->updated_at,
                    'deleted_at' => $row->deleted_at ?? null,
                ]);

                if (Schema::hasTable('complaint_police_report_media')) {
                    $mediaRows = DB::table('complaint_police_report_media')
                        ->where('complaint_police_report_id', $row->id)
                        ->get();
                    foreach ($mediaRows as $media) {
                        DB::table('case_police_report_media')->insert([
                            'case_police_report_id' => $caseReportId,
                            'category' => $media->category,
                            'file_name' => $media->file_name,
                            'stored_name' => $media->stored_name,
                            'path' => $media->path,
                            'disk' => $media->disk,
                            'mime' => $media->mime,
                            'size' => $media->size,
                            'uploaded_by_user_id' => $media->uploaded_by_user_id,
                            'created_at' => $media->created_at,
                            'updated_at' => $media->updated_at,
                            'deleted_at' => $media->deleted_at ?? null,
                        ]);
                    }
                }
            }
        });
    }

    private function backfillCaseAutoEmailTimestamps(): void
    {
        if (! Schema::hasColumn('complaints', 'laporan_tindakan_auto_emailed_at')) {
            return;
        }

        DB::table('case_complaint_links')
            ->join('complaints', 'case_complaint_links.complaint_id', '=', 'complaints.id')
            ->whereNotNull('complaints.laporan_tindakan_auto_emailed_at')
            ->orderBy('case_complaint_links.id')
            ->select([
                'case_complaint_links.case_id',
                'complaints.laporan_tindakan_auto_emailed_at',
            ])
            ->chunk(200, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('cases')
                        ->where('id', $row->case_id)
                        ->whereNull('laporan_tindakan_auto_emailed_at')
                        ->update([
                            'laporan_tindakan_auto_emailed_at' => $row->laporan_tindakan_auto_emailed_at,
                        ]);
                }
            });
    }
};
