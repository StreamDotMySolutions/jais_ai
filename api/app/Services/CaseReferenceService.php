<?php

namespace App\Services;

use App\Models\CaseRecord;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class CaseReferenceService
{
    public function generateCaseRegisterNo(string $caseType = 'AJ', ?string $districtName = null, ?CarbonInterface $at = null): string
    {
        $now = $at ?: now();
        $year = (int) $now->format('Y');
        $month = $now->format('m');
        $type = $this->normalizeCaseType($caseType);
        $district = $this->normalizeDistrictName($districtName);

        $next = $this->reserveYearlyRunningNumber($year, $type);

        return sprintf('KES-%s/%d/%s/%04d', $district, $year, $month, $next);
    }

    public function reserveYearlyRunningNumber(int $year, string $caseType = 'AJ'): int
    {
        $normalizedCaseType = $this->normalizeCaseType($caseType);

        return DB::transaction(function () use ($year, $normalizedCaseType) {
            $now = now();

            $row = DB::table('case_reference_sequences')
                ->where('year', $year)
                ->where('case_type', $normalizedCaseType)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $maxExisting = (int) (
                    CaseRecord::query()
                        ->where('complaint_year', $year)
                        ->where('case_type', $normalizedCaseType)
                        ->whereNotNull('case_register_no')
                        ->whereRaw("case_register_no REGEXP '[^0-9][0-9]{4}$'")
                        ->max(DB::raw('CAST(RIGHT(case_register_no, 4) AS UNSIGNED)'))
                );

                DB::table('case_reference_sequences')->insert([
                    'year' => $year,
                    'case_type' => $normalizedCaseType,
                    'last_number' => $maxExisting,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $row = DB::table('case_reference_sequences')
                    ->where('year', $year)
                    ->where('case_type', $normalizedCaseType)
                    ->lockForUpdate()
                    ->first();
            }

            $next = ((int) ($row->last_number ?? 0)) + 1;

            DB::table('case_reference_sequences')
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

    private function normalizeDistrictName(?string $districtName): string
    {
        $district = trim((string) $districtName);
        if ($district === '') {
            $district = 'Tidak Diketahui';
        }

        $district = preg_replace('/\s+/', ' ', $district);

        return str_replace('/', '-', $district);
    }
}
