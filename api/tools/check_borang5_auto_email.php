<?php

use App\Models\Complaint;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require __DIR__ . '/../vendor/autoload.php';

$app = require __DIR__ . '/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$complaintId = isset($argv[1]) ? (int) $argv[1] : 0;

$rawRecipients = trim((string) env('BORANG5_AUTO_EMAIL_TO', ''));
$recipientEmails = collect(preg_split('/[;,]+/', $rawRecipients))
    ->map(fn ($email) => trim((string) $email))
    ->filter(fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
    ->values()
    ->all();

$normalizeClassification = static function ($value): string {
    $normalized = strtoupper(trim((string) $value));
    if ($normalized === 'FFA') {
        return 'FNA';
    }
    return in_array($normalized, ['FNA', 'KIV', 'NFA', 'OP'], true) ? $normalized : '';
};

$isEligible = static function ($row) use ($normalizeClassification): bool {
    return strtoupper((string) ($row->case_type ?: 'AJ')) === 'AJ'
        && in_array($normalizeClassification($row->aj_ppa_classification), ['FNA', 'KIV', 'NFA', 'OP'], true)
        && ! empty($row->aj_offense_id)
        && trim((string) ($row->borang5_statement ?? '')) !== '';
};

$reasons = static function ($row) use ($normalizeClassification): array {
    $reasons = [];
    if (strtoupper((string) ($row->case_type ?: 'AJ')) !== 'AJ') {
        $reasons[] = 'case_type bukan AJ';
    }
    if (! in_array($normalizeClassification($row->aj_ppa_classification), ['FNA', 'KIV', 'NFA', 'OP'], true)) {
        $reasons[] = 'klasifikasi bukan FNA/KIV/NFA/OP';
    }
    if (empty($row->aj_offense_id)) {
        $reasons[] = 'aj_offense_id kosong';
    }
    if (trim((string) ($row->borang5_statement ?? '')) === '') {
        $reasons[] = 'borang5_statement kosong';
    }
    if (! empty($row->borang5_auto_emailed_at)) {
        $reasons[] = 'sudah dihantar';
    }
    return $reasons;
};

echo "== Borang 5 Auto Email Check ==\n";
echo 'APP_ENV: ' . (string) config('app.env') . "\n";
echo 'DB_DATABASE: ' . (string) config('database.connections.' . config('database.default') . '.database') . "\n";
echo 'BORANG5_AUTO_EMAIL_TO env(): ' . ($rawRecipients !== '' ? $rawRecipients : '[EMPTY]') . "\n";
echo 'Valid recipients: ' . (! empty($recipientEmails) ? implode(', ', $recipientEmails) : '[NONE]') . "\n";
echo 'Column borang5_auto_emailed_at exists: ' . (Schema::hasColumn('complaints', 'borang5_auto_emailed_at') ? 'YES' : 'NO') . "\n\n";

if (! Schema::hasColumn('complaints', 'borang5_auto_emailed_at')) {
    echo "Missing column. Run migrations first.\n";
    exit(1);
}

if ($complaintId > 0) {
    $row = Complaint::query()
        ->select([
            'id',
            'reference_no',
            'case_type',
            'current_stage',
            'aj_ppa_classification',
            'aj_offense_id',
            'borang5_statement',
            'borang5_auto_emailed_at',
            'updated_at',
        ])
        ->find($complaintId);

    if (! $row) {
        echo "Complaint #{$complaintId} not found.\n";
        exit(1);
    }

    echo "== Complaint #{$row->id} ==\n";
    echo 'reference_no: ' . (string) ($row->reference_no ?: '-') . "\n";
    echo 'case_type: ' . (string) ($row->case_type ?: '-') . "\n";
    echo 'current_stage: ' . (string) ($row->current_stage ?: '-') . "\n";
    echo 'aj_ppa_classification: ' . (string) ($row->aj_ppa_classification ?: '-') . "\n";
    echo 'aj_offense_id: ' . (string) ($row->aj_offense_id ?: '-') . "\n";
    echo 'borang5_statement filled: ' . (trim((string) $row->borang5_statement) !== '' ? 'YES' : 'NO') . "\n";
    echo 'borang5_auto_emailed_at: ' . (string) ($row->borang5_auto_emailed_at ?: '-') . "\n";
    echo 'eligible_by_data: ' . ($isEligible($row) ? 'YES' : 'NO') . "\n";
    echo 'blockers: ' . (empty($reasons($row)) ? '-' : implode('; ', $reasons($row))) . "\n";
    echo 'env_recipients_ok: ' . (! empty($recipientEmails) ? 'YES' : 'NO') . "\n";
    exit(0);
}

$base = Complaint::query();
$totalAj = (clone $base)->where('case_type', 'AJ')->count();
$sent = (clone $base)->whereNotNull('borang5_auto_emailed_at')->count();
$eligibleUnsent = (clone $base)
    ->where('case_type', 'AJ')
    ->whereNull('borang5_auto_emailed_at')
    ->whereIn(DB::raw("UPPER(COALESCE(aj_ppa_classification, ''))"), ['FNA', 'FFA', 'KIV', 'NFA', 'OP'])
    ->whereNotNull('aj_offense_id')
    ->whereNotNull('borang5_statement')
    ->whereRaw("TRIM(COALESCE(borang5_statement, '')) <> ''")
    ->count();

echo "== Summary ==\n";
echo "AJ complaints: {$totalAj}\n";
echo "Auto emailed: {$sent}\n";
echo "Eligible but not auto emailed: {$eligibleUnsent}\n\n";

echo "== Recent Auto Emailed ==\n";
Complaint::query()
    ->select(['id', 'reference_no', 'aj_ppa_classification', 'borang5_auto_emailed_at'])
    ->whereNotNull('borang5_auto_emailed_at')
    ->latest('borang5_auto_emailed_at')
    ->limit(10)
    ->get()
    ->each(function ($row): void {
        echo sprintf(
            "#%d | %s | %s | %s\n",
            $row->id,
            $row->reference_no ?: '-',
            $row->aj_ppa_classification ?: '-',
            $row->borang5_auto_emailed_at ?: '-'
        );
    });

echo "\n== Eligible But Not Auto Emailed (latest 20) ==\n";
Complaint::query()
    ->select(['id', 'reference_no', 'current_stage', 'aj_ppa_classification', 'aj_offense_id', 'updated_at'])
    ->where('case_type', 'AJ')
    ->whereNull('borang5_auto_emailed_at')
    ->whereIn(DB::raw("UPPER(COALESCE(aj_ppa_classification, ''))"), ['FNA', 'FFA', 'KIV', 'NFA', 'OP'])
    ->whereNotNull('aj_offense_id')
    ->whereNotNull('borang5_statement')
    ->whereRaw("TRIM(COALESCE(borang5_statement, '')) <> ''")
    ->latest('updated_at')
    ->limit(20)
    ->get()
    ->each(function ($row): void {
        echo sprintf(
            "#%d | %s | stage=%s | class=%s | offense=%s | updated=%s\n",
            $row->id,
            $row->reference_no ?: '-',
            $row->current_stage ?: '-',
            $row->aj_ppa_classification ?: '-',
            $row->aj_offense_id ?: '-',
            $row->updated_at ?: '-'
        );
    });

