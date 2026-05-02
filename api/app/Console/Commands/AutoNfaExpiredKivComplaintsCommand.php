<?php

namespace App\Console\Commands;

use App\Models\Complaint;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

class AutoNfaExpiredKivComplaintsCommand extends Command
{
    protected $signature = 'complaints:auto-nfa-expired-kiv {--dry-run : Senarai aduan layak tanpa kemaskini data}';

    protected $description = 'Tukar klasifikasi aduan AJ KIV kepada NFA selepas cukup 10 hari dari tarikh dan masa aduan diterima.';

    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $now = now();
        $updated = 0;
        $checked = 0;
        $eligible = [];

        Complaint::query()
            ->where('case_type', 'AJ')
            ->whereRaw('UPPER(aj_ppa_classification) = ?', ['KIV'])
            ->whereNotNull('complaint_date')
            ->orderBy('id')
            ->chunkById(100, function ($complaints) use ($dryRun, $now, &$updated, &$checked, &$eligible) {
                foreach ($complaints as $complaint) {
                    $checked++;
                    $complaintAt = $this->parseComplaintDateTime($complaint);

                    if (! $complaintAt || $complaintAt->copy()->addDays(10)->gt($now)) {
                        continue;
                    }

                    $eligible[] = [
                        'id' => $complaint->id,
                        'reference_no' => $complaint->reference_no ?: '-',
                        'complaint_at' => $complaintAt->format('Y-m-d H:i:s'),
                        'deadline_at' => $complaintAt->copy()->addDays(10)->format('Y-m-d H:i:s'),
                    ];

                    if ($dryRun) {
                        continue;
                    }

                    DB::transaction(function () use ($complaint, $now) {
                        $complaint->forceFill([
                            'aj_ppa_classification' => 'NFA',
                        ])->save();

                        $maxSortOrder = (int) DB::table('complaint_action_updates')
                            ->where('complaint_id', $complaint->id)
                            ->max('sort_order');

                        DB::table('complaint_action_updates')->insert([
                            'complaint_id' => $complaint->id,
                            'sort_order' => $maxSortOrder + 1,
                            'classification' => 'NFA',
                            'action_date' => $now->toDateString(),
                            'action_time' => $now->format('H:i:s'),
                            'note' => 'Auto NFA selepas tempoh KIV 10 hari tamat.',
                            'created_at' => $now,
                            'updated_at' => $now,
                        ]);
                    });

                    $updated++;
                }
            });

        if (! empty($eligible)) {
            $this->table(['ID', 'No Aduan', 'Tarikh Aduan', 'Tarikh Tamat KIV'], $eligible);
        }

        $this->info(sprintf(
            '%s. Disemak: %d. Layak: %d. Dikemaskini: %d.',
            $dryRun ? 'Dry run selesai' : 'Auto NFA selesai',
            $checked,
            count($eligible),
            $updated
        ));

        return self::SUCCESS;
    }

    private function parseComplaintDateTime(Complaint $complaint): ?Carbon
    {
        $date = trim((string) $complaint->complaint_date);
        if ($date === '') {
            return null;
        }

        $time = trim((string) ($complaint->complaint_time ?: '00:00:00'));
        if ($time === '') {
            $time = '00:00:00';
        }
        if (substr_count($time, ':') === 1) {
            $time .= ':00';
        }

        try {
            return Carbon::parse($date . ' ' . $time, config('app.timezone'));
        } catch (\Throwable) {
            return null;
        }
    }
}
