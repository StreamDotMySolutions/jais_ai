<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class RecalculateComplaintIsCase extends Command
{
    protected $signature = 'complaints:recalculate-is-case';
    protected $description = 'Recalculate complaints.is_case for approved complaints based on offense type (BT/TBT).';

    public function handle(): int
    {
        // AJ: is_case = true when offense type code is BT.
        $ajCount = DB::update("
            UPDATE complaints c
            LEFT JOIN ref_offense_types t
                ON (
                    (c.aj_offense_type REGEXP '^[0-9]+$' AND t.id = CAST(c.aj_offense_type AS UNSIGNED))
                    OR
                    (NOT (c.aj_offense_type REGEXP '^[0-9]+$') AND UPPER(t.code) = UPPER(c.aj_offense_type))
                )
            SET c.is_case =
                CASE
                    WHEN UPPER(COALESCE(t.code, '')) = 'BT' THEN 1
                    ELSE 0
                END
            WHERE c.approver_confirmed_at IS NOT NULL
              AND UPPER(COALESCE(c.case_type, 'AJ')) = 'AJ'
        ");

        // AK: is_case = true when offense type code is BT.
        $akCount = DB::update("
            UPDATE complaints c
            LEFT JOIN ref_offense_types t
                ON (
                    (c.ak_offense_type REGEXP '^[0-9]+$' AND t.id = CAST(c.ak_offense_type AS UNSIGNED))
                    OR
                    (NOT (c.ak_offense_type REGEXP '^[0-9]+$') AND UPPER(t.code) = UPPER(c.ak_offense_type))
                )
            SET c.is_case =
                CASE
                    WHEN UPPER(COALESCE(t.code, '')) = 'BT' THEN 1
                    ELSE 0
                END
            WHERE c.approver_confirmed_at IS NOT NULL
              AND UPPER(COALESCE(c.case_type, 'AJ')) = 'AK'
        ");

        $this->info("Updated AJ rows: {$ajCount}");
        $this->info("Updated AK rows: {$akCount}");

        return self::SUCCESS;
    }
}
