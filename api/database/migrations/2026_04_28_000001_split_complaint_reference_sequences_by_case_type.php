<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaint_reference_sequences', function (Blueprint $table) {
            if (! Schema::hasColumn('complaint_reference_sequences', 'case_type')) {
                $table->string('case_type', 10)->default('AJ')->after('year');
            }
        });

        Schema::table('complaint_reference_sequences', function (Blueprint $table) {
            $table->dropUnique('complaint_reference_sequences_year_unique');
            $table->unique(['year', 'case_type'], 'complaint_reference_sequences_year_case_type_unique');
        });

        DB::transaction(function () {
            $complaints = DB::table('complaints')
                ->select([
                    'id',
                    'reference_no',
                    'case_type',
                    'complaint_year',
                    'complaint_date',
                    'district_name',
                    'created_at',
                ])
                ->orderBy('id')
                ->get();

            if ($complaints->isEmpty()) {
                DB::table('complaint_reference_sequences')->delete();
                return;
            }

            foreach ($complaints as $row) {
                DB::table('complaints')
                    ->where('id', $row->id)
                    ->update([
                        'reference_no' => sprintf('TMP-REF-%08d', (int) $row->id),
                    ]);
            }

            $grouped = $complaints
                ->groupBy(function ($row) {
                    $caseType = strtoupper(trim((string) ($row->case_type ?: 'AJ')));
                    $year = $this->resolveYear($row->complaint_year, $row->complaint_date, $row->created_at);
                    return $caseType . '|' . $year;
                })
                ->sortKeys();

            $sequenceRows = [];
            foreach ($grouped as $groupKey => $rows) {
                [$caseType, $year] = explode('|', (string) $groupKey, 2);
                $resolvedYear = (int) $year;
                $orderedRows = $this->sortRowsForRewrite($rows);
                $counter = 0;

                foreach ($orderedRows as $row) {
                    $counter++;
                    $referenceNo = $this->formatComplaintReferenceNo(
                        $caseType,
                        $this->normalizeDistrictName($row->district_name),
                        $resolvedYear,
                        $this->resolveMonth($row->complaint_date, $row->created_at),
                        $counter
                    );

                    DB::table('complaints')
                        ->where('id', $row->id)
                        ->update([
                            'reference_no' => $referenceNo,
                            'case_type' => $caseType,
                            'complaint_year' => $resolvedYear,
                        ]);
                }

                $sequenceRows[] = [
                    'year' => $resolvedYear,
                    'case_type' => $caseType,
                    'last_number' => $counter,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            DB::table('complaint_reference_sequences')->delete();
            if (! empty($sequenceRows)) {
                DB::table('complaint_reference_sequences')->insert($sequenceRows);
            }
        }, 3);
    }

    public function down(): void
    {
        Schema::table('complaint_reference_sequences', function (Blueprint $table) {
            $table->dropUnique('complaint_reference_sequences_year_case_type_unique');
            $table->dropColumn('case_type');
            $table->unique('year');
        });
    }

    private function sortRowsForRewrite(Collection $rows): Collection
    {
        return $rows->sort(function ($a, $b) {
            $aSuffix = $this->extractRunningSuffix($a->reference_no);
            $bSuffix = $this->extractRunningSuffix($b->reference_no);

            if ($aSuffix !== $bSuffix) {
                return $aSuffix <=> $bSuffix;
            }

            $aDate = strtotime((string) ($a->complaint_date ?: $a->created_at ?: '')) ?: 0;
            $bDate = strtotime((string) ($b->complaint_date ?: $b->created_at ?: '')) ?: 0;
            if ($aDate !== $bDate) {
                return $aDate <=> $bDate;
            }

            return ((int) $a->id) <=> ((int) $b->id);
        })->values();
    }

    private function extractRunningSuffix(?string $referenceNo): int
    {
        $referenceNo = trim((string) $referenceNo);
        if ($referenceNo !== '' && preg_match('/(\d{4})$/', $referenceNo, $matches)) {
            return (int) $matches[1];
        }

        return 0;
    }

    private function normalizeDistrictName(?string $districtName): string
    {
        $district = trim((string) $districtName);
        if ($district === '') {
            $district = 'Tidak Diketahui';
        }

        $district = preg_replace('/\s+/', ' ', $district);
        return str_replace('/', '-', $district);
    }

    private function resolveMonth($complaintDate, $createdAt): string
    {
        $dateString = trim((string) ($complaintDate ?: $createdAt ?: ''));
        if ($dateString !== '' && preg_match('/^\d{4}-(\d{2})-\d{2}/', $dateString, $matches)) {
            return $matches[1];
        }

        return '01';
    }

    private function resolveYear($complaintYear, $complaintDate, $createdAt): int
    {
        $year = (int) ($complaintYear ?: 0);
        if ($year > 0) {
            return $year;
        }

        $dateString = trim((string) ($complaintDate ?: $createdAt ?: ''));
        if ($dateString !== '' && preg_match('/^(\d{4})-\d{2}-\d{2}/', $dateString, $matches)) {
            return (int) $matches[1];
        }

        return (int) now()->format('Y');
    }

    private function formatComplaintReferenceNo(string $caseType, string $districtName, int $year, string $month, int $runningNo): string
    {
        return sprintf(
            '%s-%s/%d/%s/%04d',
            strtoupper(trim($caseType) !== '' ? $caseType : 'AJ'),
            $districtName,
            $year,
            $month,
            $runningNo
        );
    }
};
