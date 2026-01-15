<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplaintBackfillSeeder extends Seeder
{
    public function run(): void
    {
        $statusId = DB::table('complaint_statuses')
            ->where('code', 'baru')
            ->value('id');

        if ($statusId) {
            DB::table('complaints')
                ->whereNull('status_id')
                ->update([
                    'status_id' => $statusId,
                    'updated_at' => now(),
                ]);
        }

        $classificationIds = DB::table('complaint_classifications')
            ->pluck('id', 'code')
            ->all();

        foreach ($classificationIds as $code => $id) {
            DB::table('complaints')
                ->whereNull('classification_id')
                ->where('case_type', $code)
                ->update([
                    'classification_id' => $id,
                    'updated_at' => now(),
                ]);
        }
    }
}
