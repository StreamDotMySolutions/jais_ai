<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_reference_sequences', function (Blueprint $table) {
            $table->id();
            $table->unsignedSmallInteger('year');
            $table->string('case_type', 10);
            $table->unsignedInteger('last_number')->default(0);
            $table->timestamps();

            $table->unique(['year', 'case_type'], 'case_reference_sequences_year_case_type_unique');
        });

        DB::transaction(function () {
            $rows = DB::table('cases')
                ->select(['case_type', 'complaint_year', 'case_register_no'])
                ->whereNotNull('case_register_no')
                ->where('case_register_no', '!=', '')
                ->get()
                ->groupBy(function ($row) {
                    $caseType = strtoupper(trim((string) ($row->case_type ?: 'AJ')));
                    $year = (int) ($row->complaint_year ?: 0);

                    return $caseType . '|' . $year;
                });

            $sequenceRows = [];
            foreach ($rows as $groupKey => $items) {
                [$caseType, $year] = explode('|', (string) $groupKey, 2);
                $maxExisting = collect($items)
                    ->map(function ($item) {
                        $referenceNo = trim((string) ($item->case_register_no ?? ''));
                        if ($referenceNo !== '' && preg_match('/(\d{4})$/', $referenceNo, $matches)) {
                            return (int) $matches[1];
                        }

                        return 0;
                    })
                    ->max();

                if ((int) $year <= 0) {
                    continue;
                }

                $sequenceRows[] = [
                    'year' => (int) $year,
                    'case_type' => strtoupper(trim((string) $caseType)),
                    'last_number' => (int) $maxExisting,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if (! empty($sequenceRows)) {
                DB::table('case_reference_sequences')->insert($sequenceRows);
            }
        }, 3);
    }

    public function down(): void
    {
        Schema::dropIfExists('case_reference_sequences');
    }
};
