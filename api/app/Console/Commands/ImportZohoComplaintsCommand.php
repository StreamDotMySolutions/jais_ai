<?php

namespace App\Console\Commands;

use App\Models\Complaint;
use App\Models\District;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ImportZohoComplaintsCommand extends Command
{
    protected $signature = 'jais:import-zoho
        {--source= : Folder path containing Zoho CSV exports}
        {--dry-run : Read and map without writing to database}';

    protected $description = 'Import Zoho AJ/AK complaint exports for FAT/report testing';

    private const FIR_FILE = 'PAPAR BORANG 5 FIR.csv';
    private const AK_FILE = 'PAPAR BORANG 5 KELUARGA.csv';
    private const AJ_REPORT_FILE = 'REKOD KESELURUHAN.csv';

    public function handle(): int
    {
        $source = trim((string) $this->option('source'));
        if ($source === '') {
            $this->error('Sila beri --source=PATH ke folder CSV Zoho.');
            return self::FAILURE;
        }

        $basePath = rtrim($source, '\\/');
        $firPath = $basePath . DIRECTORY_SEPARATOR . self::FIR_FILE;
        $akPath = $basePath . DIRECTORY_SEPARATOR . self::AK_FILE;
        $reportPath = $basePath . DIRECTORY_SEPARATOR . self::AJ_REPORT_FILE;

        foreach ([$firPath, $akPath, $reportPath] as $path) {
            if (! is_file($path)) {
                $this->error("Fail tidak dijumpai: {$path}");
                return self::FAILURE;
            }
        }

        $dryRun = (bool) $this->option('dry-run');
        $districts = District::query()
            ->get(['id', 'name', 'code'])
            ->keyBy(fn (District $district) => $this->normalizeText($district->name));

        $summary = [
            'aj_created' => 0,
            'aj_updated' => 0,
            'ak_created' => 0,
            'ak_updated' => 0,
            'report_created' => 0,
            'report_enriched' => 0,
            'report_skipped' => 0,
        ];

        $this->info('Membaca CSV Zoho...');
        $firRows = $this->readCsv($firPath);
        $akRows = $this->readCsv($akPath);
        $reportRows = $this->readCsv($reportPath);

        $this->line(sprintf('AJ FIR: %d row | AK: %d row | REKOD: %d row', count($firRows), count($akRows), count($reportRows)));

        $runner = function () use ($firRows, $akRows, $reportRows, $districts, &$summary, $dryRun): void {
            foreach ($firRows as $row) {
                $referenceNo = $this->buildComplaintReference('AJ', $row['Daerah'] ?? '', $row['No. Daftar Aduan'] ?? '', $row['Tarikh'] ?? '');
                if (! $referenceNo) {
                    continue;
                }

                $district = $this->matchDistrict($districts, $row['Daerah'] ?? '');
                [$complaintDate, $complaintTime] = $this->parseSeparateDateTime(
                    (string) ($row['Tarikh'] ?? ''),
                    (string) ($row['Masa'] ?? '')
                );

                $submittedAt = $this->safeCarbon($complaintDate . ' ' . $complaintTime, 'Y-m-d H:i:s');
                $classification = $this->mapClassification($row['Klasifikasi'] ?? '');
                $isCase = $this->isBolehTangkap($row['Jenis Kesalahan'] ?? '');

                $payload = [
                    'reference_no' => $referenceNo,
                    'case_type' => 'AJ',
                    'complaint_year' => (int) substr($complaintDate, 0, 4),
                    'complaint_date' => $complaintDate,
                    'complaint_time' => $complaintTime,
                    'complainant_name' => $this->cleanString($row['Nama Pemberi Maklumat'] ?? $row['Nama Pengadu (Huruf Besar)'] ?? 'PENGADU ZOHO'),
                    'identification_number' => $this->normalizeIdentityNumber($row['No. K/P pemberi maklumat'] ?? ''),
                    'contact_number' => $this->cleanString($row['No. Telefon Pemberi Maklumat'] ?? $row['Nombor Telefon Pengadu'] ?? '-', 255, '-'),
                    'address' => $this->cleanString($row['Alamat Kejadian'] ?? $row['Alamat Pengadu'] ?? '-', 1000, '-'),
                    'district_name' => $district['name'] ?? $this->cleanString($row['Daerah'] ?? '', 255),
                    'district_id' => $district['id'] ?? null,
                    'summary' => $this->cleanString($row['Butiran Aduan'] ?? $row['Kesalahan disyaki'] ?? 'Import Zoho AJ', 10000, 'Import Zoho AJ'),
                    'borang5_statement' => $this->cleanString($row['Butiran Aduan'] ?? '', 20000),
                    'channel' => 'zoho-import',
                    'submitted_at' => $submittedAt,
                    'received_at' => $submittedAt,
                    'current_stage' => 'disahkan',
                    'approver_confirmed_at' => $submittedAt,
                    'is_case' => $isCase,
                    'contents' => $this->cleanString($row['Butiran Aduan'] ?? $row['Kesalahan disyaki'] ?? 'Import Zoho AJ', 65535, 'Import Zoho AJ'),
                    'aj_ppa_classification' => $classification,
                    'aj_ip_status' => $this->cleanString($row['Status Terkini'] ?? '', 255),
                    'aj_notes' => $this->cleanString($row['Respon On-Call'] ?? '', 65535),
                    'case_register_no' => $this->cleanString($row['Nombor Fail'] ?? '', 255),
                    'created_at' => $submittedAt ?: now(),
                    'updated_at' => $this->parseModifiedAt($row['Last Modified Time'] ?? null) ?? ($submittedAt ?: now()),
                ];

                $result = $this->upsertComplaint($referenceNo, $payload, $dryRun);
                $summary[$result === 'created' ? 'aj_created' : 'aj_updated']++;
            }

            foreach ($akRows as $row) {
                $referenceNo = $this->buildComplaintReference('AK', $row['Daerah'] ?? '', $row['No. Daftar Aduan'] ?? '', $row['Tarikh dan Masa'] ?? '');
                if (! $referenceNo) {
                    continue;
                }

                $district = $this->matchDistrict($districts, $row['Daerah'] ?? '');
                [$complaintDate, $complaintTime] = $this->parseDateTime((string) ($row['Tarikh dan Masa'] ?? ''));
                $submittedAt = $this->safeCarbon($complaintDate . ' ' . $complaintTime, 'Y-m-d H:i:s');

                $payload = [
                    'reference_no' => $referenceNo,
                    'case_type' => 'AK',
                    'complaint_year' => (int) substr($complaintDate, 0, 4),
                    'complaint_date' => $complaintDate,
                    'complaint_time' => $complaintTime,
                    'complainant_name' => $this->cleanString($row['Nama'] ?? 'PENGADU ZOHO AK'),
                    'identification_number' => $this->normalizeIdentityNumber($row['Kad Pengenalan'] ?? ''),
                    'contact_number' => '-',
                    'address' => $district['name'] ?? $this->cleanString($row['Daerah'] ?? '', 255, '-'),
                    'district_name' => $district['name'] ?? $this->cleanString($row['Daerah'] ?? '', 255),
                    'district_id' => $district['id'] ?? null,
                    'summary' => $this->cleanString($row['Kesalahan Disyaki'] ?? 'Import Zoho AK', 10000, 'Import Zoho AK'),
                    'borang5_statement' => $this->cleanString($row['Kesalahan Disyaki'] ?? '', 20000),
                    'channel' => 'zoho-import',
                    'submitted_at' => $submittedAt,
                    'received_at' => $submittedAt,
                    'current_stage' => 'disahkan',
                    'contents' => $this->cleanString($row['Kesalahan Disyaki'] ?? 'Import Zoho AK', 65535, 'Import Zoho AK'),
                    'ak_notes' => $this->cleanString($row['Kesalahan Disyaki'] ?? '', 65535),
                    'ak_ip_status' => 'Proses Siasatan',
                    'created_at' => $submittedAt ?: now(),
                    'updated_at' => $submittedAt ?: now(),
                ];

                $result = $this->upsertComplaint($referenceNo, $payload, $dryRun);
                $summary[$result === 'created' ? 'ak_created' : 'ak_updated']++;
            }

            foreach ($reportRows as $row) {
                $referenceNo = $this->resolveAjReferenceFromReportRow($row);
                if (! $referenceNo) {
                    $summary['report_skipped']++;
                    continue;
                }

                $complaint = Complaint::query()->where('reference_no', $referenceNo)->first();
                [$actionDate, $actionTime] = $this->parseDateTime((string) ($row['Tarikh / Masa Tindakan'] ?? ''));
                $actionAt = $this->safeCarbon($actionDate . ' ' . $actionTime, 'Y-m-d H:i:s');
                $courtDate = $this->parseOptionalDate((string) ($row['Tarikh Sebutan (Bon Mahkamah)'] ?? ''));
                $district = $this->matchDistrict($districts, $row['Daerah'] ?? '');

                if (! $complaint) {
                    $payload = [
                        'reference_no' => $referenceNo,
                        'case_type' => 'AJ',
                        'complaint_year' => (int) substr($actionDate, 0, 4),
                        'complaint_date' => $actionDate,
                        'complaint_time' => $actionTime,
                        'complainant_name' => $this->cleanString($row['Nama Pengadu / Penangkap PPA'] ?? 'PENGADU ZOHO AJ'),
                        'identification_number' => '-',
                        'contact_number' => '-',
                        'address' => $district['name'] ?? $this->cleanString($row['Daerah'] ?? '', 255, '-'),
                        'district_name' => $district['name'] ?? $this->cleanString($row['Daerah'] ?? '', 255),
                        'district_id' => $district['id'] ?? null,
                        'summary' => $this->cleanString($row['Laporan'] ?? $row['Kesalahan'] ?? 'Import Zoho AJ report', 10000, 'Import Zoho AJ report'),
                        'borang5_statement' => null,
                        'channel' => 'zoho-import',
                        'submitted_at' => $actionAt,
                        'received_at' => $actionAt,
                        'current_stage' => 'selesai',
                        'approver_confirmed_at' => $actionAt,
                        'is_case' => $this->cleanString($row['No. Daftar Kes'] ?? '') !== '',
                        'contents' => $this->cleanString($row['Laporan'] ?? $row['Kesalahan'] ?? 'Import Zoho AJ report', 65535, 'Import Zoho AJ report'),
                        'aj_arrest_status' => $this->mapArrestStatus($row['Status'] ?? ''),
                        'aj_report_notes' => $this->cleanString($row['Laporan'] ?? '', 65535),
                        'aj_investigation_notes' => $this->cleanString($row['Catatan Siasatan'] ?? '', 65535),
                        'aj_ip_status' => $this->cleanString($row['Status IP'] ?? '', 255),
                        'aj_notes' => $this->cleanString($row['Kesalahan'] ?? '', 65535),
                        'aj_court_date' => $courtDate,
                        'case_register_no' => $this->cleanString($row['No. Daftar Kes'] ?? '', 255),
                        'created_at' => $actionAt ?: now(),
                        'updated_at' => $this->parseModifiedAt($row['Modified Time'] ?? null) ?? ($actionAt ?: now()),
                    ];

                    $this->upsertComplaint($referenceNo, $payload, $dryRun);
                    $summary['report_created']++;
                    continue;
                }

                $payload = [
                    'current_stage' => 'selesai',
                    'approver_confirmed_at' => $complaint->approver_confirmed_at ?: ($actionAt ?: $complaint->submitted_at ?: now()),
                    'received_at' => $complaint->received_at ?: ($actionAt ?: $complaint->submitted_at ?: now()),
                    'aj_arrest_status' => $this->mapArrestStatus($row['Status'] ?? ''),
                    'aj_report_notes' => $this->cleanString($row['Laporan'] ?? '', 65535),
                    'aj_investigation_notes' => $this->cleanString($row['Catatan Siasatan'] ?? '', 65535),
                    'aj_ip_status' => $this->cleanString($row['Status IP'] ?? '', 255),
                    'aj_court_date' => $courtDate,
                    'case_register_no' => $this->cleanString($row['No. Daftar Kes'] ?? '', 255),
                    'updated_at' => $this->parseModifiedAt($row['Modified Time'] ?? null) ?? ($actionAt ?: now()),
                ];

                if (! $dryRun) {
                    $complaint->fill($payload)->save();
                }
                $summary['report_enriched']++;
            }
        };

        if ($dryRun) {
            $runner();
        } else {
            DB::transaction($runner);
        }

        $this->newLine();
        $this->info($dryRun ? 'Dry run selesai.' : 'Import Zoho selesai.');
        foreach ($summary as $key => $count) {
            $this->line(str_pad($key, 18, ' ') . ': ' . $count);
        }

        return self::SUCCESS;
    }

    /**
     * @return array<int, array<string, string|null>>
     */
    private function readCsv(string $path): array
    {
        $handle = fopen($path, 'rb');
        if (! $handle) {
            throw new RuntimeException("Gagal buka CSV: {$path}");
        }

        $rows = [];
        $headers = null;
        while (($data = fgetcsv($handle)) !== false) {
            if ($headers === null) {
                $headers = array_map(fn ($value) => trim((string) $value), $data);
                continue;
            }

            if ($this->isEmptyRow($data)) {
                continue;
            }

            $row = [];
            foreach ($headers as $index => $header) {
                $row[$header] = isset($data[$index]) ? trim((string) $data[$index]) : null;
            }
            $rows[] = $row;
        }

        fclose($handle);
        return $rows;
    }

    private function isEmptyRow(array $row): bool
    {
        foreach ($row as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function buildComplaintReference(string $caseType, string $district, string $number, string $dateTime): ?string
    {
        $number = preg_replace('/\D+/', '', (string) $number);
        if ($number === '') {
            return null;
        }

        $year = $this->extractYear($dateTime);
        if ($year === null) {
            return null;
        }

        return sprintf(
            '%s-%s/%s/%d',
            strtoupper($caseType),
            $this->normalizeDistrictCode($district),
            ltrim($number, '0') !== '' ? ltrim($number, '0') : '0',
            $year
        );
    }

    private function resolveAjReferenceFromReportRow(array $row): ?string
    {
        $direct = $this->buildComplaintReference('AJ', $row['Daerah'] ?? '', $row['No. Daftar Aduan'] ?? '', $row['Tarikh / Masa Tindakan'] ?? '');
        if ($direct) {
            return $direct;
        }

        $laporan = (string) ($row['Laporan'] ?? '');
        if (preg_match('/\b(AJ-[A-Z\s]+\/\d+\/\d{4})\b/u', strtoupper($laporan), $matches)) {
            return str_replace(' ', '_', preg_replace('/\s+/', ' ', trim($matches[1])));
        }

        return null;
    }

    private function normalizeDistrictCode(string $district): string
    {
        $normalized = strtoupper($this->normalizeText($district));
        return str_replace(' ', '_', $normalized ?: 'NA');
    }

    private function normalizeText(?string $value): string
    {
        $text = strtoupper(trim((string) $value));
        $text = preg_replace('/\s+/', ' ', $text);
        return $text ?: '';
    }

    /**
     * @param Collection<string, District> $districts
     * @return array{id:int|null,name:string|null}|null
     */
    private function matchDistrict(Collection $districts, string $name): ?array
    {
        $normalized = $this->normalizeText($name);
        if ($normalized === '') {
            return null;
        }

        $district = $districts->get($normalized);
        if ($district) {
            return ['id' => $district->id, 'name' => $district->name];
        }

        foreach ($districts as $key => $candidate) {
            if (str_contains($key, $normalized) || str_contains($normalized, $key)) {
                return ['id' => $candidate->id, 'name' => $candidate->name];
            }
        }

        return ['id' => null, 'name' => $name];
    }

    /**
     * @return array{0:string,1:string}
     */
    private function parseSeparateDateTime(string $date, string $time): array
    {
        $date = trim($date);
        $time = trim($time);

        $formats = ['d/m/Y h.i A', 'd/m/Y h:i A', 'd/m/Y H:i', 'd/m/Y'];
        foreach ($formats as $format) {
            try {
                $dt = Carbon::createFromFormat($format, trim($date . ' ' . $time));
                return [$dt->format('Y-m-d'), $dt->format('H:i:s')];
            } catch (\Throwable $e) {
            }
        }

        return [$this->fallbackDate($date), $this->fallbackTime($time)];
    }

    /**
     * @return array{0:string,1:string}
     */
    private function parseDateTime(string $value): array
    {
        $raw = trim($value);
        $formats = ['d-m-Y H:i:s', 'd/m/Y H:i:s', 'd/m/Y h.i A', 'd-m-Y h:i:s', 'd-m-Y H:i'];
        foreach ($formats as $format) {
            try {
                $dt = Carbon::createFromFormat($format, $raw);
                return [$dt->format('Y-m-d'), $dt->format('H:i:s')];
            } catch (\Throwable $e) {
            }
        }

        return [$this->fallbackDate($raw), '00:00:00'];
    }

    private function fallbackDate(string $value): string
    {
        if (preg_match('/(\d{2})[\/-](\d{2})[\/-](\d{4})/', $value, $matches)) {
            return "{$matches[3]}-{$matches[2]}-{$matches[1]}";
        }

        return now()->toDateString();
    }

    private function fallbackTime(string $value): string
    {
        if (preg_match('/(\d{1,2})[.:](\d{2})\s*(AM|PM)?/i', $value, $matches)) {
            $hour = (int) $matches[1];
            $minute = $matches[2];
            $ampm = strtoupper((string) ($matches[3] ?? ''));
            if ($ampm === 'PM' && $hour < 12) {
                $hour += 12;
            }
            if ($ampm === 'AM' && $hour === 12) {
                $hour = 0;
            }
            return str_pad((string) $hour, 2, '0', STR_PAD_LEFT) . ':' . $minute . ':00';
        }

        return '00:00:00';
    }

    private function extractYear(string $value): ?int
    {
        if (preg_match('/(20\d{2})/', $value, $matches)) {
            return (int) $matches[1];
        }

        return null;
    }

    private function mapClassification(?string $value): ?string
    {
        $normalized = strtoupper(trim((string) $value));
        if ($normalized === 'FFA') {
            $normalized = 'FNA';
        }
        return in_array($normalized, ['FNA', 'KIV', 'NFA', 'OP'], true) ? $normalized : null;
    }

    private function mapArrestStatus(?string $value): ?string
    {
        $normalized = strtoupper(trim((string) $value));
        if (str_contains($normalized, 'ADA TANGKAPAN')) {
            return 'ada';
        }
        if (str_contains($normalized, 'TIADA TANGKAPAN')) {
            return 'tiada';
        }

        return null;
    }

    private function isBolehTangkap(?string $value): bool
    {
        return str_contains($this->normalizeText($value), 'BOLEH TANGKAP');
    }

    private function normalizeIdentityNumber(?string $value): string
    {
        $digits = preg_replace('/\D+/', '', (string) $value);
        return $digits !== '' ? $digits : '-';
    }

    private function cleanString(?string $value, int $limit = 255, string $fallback = ''): string
    {
        $text = trim((string) $value);
        if ($text === '') {
            $text = $fallback;
        }

        if ($limit > 0 && mb_strlen($text) > $limit) {
            return mb_substr($text, 0, $limit);
        }

        return $text;
    }

    private function parseModifiedAt(?string $value): ?Carbon
    {
        $raw = trim((string) $value);
        if ($raw === '') {
            return null;
        }

        foreach (['d-m-Y H:i:s', 'd/m/Y H:i:s', 'Y-m-d H:i:s'] as $format) {
            try {
                return Carbon::createFromFormat($format, $raw);
            } catch (\Throwable $e) {
            }
        }

        return null;
    }

    private function parseOptionalDate(string $value): ?string
    {
        $raw = trim($value);
        if ($raw === '') {
            return null;
        }

        foreach (['d-m-Y', 'd/m/Y', 'Y-m-d'] as $format) {
            try {
                return Carbon::createFromFormat($format, $raw)->format('Y-m-d');
            } catch (\Throwable $e) {
            }
        }

        return null;
    }

    private function safeCarbon(string $value, string $format): ?Carbon
    {
        try {
            return Carbon::createFromFormat($format, $value);
        } catch (\Throwable $e) {
            return null;
        }
    }

    private function upsertComplaint(string $referenceNo, array $payload, bool $dryRun): string
    {
        $exists = Complaint::query()->where('reference_no', $referenceNo)->exists();
        if (! $dryRun) {
            Complaint::query()->updateOrCreate(
                ['reference_no' => $referenceNo],
                $payload
            );
        }

        return $exists ? 'updated' : 'created';
    }
}
