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

        $type = strtoupper(trim($caseType) !== '' ? $caseType : 'AJ');
        $district = trim((string) $districtName) !== '' ? trim((string) $districtName) : 'Tidak Diketahui';
        $district = preg_replace('/\s+/', ' ', $district);
        $district = str_replace('/', '-', $district);
        $prefix = "{$type}-{$district}/{$year}/{$month}/";

        $next = $this->reserveYearlyRunningNumber($year);

        return $prefix . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function reserveYearlyRunningNumber(int $year): int
    {
        return DB::transaction(function () use ($year) {
            $now = now();

            $row = DB::table('complaint_reference_sequences')
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $maxExisting = (int) (
                    Complaint::query()
                        ->where('complaint_year', $year)
                        ->whereNotNull('reference_no')
                        ->whereRaw("reference_no REGEXP '[^0-9][0-9]{4}$'")
                        ->max(DB::raw('CAST(RIGHT(reference_no, 4) AS UNSIGNED)'))
                );

                DB::table('complaint_reference_sequences')->insert([
                    'year' => $year,
                    'last_number' => $maxExisting,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $row = DB::table('complaint_reference_sequences')
                    ->where('year', $year)
                    ->lockForUpdate()
                    ->first();
            }

            $next = ((int) ($row->last_number ?? 0)) + 1;

            DB::table('complaint_reference_sequences')
                ->where('year', $year)
                ->update([
                    'last_number' => $next,
                    'updated_at' => $now,
                ]);

            return $next;
        }, 3);
    }
}
