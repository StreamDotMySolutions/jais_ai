<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class DebugAutoMailRecipientsCommand extends Command
{
    protected $signature = 'mail:debug-auto-recipients';

    protected $description = 'Paparkan konfigurasi mail dan auto recipients yang sedang dibaca aplikasi.';

    public function handle(): int
    {
        $smtp = (array) config('mail.mailers.smtp', []);
        $from = (array) config('mail.from', []);
        $borang5 = (array) config('mail.auto_recipients.borang5', []);
        $laporanTindakan = (array) config('mail.auto_recipients.laporan_tindakan', []);

        $rows = [
            ['mail.default', (string) config('mail.default', '-')],
            ['mail.mailers.smtp.host', (string) ($smtp['host'] ?? '-')],
            ['mail.mailers.smtp.port', (string) ($smtp['port'] ?? '-')],
            ['mail.mailers.smtp.encryption', (string) ($smtp['encryption'] ?? '-')],
            ['mail.mailers.smtp.username', (string) ($smtp['username'] ?? '-')],
            ['mail.mailers.smtp.password', $this->maskSecret((string) ($smtp['password'] ?? ''))],
            ['mail.from.address', (string) ($from['address'] ?? '-')],
            ['mail.from.name', (string) ($from['name'] ?? '-')],
            ['mail.auto_recipients.borang5.to', $this->normalizeEmails((string) ($borang5['to'] ?? ''))],
            ['mail.auto_recipients.borang5.cc', $this->normalizeEmails((string) ($borang5['cc'] ?? ''))],
            ['mail.auto_recipients.laporan_tindakan.to', $this->normalizeEmails((string) ($laporanTindakan['to'] ?? ''))],
            ['mail.auto_recipients.laporan_tindakan.cc', $this->normalizeEmails((string) ($laporanTindakan['cc'] ?? ''))],
        ];

        $this->table(['Config Key', 'Value'], $rows);

        return self::SUCCESS;
    }

    private function normalizeEmails(string $raw): string
    {
        $emails = collect(preg_split('/[;,]+/', trim($raw)))
            ->map(fn ($email) => trim((string) $email))
            ->filter()
            ->values()
            ->all();

        if (empty($emails)) {
            return '[EMPTY]';
        }

        return implode(', ', $emails);
    }

    private function maskSecret(string $value): string
    {
        if ($value === '') {
            return '[EMPTY]';
        }

        $length = strlen($value);
        if ($length <= 4) {
            return str_repeat('*', $length);
        }

        return substr($value, 0, 2) . str_repeat('*', max($length - 4, 1)) . substr($value, -2);
    }
}
