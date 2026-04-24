<?php

namespace App\Services;

use App\Models\IwaranWarrant;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class IwaranReferenceService
{
    public function generateReferenceNo(int $districtId, ?int $year = null, ?CarbonInterface $at = null): string
    {
        $resolvedYear = $this->resolveYear($year, $at);
        $next = $this->reserveDistrictYearRunningNumber($districtId, $resolvedYear);
        $districtName = $this->resolveDistrictName($districtId);

        return "{$districtName} / {$resolvedYear} / " . str_pad((string) $next, 4, '0', STR_PAD_LEFT);
    }

    public function reserveDistrictYearRunningNumber(int $districtId, int $year): int
    {
        return DB::transaction(function () use ($districtId, $year) {
            $now = now();

            $row = DB::table('iwaran_reference_sequences')
                ->where('district_id', $districtId)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $row) {
                $maxExisting = (int) (
                    IwaranWarrant::query()
                        ->where('daerah_id', $districtId)
                        ->where(function ($query) use ($year) {
                            $query->where('tahun', $year)
                                ->orWhere(function ($fallback) use ($year) {
                                    $fallback->whereNull('tahun')
                                        ->whereYear('tarikh_masa_terima', $year);
                                });
                        })
                        ->whereNotNull('no_ruj_fail')
                        ->whereRaw("no_ruj_fail REGEXP '[0-9]{4}$'")
                        ->max(DB::raw('CAST(RIGHT(no_ruj_fail, 4) AS UNSIGNED)'))
                );

                DB::table('iwaran_reference_sequences')->insert([
                    'district_id' => $districtId,
                    'year' => $year,
                    'last_number' => $maxExisting,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);

                $row = DB::table('iwaran_reference_sequences')
                    ->where('district_id', $districtId)
                    ->where('year', $year)
                    ->lockForUpdate()
                    ->first();
            }

            $next = ((int) ($row->last_number ?? 0)) + 1;

            DB::table('iwaran_reference_sequences')
                ->where('district_id', $districtId)
                ->where('year', $year)
                ->update([
                    'last_number' => $next,
                    'updated_at' => $now,
                ]);

            return $next;
        }, 3);
    }

    private function resolveYear(?int $year = null, ?CarbonInterface $at = null): int
    {
        if ($year && $year > 0) {
            return $year;
        }

        $date = $at ?: now();

        return (int) $date->format('Y');
    }

    private function resolveDistrictName(int $districtId): string
    {
        $name = (string) DB::table('districts')->where('id', $districtId)->value('name');
        $name = trim(preg_replace('/\s+/', ' ', $name));

        if ($name === '') {
            return 'Daerah Tidak Diketahui';
        }

        return Str::of($name)->replace('/', '-')->toString();
    }
}

