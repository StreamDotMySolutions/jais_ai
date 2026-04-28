<?php

namespace App\Services;

use App\Models\Complaint;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class ComplaintReferenceService
{
    public function generateReferenceNo(string $caseType = 'AJ', ?string $districtName = null, ?CarbonInterface $at = null): string
    {
        $now = $at ?: now();
        $year = (int) $now->format('Y');
        $month = $now->format('m');

        $type = $this->normalizeCaseType($caseType);
        $district = trim((string) $districtName) !== '' ? trim((string) $districtName) : 'Tidak Diketahui';
        $district = preg_replace('/\s+/', ' ', $district);
        $district = str_replace('/', '-', $district);
        $prefix = "{$type}-{$district}/{$year}/{$month}/";

        $next = $this->reserveYearlyRunningNumber($year, $type);

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function reserveYearlyRunningNumber(int $year, string $caseType = 'AJ'): int
    {
        $normalizedCaseType = $this->normalizeCaseType($caseType);

        return DB::transaction(function () use ($year, $normalizedCaseType) {
            $now = now();

            $row = DB::table('complaint_reference_sequences')
                ->where('year', $year)
                ->where('case_type', $normalizedCaseType)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $maxExisting = (int) (
                    Complaint::query()
                        ->where('complaint_year', $year)
                        ->where('case_type', $normalizedCaseType)
                        ->whereNotNull('reference_no')
                        ->whereRaw("reference_no REGEXP '[^0-9][0-9]{4}$'")
                        ->max(DB::raw('CAST(RIGHT(reference_no, 4) AS UNSIGNED)'))
                );

                DB::table('complaint_reference_sequences')->insert([
                    'year' => $year,
                    'case_type' => $normalizedCaseType,
                    'last_number' => $maxExisting,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $row = DB::table('complaint_reference_sequences')
                    ->where('year', $year)
                    ->where('case_type', $normalizedCaseType)
                    ->lockForUpdate()
                    ->first();
            }

            $next = ((int) ($row->last_number ?? 0)) + 1;

            DB::table('complaint_reference_sequences')
                ->where('year', $year)
                ->where('case_type', $normalizedCaseType)
                ->update([
                    'last_number' => $next,
                    'updated_at' => $now,
                ]);

            return $next;
        }, 3);
    }

    private function normalizeCaseType(string $caseType): string
    {
        $normalized = strtoupper(trim($caseType) !== '' ? trim($caseType) : 'AJ');

        return in_array($normalized, ['AJ', 'AK'], true) ? $normalized : 'AJ';
    }
}
