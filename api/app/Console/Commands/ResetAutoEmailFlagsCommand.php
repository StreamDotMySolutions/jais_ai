<?php

namespace App\Console\Commands;

use App\Models\CaseRecord;
use App\Models\Complaint;
use Illuminate\Console\Command;

class ResetAutoEmailFlagsCommand extends Command
{
    protected $signature = 'mail:reset-auto-email 
        {--complaint_id= : ID aduan untuk reset flag auto email}
        {--case_id= : ID kes untuk reset flag auto email}
        {--borang5 : Reset borang5_auto_emailed_at}
        {--laporan-tindakan : Reset laporan_tindakan_auto_emailed_at}
        {--all : Reset semua flag auto email yang berkaitan}';

    protected $description = 'Reset flag auto email pada aduan atau kes supaya record yang sama boleh diuji hantar semula.';

    public function handle(): int
    {
        $complaintId = (int) ($this->option('complaint_id') ?: 0);
        $caseId = (int) ($this->option('case_id') ?: 0);
        $resetBorang5 = (bool) $this->option('borang5');
        $resetLaporan = (bool) $this->option('laporan-tindakan');
        $resetAll = (bool) $this->option('all');

        if ($complaintId <= 0 && $caseId <= 0) {
            $this->error('Sila beri sekurang-kurangnya --complaint_id atau --case_id.');
            return self::FAILURE;
        }

        if (! $resetBorang5 && ! $resetLaporan && ! $resetAll) {
            $this->error('Sila pilih --borang5, --laporan-tindakan, atau --all.');
            return self::FAILURE;
        }

        if ($resetAll) {
            $resetBorang5 = true;
            $resetLaporan = true;
        }

        $rows = [];

        if ($complaintId > 0) {
            $complaint = Complaint::query()->find($complaintId);
            if (! $complaint) {
                $this->error("Aduan {$complaintId} tidak dijumpai.");
                return self::FAILURE;
            }

            $payload = [];
            if ($resetBorang5) {
                $payload['borang5_auto_emailed_at'] = null;
            }
            if ($resetLaporan) {
                $payload['laporan_tindakan_auto_emailed_at'] = null;
            }

            if (! empty($payload)) {
                $complaint->forceFill($payload)->save();
            }

            $rows[] = [
                'type' => 'complaint',
                'id' => (string) $complaint->id,
                'reference' => (string) ($complaint->reference_no ?: '-'),
                'borang5_auto_emailed_at' => $complaint->fresh()->borang5_auto_emailed_at ? (string) $complaint->fresh()->borang5_auto_emailed_at : 'NULL',
                'laporan_tindakan_auto_emailed_at' => $complaint->fresh()->laporan_tindakan_auto_emailed_at ? (string) $complaint->fresh()->laporan_tindakan_auto_emailed_at : 'NULL',
            ];
        }

        if ($caseId > 0) {
            $case = CaseRecord::query()->find($caseId);
            if (! $case) {
                $this->error("Kes {$caseId} tidak dijumpai.");
                return self::FAILURE;
            }

            if ($resetLaporan) {
                $case->forceFill([
                    'laporan_tindakan_auto_emailed_at' => null,
                ])->save();
            }

            $rows[] = [
                'type' => 'case',
                'id' => (string) $case->id,
                'reference' => (string) ($case->case_register_no ?: '-'),
                'borang5_auto_emailed_at' => '-',
                'laporan_tindakan_auto_emailed_at' => $case->fresh()->laporan_tindakan_auto_emailed_at ? (string) $case->fresh()->laporan_tindakan_auto_emailed_at : 'NULL',
            ];
        }

        $this->table(
            ['Type', 'ID', 'Reference', 'Borang5 Auto Email', 'Laporan Tindakan Auto Email'],
            $rows
        );

        $this->info('Flag auto email berjaya direset.');

        return self::SUCCESS;
    }
}
