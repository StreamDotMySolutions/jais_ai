<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->string('case_type', 10)->nullable()->index();
            $table->string('case_register_no')->nullable()->unique();
            $table->string('file_no')->nullable();
            $table->unsignedSmallInteger('complaint_year')->nullable();
            $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
            $table->string('district_name')->nullable();

            $table->foreignId('supervisor_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('directive_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('handover_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('arrest_staff_id')->nullable()->constrained('staff')->nullOnDelete();
            $table->foreignId('prosecutor_staff_id')->nullable()->constrained('staff')->nullOnDelete();

            $table->unsignedBigInteger('report_offense_id')->nullable();
            $table->unsignedBigInteger('mahkamah_id')->nullable();

            $table->string('ppa_classification', 20)->nullable();
            $table->string('ip_status')->nullable();
            $table->string('current_status')->nullable();
            $table->string('current_status_other')->nullable();
            $table->string('op_category')->nullable();
            $table->string('op_case_status')->nullable();
            $table->text('op_notes')->nullable();
            $table->string('prosecution_status')->nullable();
            $table->string('arrest_status', 20)->nullable();
            $table->string('arrest_by')->nullable();
            $table->unsignedInteger('male_count')->nullable();
            $table->unsignedInteger('female_count')->nullable();
            $table->unsignedInteger('other_count')->nullable();

            $table->dateTime('directive_at')->nullable();
            $table->dateTime('handover_at')->nullable();
            $table->dateTime('action_datetime')->nullable();
            $table->dateTime('statement_datetime')->nullable();
            $table->date('court_date')->nullable();
            $table->dateTime('opened_at')->nullable();
            $table->dateTime('closed_at')->nullable();

            $table->text('directive_notes')->nullable();
            $table->longText('report_notes')->nullable();
            $table->text('investigation_notes')->nullable();
            $table->text('prosecution_notes')->nullable();
            $table->string('seizure_status', 20)->nullable();
            $table->string('police_report_status', 20)->nullable();
            $table->json('seizure_items')->nullable();
            $table->json('police_reports')->nullable();
            $table->text('fine')->nullable();
            $table->string('fir_no')->nullable();
            $table->json('charge_recommendations')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('case_complaint_links', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            $table->foreignId('complaint_id')->constrained('complaints')->cascadeOnDelete();
            $table->boolean('is_primary')->default(false);
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['case_id', 'complaint_id'], 'case_complaint_links_case_complaint_unique');
            $table->index(['complaint_id', 'is_primary'], 'case_complaint_links_complaint_primary_idx');
        });

        $this->backfillExistingAjCases();
    }

    public function down(): void
    {
        Schema::dropIfExists('case_complaint_links');
        Schema::dropIfExists('cases');
    }

    private function backfillExistingAjCases(): void
    {
        DB::transaction(function () {
            $complaints = DB::table('complaints')
                ->select([
                    'id',
                    'case_type',
                    'case_register_no',
                    'aj_file_no',
                    'complaint_year',
                    'complaint_date',
                    'complaint_time',
                    'district_id',
                    'district_name',
                    'aj_supervisor_staff_id',
                    'aj_directive_staff_id',
                    'aj_handover_staff_id',
                    'aj_arrest_staff_id',
                    'aj_prosecutor_staff_id',
                    'aj_report_offense_id',
                    'aj_mahkamah_id',
                    'aj_ppa_classification',
                    'aj_ip_status',
                    'aj_current_status',
                    'aj_current_status_other',
                    'aj_op_category',
                    'aj_op_case_status',
                    'aj_op_notes',
                    'aj_prosecution_status',
                    'aj_arrest_status',
                    'aj_arrest_by',
                    'aj_male_count',
                    'aj_female_count',
                    'aj_other_count',
                    'aj_directive_at',
                    'handover_at',
                    'aj_action_datetime',
                    'aj_statement_datetime',
                    'aj_court_date',
                    'aj_directive_notes',
                    'aj_report_notes',
                    'aj_investigation_notes',
                    'aj_prosecution_notes',
                    'aj_seizure_status',
                    'aj_police_report_status',
                    'aj_fine',
                    'aj_fir_no',
                    'aj_charge_recommendations',
                    'created_at',
                    'updated_at',
                ])
                ->where('case_type', 'AJ')
                ->whereNotNull('case_register_no')
                ->where('case_register_no', '!=', '')
                ->orderBy('complaint_date')
                ->orderBy('complaint_time')
                ->orderBy('id')
                ->get();

            $runningNumbers = [];
            foreach ($complaints as $complaint) {
                $caseRegisterNo = $this->generateMigratedCaseRegisterNo($complaint, $runningNumbers);
                if ($caseRegisterNo === '') {
                    continue;
                }
                $complaint->case_register_no = $caseRegisterNo;

                $incoming = $this->buildCasePayload($complaint);
                $existing = DB::table('cases')->where('case_register_no', $caseRegisterNo)->first();

                if (! $existing) {
                    $caseId = DB::table('cases')->insertGetId($incoming);
                } else {
                    $caseId = (int) $existing->id;
                    DB::table('cases')
                        ->where('id', $caseId)
                        ->update($this->mergeCasePayload((array) $existing, $incoming));
                }

                DB::table('case_complaint_links')->insertOrIgnore([
                    'case_id' => $caseId,
                    'complaint_id' => (int) $complaint->id,
                    'is_primary' => true,
                    'notes' => 'Backfilled from existing AJ complaint case fields.',
                    'created_at' => $complaint->created_at ?: now(),
                    'updated_at' => now(),
                ]);

                DB::table('complaints')
                    ->where('id', (int) $complaint->id)
                    ->update([
                        'case_register_no' => $caseRegisterNo,
                        'updated_at' => $complaint->updated_at ?: now(),
                    ]);
            }
        }, 3);
    }

    private function generateMigratedCaseRegisterNo(object $complaint, array &$runningNumbers): string
    {
        $caseType = strtoupper(trim((string) ($complaint->case_type ?: 'AJ')));
        $year = (int) ($complaint->complaint_year ?: 0);
        $month = '';

        $date = trim((string) ($complaint->complaint_date ?? ''));
        if ($date !== '') {
            $parts = explode('-', $date);
            if (count($parts) >= 2) {
                $year = $year > 0 ? $year : (int) $parts[0];
                $month = str_pad((string) ((int) $parts[1]), 2, '0', STR_PAD_LEFT);
            }
        }

        if ($year <= 0) {
            $year = (int) date('Y');
        }
        if ($month === '') {
            $month = '01';
        }

        $district = trim((string) ($complaint->district_name ?? ''));
        $district = $district !== '' ? preg_replace('/\s+/', ' ', $district) : 'Tidak Diketahui';
        $district = str_replace('/', '-', $district);

        $key = $caseType . '|' . $year;
        $runningNumbers[$key] = ($runningNumbers[$key] ?? 0) + 1;

        return sprintf('KES-%s/%d/%s/%04d', $district, $year, $month, $runningNumbers[$key]);
    }

    private function buildCasePayload(object $complaint): array
    {
        $createdAt = $complaint->created_at ?: now();
        $openedAt = $complaint->aj_directive_at
            ?: $complaint->aj_action_datetime
            ?: $complaint->created_at;

        return [
            'case_type' => 'AJ',
            'case_register_no' => trim((string) $complaint->case_register_no),
            'file_no' => $this->nullableString($complaint->aj_file_no),
            'complaint_year' => $complaint->complaint_year ? (int) $complaint->complaint_year : null,
            'district_id' => $complaint->district_id ? (int) $complaint->district_id : null,
            'district_name' => $this->nullableString($complaint->district_name),
            'supervisor_staff_id' => $complaint->aj_supervisor_staff_id ? (int) $complaint->aj_supervisor_staff_id : null,
            'directive_staff_id' => $complaint->aj_directive_staff_id ? (int) $complaint->aj_directive_staff_id : null,
            'handover_staff_id' => $complaint->aj_handover_staff_id ? (int) $complaint->aj_handover_staff_id : null,
            'arrest_staff_id' => $complaint->aj_arrest_staff_id ? (int) $complaint->aj_arrest_staff_id : null,
            'prosecutor_staff_id' => $complaint->aj_prosecutor_staff_id ? (int) $complaint->aj_prosecutor_staff_id : null,
            'report_offense_id' => $complaint->aj_report_offense_id ? (int) $complaint->aj_report_offense_id : null,
            'mahkamah_id' => $complaint->aj_mahkamah_id ? (int) $complaint->aj_mahkamah_id : null,
            'ppa_classification' => $this->nullableString($complaint->aj_ppa_classification),
            'ip_status' => $this->nullableString($complaint->aj_ip_status),
            'current_status' => $this->nullableString($complaint->aj_current_status),
            'current_status_other' => $this->nullableString($complaint->aj_current_status_other),
            'op_category' => $this->nullableString($complaint->aj_op_category),
            'op_case_status' => $this->nullableString($complaint->aj_op_case_status),
            'op_notes' => $this->nullableString($complaint->aj_op_notes),
            'prosecution_status' => $this->nullableString($complaint->aj_prosecution_status),
            'arrest_status' => $this->nullableString($complaint->aj_arrest_status),
            'arrest_by' => $this->nullableString($complaint->aj_arrest_by),
            'male_count' => $complaint->aj_male_count !== null ? (int) $complaint->aj_male_count : null,
            'female_count' => $complaint->aj_female_count !== null ? (int) $complaint->aj_female_count : null,
            'other_count' => $complaint->aj_other_count !== null ? (int) $complaint->aj_other_count : null,
            'directive_at' => $complaint->aj_directive_at,
            'handover_at' => $complaint->handover_at,
            'action_datetime' => $complaint->aj_action_datetime,
            'statement_datetime' => $complaint->aj_statement_datetime,
            'court_date' => $complaint->aj_court_date,
            'opened_at' => $openedAt,
            'closed_at' => null,
            'directive_notes' => $this->nullableString($complaint->aj_directive_notes),
            'report_notes' => $this->nullableString($complaint->aj_report_notes),
            'investigation_notes' => $this->nullableString($complaint->aj_investigation_notes),
            'prosecution_notes' => $this->nullableString($complaint->aj_prosecution_notes),
            'seizure_status' => $this->nullableString($complaint->aj_seizure_status),
            'police_report_status' => $this->nullableString($complaint->aj_police_report_status),
            'fine' => $this->nullableString($complaint->aj_fine),
            'fir_no' => $this->nullableString($complaint->aj_fir_no),
            'charge_recommendations' => $complaint->aj_charge_recommendations,
            'created_at' => $createdAt,
            'updated_at' => $complaint->updated_at ?: $createdAt,
            'deleted_at' => null,
        ];
    }

    private function mergeCasePayload(array $existing, array $incoming): array
    {
        $updates = [];

        foreach ($incoming as $key => $value) {
            if (in_array($key, ['case_register_no', 'created_at', 'deleted_at'], true)) {
                continue;
            }

            $existingValue = $existing[$key] ?? null;
            if ($this->isBlankValue($existingValue) && ! $this->isBlankValue($value)) {
                $updates[$key] = $value;
            }
        }

        $updates['updated_at'] = now();

        return $updates;
    }

    private function nullableString($value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    private function isBlankValue($value): bool
    {
        if ($value === null) {
            return true;
        }

        if (is_string($value)) {
            return trim($value) === '';
        }

        return false;
    }
};
