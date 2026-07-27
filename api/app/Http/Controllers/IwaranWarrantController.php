<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\InteractsWithMaintenanceOverride;
use App\Models\IwaranCourtDocument;
use App\Models\Office;
use App\Models\IwaranWaranAttachment;
use App\Models\IwaranWarrant;
use App\Services\IwaranReferenceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class IwaranWarrantController extends Controller
{
    use InteractsWithMaintenanceOverride;

    private function transformAttachment(IwaranWaranAttachment $attachment): array
    {
        return [
            'id' => $attachment->id,
            'file_name' => $attachment->file_name,
            'mime' => $attachment->mime,
            'size' => $attachment->size,
            'created_at' => $attachment->created_at,
            'download_url' => route('iwaran.attachments.download', ['attachment' => $attachment->id]),
        ];
    }

    private function transformCourtDocument(IwaranCourtDocument $document): array
    {
        return [
            'id' => $document->id,
            'file_name' => $document->file_name,
            'mime' => $document->mime,
            'size' => $document->size,
            'created_at' => $document->created_at,
            'download_url' => route('iwaran.court-documents.download', ['document' => $document->id]),
        ];
    }

    private function ensureAuthorizedWaranUser(Request $request)
    {
        $user = $request->user();
        if (! $user || ! method_exists($user, 'hasAnyRole') || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return null;
        }

        return $user;
    }

    private function getUserDistrictId($user): ?int
    {
        if (! $user) {
            return null;
        }

        $user->loadMissing('staff:id,user_id,district_id');

        if ($user->staff && ! empty($user->staff->district_id)) {
            return (int) $user->staff->district_id;
        }

        return null;
    }

    private function applyIwaranAccessScope($query, $user): void
    {
        if (! $user || ! method_exists($user, 'hasRole')) {
            return;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->getUserDistrictId($user);
            if ($districtId) {
                $query->where('daerah_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }
    }

    private function isSystemUser($user): bool
    {
        return (bool) ($user && method_exists($user, 'hasRole') && $user->hasRole('system'));
    }

    private function canViewAudit($user): bool
    {
        return (bool) ($user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'system']));
    }

    private function applyWorkflowStageFromStatus(array &$data, ?IwaranWarrant $warrant = null): void
    {
        // Status pelaksanaan tidak lagi boleh menimpa workflow waran.
    }

    private function canDispatchWarrant($user, IwaranWarrant $warrant): bool
    {
        if ($this->canBypassWorkflowLocks($user)) {
            return ! empty($warrant->daerah_id);
        }

        if (! ($user
            && method_exists($user, 'hasAnyRole')
            && $user->hasAnyRole(['pegawai_hq', 'admin', 'system'])
            && ! empty($warrant->daerah_id))) {
            return false;
        }

        return (string) ($warrant->current_stage ?: IwaranWarrant::STAGE_BARU) === IwaranWarrant::STAGE_BARU;
    }

    private function canPickupWarrant($user, IwaranWarrant $warrant): bool
    {
        if ($this->canBypassWorkflowLocks($user)) {
            return true;
        }

        $districtId = $this->getUserDistrictId($user);
        if (! $districtId || (int) ($warrant->daerah_id ?? 0) !== $districtId) {
            return false;
        }

        return (string) ($warrant->current_stage ?: IwaranWarrant::STAGE_BARU) === IwaranWarrant::STAGE_DIHANTAR_KE_DAERAH;
    }

    private function canSendWarrantToCourt($user, IwaranWarrant $warrant): bool
    {
        if ($this->canBypassWorkflowLocks($user)) {
            return count($this->normalizeEmailList([
                (string) ($warrant->emel_mahkamah ?? ''),
            ])) > 0;
        }

        if (! $user || ! method_exists($user, 'hasAnyRole') || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return false;
        }

        if (! empty($warrant->sent_to_court_at)) {
            return false;
        }

        $status = trim((string) ($warrant->status ?? ''));
        if (! in_array($status, ['berjaya', 'tidak_berjaya', 'kembalian'], true)) {
            return false;
        }

        return count($this->normalizeEmailList([
            (string) ($warrant->emel_mahkamah ?? ''),
        ])) > 0;
    }

    private function normalizeEmailList(array $emails): array
    {
        return collect($emails)
            ->flatMap(function ($email) {
                return preg_split('/[\r\n,;]+/', (string) $email) ?: [];
            })
            ->map(fn ($email) => trim((string) $email))
            ->filter()
            ->filter(fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique(fn ($email) => strtolower($email))
            ->values()
            ->all();
    }

    private function emailListValidationRules(): array
    {
        return [
            'nullable',
            'string',
            'max:1000',
            function (string $attribute, mixed $value, \Closure $fail): void {
                $raw = trim((string) ($value ?? ''));
                if ($raw === '') {
                    return;
                }

                $tokens = collect(preg_split('/[\r\n,;]+/', $raw) ?: [])
                    ->map(fn ($email) => trim((string) $email))
                    ->filter()
                    ->values();

                if ($tokens->isEmpty()) {
                    return;
                }

                $valid = $this->normalizeEmailList([$raw]);
                if (count($valid) !== $tokens->count()) {
                    $fail('Sila masukkan alamat emel yang sah. Gunakan koma jika lebih daripada satu emel.');
                }
            },
        ];
    }

    private function resolveIwaranDispatchRecipients(IwaranWarrant $warrant): array
    {
        $districtOfficeEmail = '';
        if ($warrant->daerah_id) {
            $districtOfficeEmail = (string) (Office::query()
                ->where('is_active', true)
                ->where('office_type', 'daerah')
                ->where('district_id', $warrant->daerah_id)
                ->value('email') ?? '');
        }

        $to = $this->normalizeEmailList([$districtOfficeEmail]);

        return [
            'to' => $to,
            'cc' => [],
        ];
    }

    private function sendDispatchEmailToDistrict(IwaranWarrant $warrant): array
    {
        $warrant->loadMissing([
            'daerah:id,name',
            'mahkamah:id,nama',
            'courtDocuments',
            'pendaftar:id,name',
        ]);

        $recipients = $this->resolveIwaranDispatchRecipients($warrant);
        if (empty($recipients['to'])) {
            return [
                'sent' => false,
                'reason' => 'invalid_recipient_config',
                'to' => [],
                'cc' => $recipients['cc'],
            ];
        }

        $subjectReference = trim((string) ($warrant->no_ruj_fail ?: ('Waran #' . $warrant->id)));
        $subject = 'i-WARAN : ' . $subjectReference;

        $bodyPlainText = "Assalamualaikum\n\n"
            . "Satu rekod i-Waran telah dihantar ke daerah " . ($warrant->daerah?->name ?: '-') . " untuk tindakan lanjut.\n\n"
            . "No. Ruj Fail Waran: " . ($warrant->no_ruj_fail ?: '-') . "\n"
            . "Nama OKT: " . ($warrant->nama_okt ?: '-') . "\n"
            . "Mahkamah: " . ($warrant->mahkamah?->nama ?: '-') . "\n"
            . "Tarikh Perbicaraan: " . ($warrant->tarikh_bicara ? Carbon::parse($warrant->tarikh_bicara)->format('d-m-Y') : '-') . "\n\n"
            . "Sila semak dan ambil tindakan melalui modul i-Waran.\n\n"
            . "Terima kasih.";

        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . nl2br(e($bodyPlainText))
            . '</div>';

        $mailFrom = (array) config('mail.iwaran.from', []);
        $fromAddress = trim((string) ($mailFrom['address'] ?? ''));
        $fromName = trim((string) ($mailFrom['name'] ?? ''));

        try {
            Mail::mailer('iwaran_smtp')->send([], [], function ($message) use ($recipients, $subject, $html, $warrant, $fromAddress, $fromName): void {
                $message->to($recipients['to'])
                    ->subject($subject)
                    ->html($html);

                if ($fromAddress !== '') {
                    $message->from($fromAddress, $fromName !== '' ? $fromName : null);
                }

                if (! empty($recipients['cc'])) {
                    $message->cc($recipients['cc']);
                }

                foreach (($warrant->courtDocuments ?? []) as $document) {
                    $disk = $document->disk ?: 'local';
                    if (! $document->path || ! Storage::disk($disk)->exists($document->path)) {
                        continue;
                    }

                    $message->attachData(
                        Storage::disk($disk)->get($document->path),
                        $document->file_name,
                        ['mime' => $document->mime ?: 'application/octet-stream']
                    );
                }
            });

            Log::info('i-Waran dispatch email sent', [
                'iwaran_id' => $warrant->id,
                'to_count' => count($recipients['to']),
                'cc_count' => count($recipients['cc']),
                'subject' => $subject,
            ]);

            return [
                'sent' => true,
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
                'subject' => $subject,
            ];
        } catch (\Throwable $e) {
            Log::warning('i-Waran dispatch email failed', [
                'iwaran_id' => $warrant->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'reason' => 'send_failed',
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
            ];
        }
    }

    private function resolveIwaranCourtRecipients(IwaranWarrant $warrant): array
    {
        return [
            'to' => $this->normalizeEmailList([
                (string) ($warrant->emel_mahkamah ?? ''),
            ]),
            'cc' => [],
        ];
    }

    private function sendExecutionEmailToCourt(IwaranWarrant $warrant): array
    {
        $warrant->loadMissing([
            'daerah:id,name',
            'mahkamah:id,nama',
            'attachments',
            'pelaksana:id,name',
        ]);

        $recipients = $this->resolveIwaranCourtRecipients($warrant);
        if (empty($recipients['to'])) {
            return [
                'sent' => false,
                'reason' => 'invalid_recipient_config',
                'to' => [],
                'cc' => [],
            ];
        }

        $subjectReference = trim((string) ($warrant->no_ruj_fail ?: ('Waran #' . $warrant->id)));
        $subject = 'LAPORAN PELAKSANAAN i-WARAN : ' . $subjectReference;

        $statusLabel = $this->getWarrantStageLabel($this->resolveWarrantStage($warrant));
        $executionDateTime = $warrant->tarikh_masa_perlaksanaan_1 ?: $warrant->tarikh_masa_perlaksanaan_2 ?: $warrant->tarikh_masa_perlaksanaan_3;
        $bodyPlainText = "Assalamualaikum\n\n"
            . "Laporan pelaksanaan i-Waran dikemukakan untuk rujukan pihak mahkamah.\n\n"
            . "No. Ruj Fail Waran: " . ($warrant->no_ruj_fail ?: '-') . "\n"
            . "Nama OKT: " . ($warrant->nama_okt ?: '-') . "\n"
            . "Mahkamah: " . ($warrant->mahkamah?->nama ?: '-') . "\n"
            . "Daerah Pelaksanaan: " . ($warrant->daerah?->name ?: '-') . "\n"
            . "Status Pelaksanaan: " . ($warrant->status ? Str::title(str_replace('_', ' ', (string) $warrant->status)) : $statusLabel) . "\n"
            . "Tarikh/Masa Pelaksanaan: " . ($executionDateTime ? Carbon::parse($executionDateTime)->format('d-m-Y H:i') : '-') . "\n"
            . "Tindakan Oleh: " . ($warrant->pelaksana?->name ?: '-') . "\n\n"
            . "Sila rujuk lampiran pelaksana yang disertakan.\n\n"
            . "Terima kasih.";

        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . nl2br(e($bodyPlainText))
            . '</div>';

        $mailFrom = (array) config('mail.iwaran.from', []);
        $fromAddress = trim((string) ($mailFrom['address'] ?? ''));
        $fromName = trim((string) ($mailFrom['name'] ?? ''));

        try {
            Mail::mailer('iwaran_smtp')->send([], [], function ($message) use ($recipients, $subject, $html, $warrant, $fromAddress, $fromName): void {
                $message->to($recipients['to'])
                    ->subject($subject)
                    ->html($html);

                if ($fromAddress !== '') {
                    $message->from($fromAddress, $fromName !== '' ? $fromName : null);
                }

                foreach (($warrant->attachments ?? []) as $attachment) {
                    $disk = $attachment->disk ?: 'local';
                    if (! $attachment->path || ! Storage::disk($disk)->exists($attachment->path)) {
                        continue;
                    }

                    $message->attachData(
                        Storage::disk($disk)->get($attachment->path),
                        $attachment->file_name,
                        ['mime' => $attachment->mime ?: 'application/octet-stream']
                    );
                }
            });

            Log::info('i-Waran court email sent', [
                'iwaran_id' => $warrant->id,
                'to_count' => count($recipients['to']),
                'subject' => $subject,
            ]);

            return [
                'sent' => true,
                'to' => $recipients['to'],
                'cc' => [],
                'subject' => $subject,
            ];
        } catch (\Throwable $e) {
            Log::warning('i-Waran court email failed', [
                'iwaran_id' => $warrant->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'reason' => 'send_failed',
                'to' => $recipients['to'],
                'cc' => [],
            ];
        }
    }

    private function getWarrantStageLabel(?string $stage): string
    {
        return match ((string) $stage) {
            IwaranWarrant::STAGE_DIHANTAR_KE_DAERAH => 'Dihantar ke Daerah',
            IwaranWarrant::STAGE_DITERIMA_DAERAH => 'Diterima Daerah',
            IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH => 'Hantar ke Mahkamah',
            default => 'Baru',
        };
    }

    private function resolveWarrantStage(IwaranWarrant $warrant): string
    {
        if (! empty($warrant->sent_to_court_at)) {
            return IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH;
        }

        $currentStage = (string) ($warrant->current_stage ?: IwaranWarrant::STAGE_BARU);
        if (in_array($currentStage, [
            IwaranWarrant::STAGE_BARU,
            IwaranWarrant::STAGE_DIHANTAR_KE_DAERAH,
            IwaranWarrant::STAGE_DITERIMA_DAERAH,
            IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH,
        ], true)) {
            return $currentStage;
        }

        // Normalize rekod lama yang pernah menggunakan stage untuk status pelaksanaan.
        return IwaranWarrant::STAGE_DITERIMA_DAERAH;
    }

    private function appendWorkflowMeta(IwaranWarrant $warrant, $user): array
    {
        $currentStage = $this->resolveWarrantStage($warrant);

        $payload = array_merge($warrant->toArray(), [
            'current_stage' => $currentStage,
            'current_stage_label' => $this->getWarrantStageLabel($currentStage),
            'can_dispatch' => $this->canDispatchWarrant($user, $warrant),
            'can_pickup' => $this->canPickupWarrant($user, $warrant),
            'can_send_to_court' => $this->canSendWarrantToCourt($user, $warrant),
            'court_delivery_label' => ! empty($warrant->sent_to_court_at) ? 'Telah hantar ke Mahkamah' : null,
            'is_deleted' => ! is_null($warrant->deleted_at),
            'can_restore' => ! is_null($warrant->deleted_at) && $this->isSystemUser($user),
        ]);

        if (! $this->canViewAudit($user)) {
            unset($payload['created_by'], $payload['updated_by'], $payload['deleted_by']);
        }

        return $payload;
    }

    private function csvCell($value): string
    {
        $str = (string)($value ?? '');
        $str = str_replace(["\r\n", "\n", "\r"], ' ', $str);
        $str = str_replace('"', '""', $str);
        return "\"{$str}\"";
    }

    private function csvRow(array $cells): string
    {
        return implode(',', array_map(fn ($v) => $this->csvCell($v), $cells)) . "\r\n";
    }

    public function store(Request $request, IwaranReferenceService $referenceService): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'jenis_waran' => ['nullable', 'in:tangkap,geledah'],
            'no_ruj_fail' => ['nullable', 'string'],
            'tarikh_masa_terima' => ['required', 'date'],
            'tahun' => ['required', 'integer', 'digits:4'],
            'no_kes' => ['nullable', 'string'],
            'jenis_kes_mal_id' => ['nullable', 'integer'],
            'jenis_kes_mal_lain' => ['nullable', 'string', 'max:255'],
            'jenis_kes_jenayah_id' => ['nullable', 'integer'],
            'jenis_kes_jenayah_lain' => ['nullable', 'string', 'max:255'],
            'mahkamah_id' => ['nullable', 'integer'],
            'daerah_id' => ['nullable', 'integer'],
            'emel' => $this->emailListValidationRules(),
            'emel_mahkamah' => $this->emailListValidationRules(),
            'tarikh_bicara' => ['nullable', 'date'],
            'fail_waran' => ['nullable', 'string'],
            'nama_okt' => ['nullable', 'string'],
            'no_kp_okt' => ['nullable', 'string'],
            'alamat_okt' => ['nullable', 'string'],
            'telefon_okt' => ['nullable', 'string'],
            'catatan_pendaftar' => ['nullable', 'string'],
            'tindakan_oleh_staff_id' => ['nullable', 'integer'],
            'alamat_pejabat' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'jumlah_perlaksanaan' => ['nullable', 'integer'],
            'tarikh_masa_perlaksanaan_1' => ['nullable', 'date'],
            'tarikh_masa_perlaksanaan_2' => ['nullable', 'date'],
            'tarikh_masa_perlaksanaan_3' => ['nullable', 'date'],
            'hasil_perlaksanaan_id' => ['nullable', 'integer'],
            'laporan' => ['nullable', 'string'],
            'catatan_pelaksana' => ['nullable', 'string'],
        ]);

        $pendaftarStaffId = optional($user?->staff)->id;
        if ($pendaftarStaffId) {
            $data['pendaftar_staff_id'] = $pendaftarStaffId;
        }
        $data['status'] = $data['status'] ?? 'draf';
        $data['current_stage'] = IwaranWarrant::STAGE_BARU;
        $this->applyWorkflowStageFromStatus($data);
        $data['tahun'] = (int) ($data['tahun'] ?? Carbon::parse($data['tarikh_masa_terima'] ?? now())->format('Y'));

        $providedNoRujFail = trim((string) ($data['no_ruj_fail'] ?? ''));
        if ($providedNoRujFail === '') {
            $districtId = (int) ($data['daerah_id'] ?? 0);
            if ($districtId <= 0) {
                return response()->json([
                    'message' => 'Daerah wajib dipilih untuk jana No. Ruj Fail waran.',
                    'errors' => [
                        'daerah_id' => ['Daerah wajib dipilih untuk jana No. Ruj Fail waran.'],
                    ],
                ], 422);
            }

            $data['no_ruj_fail'] = $referenceService->generateReferenceNo($districtId, (int) $data['tahun']);
        } else {
            $data['no_ruj_fail'] = $providedNoRujFail;
        }

        $iwaranWarrant = IwaranWarrant::create($data);

        return response()->json([
            'message' => 'Waran disimpan.',
            'data' => $iwaranWarrant,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = IwaranWarrant::query()
            ->latest()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
                'receivedBy:id,name',
                'sentToDistrictBy:id,name',
            ]);

        $scope = trim((string) $request->query('scope', 'active'));
        if ($scope === 'deleted') {
            if (! $this->isSystemUser($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $query->onlyTrashed();
        }

        $this->applyIwaranAccessScope($query, $user);

        if ($request->filled('keyword')) {
            $keyword = strtolower($request->string('keyword')->toString());
            $query->where(function ($builder) use ($keyword) {
                $builder->whereRaw('LOWER(no_kes) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(no_ruj_fail) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(nama_okt) LIKE ?', ["%{$keyword}%"]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('current_stage')) {
            $query->where('current_stage', $request->string('current_stage')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $perPage = $request->integer('per_page', 10);
        if ($perPage <= 0 || $perPage > 500) {
            $perPage = 10;
        }
        $items = $query->paginate($perPage);

        $rows = collect($items->items())->map(fn (IwaranWarrant $warrant) => $this->appendWorkflowMeta($warrant, $user))->values();

        return response()->json([
            'message' => 'Senarai waran',
            'data' => $rows,
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function semakanOkt(Request $request): JsonResponse
    {
        $query = IwaranWarrant::query()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
            ])
            ->orderByDesc('tarikh_bicara')
            ->orderByDesc('id');

        if ($request->filled('nama')) {
            $keyword = strtolower($request->string('nama')->toString());
            $query->whereRaw('LOWER(nama_okt) LIKE ?', ["%{$keyword}%"]);
        }

        if ($request->filled('no_kp')) {
            $keyword = strtolower($request->string('no_kp')->toString());
            $query->whereRaw('LOWER(no_kp_okt) LIKE ?', ["%{$keyword}%"]);
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_bicara', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_bicara', '<=', $request->string('to_date')->toString());
        }

        $perPage = $request->integer('per_page', 10);
        if ($perPage <= 0 || $perPage > 500) {
            $perPage = 10;
        }
        $items = $query->paginate($perPage);

        return response()->json([
            'message' => 'Semakan nama OKT waran',
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function reportSummary(Request $request): JsonResponse
    {
        $query = IwaranWarrant::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $total = (clone $query)->count();

        $byStatus = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();

        $byJenisWaran = (clone $query)
            ->select('jenis_waran', DB::raw('COUNT(*) as total'))
            ->groupBy('jenis_waran')
            ->orderByDesc('total')
            ->get();

        $byDistrict = (clone $query)
            ->leftJoin('districts', 'iwaran_warans.daerah_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(iwaran_warans.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $byDate = (clone $query)
            ->whereNotNull('tarikh_masa_terima')
            ->select(DB::raw('DATE(tarikh_masa_terima) as date'), DB::raw('COUNT(*) as total'))
            ->groupBy(DB::raw('DATE(tarikh_masa_terima)'))
            ->orderBy('date')
            ->get();

        return response()->json([
            'message' => 'Ringkasan laporan i-WARAN',
            'data' => [
                'total' => $total,
                'by_status' => $byStatus,
                'by_jenis_waran' => $byJenisWaran,
                'by_district' => $byDistrict,
                'by_date' => $byDate,
            ],
        ]);
    }

    public function calendarStatus(Request $request): JsonResponse
    {
        $monthInput = trim((string) $request->query('month', now()->format('Y-m')));
        if (!preg_match('/^\d{4}\-(0[1-9]|1[0-2])$/', $monthInput)) {
            return response()->json([
                'message' => 'Format bulan tidak sah. Guna YYYY-MM.',
            ], 422);
        }

        $monthStart = Carbon::createFromFormat('Y-m', $monthInput)->startOfMonth();
        $monthEnd = (clone $monthStart)->endOfMonth();

        $dateField = (string) $request->query('date_field', 'all');
        $allowedDateFields = [
            'all' => 'Semua',
            'tarikh_bicara' => 'Tarikh Bicara',
            'tarikh_masa_terima' => 'Tarikh / Masa Terima',
        ];
        if (!array_key_exists($dateField, $allowedDateFields)) {
            return response()->json([
                'message' => 'Parameter date_field tidak sah.',
            ], 422);
        }

        $query = IwaranWarrant::query()
            ->with(['daerah:id,name']);

        if ($dateField === 'all') {
            $query->where(function ($builder) use ($monthStart, $monthEnd) {
                $builder->whereBetween(DB::raw('DATE(tarikh_bicara)'), [$monthStart->toDateString(), $monthEnd->toDateString()])
                    ->orWhereBetween(DB::raw('DATE(tarikh_masa_terima)'), [$monthStart->toDateString(), $monthEnd->toDateString()]);
            });
        } else {
            $query->whereNotNull($dateField)
                ->whereBetween(DB::raw("DATE({$dateField})"), [$monthStart->toDateString(), $monthEnd->toDateString()]);
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        $statusLabels = [
            'draf' => 'Draf',
            'berjaya' => 'Berjaya',
            'tidak_berjaya' => 'Tidak Berjaya',
            'dalam_proses' => 'Dalam Proses',
            'kembalian' => 'Kembalian',
        ];

        $orderByColumn = $dateField === 'all' ? 'tarikh_bicara' : $dateField;

        $rows = $query
            ->orderBy($orderByColumn)
            ->orderByDesc('id')
            ->get([
                'id',
                'no_kes',
                'daerah_id',
                'tarikh_bicara',
                'tarikh_masa_terima',
                'status',
            ]);

        $events = $rows->map(function (IwaranWarrant $row) use ($statusLabels, $dateField, $allowedDateFields, $monthStart, $monthEnd) {
            $resolvedDateField = $dateField;
            $resolvedDate = null;

            $bicaraDate = $row->tarikh_bicara ? Carbon::parse((string) $row->tarikh_bicara) : null;
            $terimaDate = $row->tarikh_masa_terima ? Carbon::parse((string) $row->tarikh_masa_terima) : null;

            if ($dateField === 'all') {
                if ($bicaraDate && $bicaraDate->between($monthStart, $monthEnd, true)) {
                    $resolvedDateField = 'tarikh_bicara';
                    $resolvedDate = $bicaraDate;
                } elseif ($terimaDate && $terimaDate->between($monthStart, $monthEnd, true)) {
                    $resolvedDateField = 'tarikh_masa_terima';
                    $resolvedDate = $terimaDate;
                } elseif ($bicaraDate) {
                    $resolvedDateField = 'tarikh_bicara';
                    $resolvedDate = $bicaraDate;
                } elseif ($terimaDate) {
                    $resolvedDateField = 'tarikh_masa_terima';
                    $resolvedDate = $terimaDate;
                }
            } else {
                $resolvedDate = $dateField === 'tarikh_bicara' ? $bicaraDate : $terimaDate;
            }

            $date = $resolvedDate ? $resolvedDate->format('Y-m-d') : null;

            return [
                'id' => $row->id,
                'date' => $date,
                'date_field' => $resolvedDateField,
                'date_field_label' => $allowedDateFields[$resolvedDateField] ?? $resolvedDateField,
                'status' => $row->status ?: 'draf',
                'status_label' => $statusLabels[$row->status] ?? ucfirst(str_replace('_', ' ', (string) $row->status)),
                'no_kes' => $row->no_kes ?: '-',
                'district_name' => optional($row->daerah)->name ?: '-',
            ];
        })->filter(fn ($item) => !empty($item['date']))->values();

        $byDate = $events
            ->groupBy('date')
            ->map(fn ($items) => $items->values())
            ->sortKeys()
            ->all();

        $byStatus = $events
            ->groupBy('status')
            ->map(fn ($items, $status) => [
                'status' => $status,
                'label' => $statusLabels[$status] ?? ucfirst(str_replace('_', ' ', (string) $status)),
                'total' => $items->count(),
            ])
            ->values()
            ->sortByDesc('total')
            ->values();

        return response()->json([
            'message' => 'Kalendar i-WARAN',
            'data' => [
                'month' => $monthStart->format('Y-m'),
                'from_date' => $monthStart->toDateString(),
                'to_date' => $monthEnd->toDateString(),
                'date_field' => $dateField,
                'date_field_label' => $allowedDateFields[$dateField] ?? $dateField,
                'available_date_fields' => collect($allowedDateFields)->map(
                    fn ($label, $value) => ['value' => $value, 'label' => $label]
                )->values(),
                'total' => $events->count(),
                'by_status' => $byStatus,
                'by_date' => $byDate,
            ],
        ]);
    }

    public function exportCsv(Request $request)
    {
        $query = IwaranWarrant::query()
            ->latest()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
                'jenisKesMal:id,nama',
                'jenisKesJenayah:id,nama',
                'hasilPerlaksanaan:id,nama',
            ]);

        if ($request->filled('keyword')) {
            $keyword = strtolower($request->string('keyword')->toString());
            $query->where(function ($builder) use ($keyword) {
                $builder->whereRaw('LOWER(no_kes) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(no_ruj_fail) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(nama_okt) LIKE ?', ["%{$keyword}%"]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $filename = 'i-waran-export-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            // BOM for Excel compatibility
            echo "\xEF\xBB\xBF";

            echo $this->csvRow([
                'ID',
                'No Ruj Fail',
                'Jenis Waran',
                'No Kes',
                'Daerah',
                'Tarikh/Masa Terima',
                'Status',
                'Nama OKT',
                'No KP OKT',
                'Telefon OKT',
                'Mahkamah',
                'Tarikh Bicara',
                'Email',
                'Email Mahkamah',
                'Pendaftar',
                'Pelaksana',
                'Alamat Pejabat',
                'Jumlah Perlaksanaan',
                'Hasil Perlaksanaan',
                'Laporan',
                'Catatan Pendaftar',
                'Catatan Pelaksana',
                'Created At',
                'Updated At',
            ]);

            $query->chunk(200, function ($items) {
                foreach ($items as $row) {
                    echo $this->csvRow([
                        $row->id,
                        $row->no_ruj_fail,
                        $row->jenis_waran,
                        $row->no_kes,
                        optional($row->daerah)->name,
                        $row->tarikh_masa_terima,
                        $row->status,
                        $row->nama_okt,
                        $row->no_kp_okt,
                        $row->telefon_okt,
                        optional($row->mahkamah)->nama,
                        $row->tarikh_bicara,
                        $row->emel,
                        $row->emel_mahkamah,
                        optional($row->pendaftar)->name,
                        optional($row->pelaksana)->name,
                        $row->alamat_pejabat,
                        $row->jumlah_perlaksanaan,
                        optional($row->hasilPerlaksanaan)->nama,
                        $row->laporan,
                        $row->catatan_pendaftar,
                        $row->catatan_pelaksana,
                        $row->created_at,
                        $row->updated_at,
                    ]);
                }
            });
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function exportReportCsv(Request $request)
    {
        $query = IwaranWarrant::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $total = (clone $query)->count();
        $byStatus = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();
        $byDistrict = (clone $query)
            ->leftJoin('districts', 'iwaran_warans.daerah_id', '=', 'districts.id')
            ->select(
                'districts.name as district_name',
                DB::raw('COUNT(iwaran_warans.id) as total')
            )
            ->groupBy('districts.name')
            ->orderByDesc('total')
            ->get();
        $byDate = (clone $query)
            ->whereNotNull('tarikh_masa_terima')
            ->select(DB::raw('DATE(tarikh_masa_terima) as date'), DB::raw('COUNT(*) as total'))
            ->groupBy(DB::raw('DATE(tarikh_masa_terima)'))
            ->orderBy('date')
            ->get();
        $byJenisWaran = (clone $query)
            ->select('jenis_waran', DB::raw('COUNT(*) as total'))
            ->groupBy('jenis_waran')
            ->orderByDesc('total')
            ->get();

        $filename = 'i-waran-report-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($total, $byStatus, $byJenisWaran, $byDistrict, $byDate) {
            echo "\xEF\xBB\xBF";
            echo $this->csvRow(['Laporan i-WARAN']);
            echo $this->csvRow(['Jumlah', $total]);
            echo "\r\n";

            echo $this->csvRow(['Ikut Jenis Waran']);
            echo $this->csvRow(['Jenis Waran', 'Jumlah']);
            foreach ($byJenisWaran as $row) {
                echo $this->csvRow([$row->jenis_waran ?: 'Tidak diketahui', $row->total]);
            }
            echo "\r\n";

            echo $this->csvRow(['Ikut Status']);
            echo $this->csvRow(['Status', 'Jumlah']);
            foreach ($byStatus as $row) {
                echo $this->csvRow([$row->status, $row->total]);
            }
            echo "\r\n";

            echo $this->csvRow(['Ikut Daerah']);
            echo $this->csvRow(['Daerah', 'Jumlah']);
            foreach ($byDistrict as $row) {
                echo $this->csvRow([$row->district_name ?: 'Tidak diketahui', $row->total]);
            }
            echo "\r\n";

            echo $this->csvRow(['Ikut Tarikh Terima']);
            echo $this->csvRow(['Tarikh', 'Jumlah']);
            foreach ($byDate as $row) {
                echo $this->csvRow([$row->date, $row->total]);
            }
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function exportXlsx(Request $request)
    {
        $query = IwaranWarrant::query()
            ->latest()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
                'jenisKesMal:id,nama',
                'jenisKesJenayah:id,nama',
                'hasilPerlaksanaan:id,nama',
            ]);

        if ($request->filled('keyword')) {
            $keyword = strtolower($request->string('keyword')->toString());
            $query->where(function ($builder) use ($keyword) {
                $builder->whereRaw('LOWER(no_kes) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(no_ruj_fail) LIKE ?', ["%{$keyword}%"])
                    ->orWhereRaw('LOWER(nama_okt) LIKE ?', ["%{$keyword}%"]);
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $headers = [
            'ID',
            'No Ruj Fail',
            'Jenis Waran',
            'No Kes',
            'Daerah',
            'Tarikh/Masa Terima',
            'Status',
            'Nama OKT',
            'No KP OKT',
            'Telefon OKT',
            'Mahkamah',
            'Tarikh Bicara',
            'Email',
            'Email Mahkamah',
            'Pendaftar',
            'Pelaksana',
            'Alamat Pejabat',
            'Jumlah Perlaksanaan',
            'Hasil Perlaksanaan',
            'Laporan',
            'Catatan Pendaftar',
            'Catatan Pelaksana',
            'Created At',
            'Updated At',
        ];

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Warans');

        $sheet->fromArray($headers, null, 'A1');
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastCol}1")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFEFF6F2');
        $sheet->freezePane('A2');

        $rowIndex = 2;
        $query->chunk(200, function ($items) use (&$rowIndex, $sheet) {
            foreach ($items as $row) {
                $sheet->fromArray([
                    $row->id,
                    $row->no_ruj_fail,
                    $row->jenis_waran,
                    $row->no_kes,
                    optional($row->daerah)->name,
                    $row->tarikh_masa_terima,
                    $row->status,
                    $row->nama_okt,
                    $row->no_kp_okt,
                    $row->telefon_okt,
                    optional($row->mahkamah)->nama,
                    $row->tarikh_bicara,
                    $row->emel,
                    $row->emel_mahkamah,
                    optional($row->pendaftar)->name,
                    optional($row->pelaksana)->name,
                    $row->alamat_pejabat,
                    $row->jumlah_perlaksanaan,
                    optional($row->hasilPerlaksanaan)->nama,
                    $row->laporan,
                    $row->catatan_pendaftar,
                    $row->catatan_pelaksana,
                    optional($row->created_at)?->toDateTimeString(),
                    optional($row->updated_at)?->toDateTimeString(),
                ], null, "A{$rowIndex}");
                $rowIndex++;
            }
        });

        // Reasonable default column widths (Excel auto-size can be slow on large exports).
        $widths = [
            5, 18, 12, 18, 16, 20, 12, 22, 16, 14, 18, 14, 18, 18, 18, 18, 22, 10, 18, 30, 24, 24, 18, 18,
        ];
        foreach ($widths as $i => $w) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->getColumnDimension($col)->setWidth($w);
        }
        $sheet->getStyle("A1:{$lastCol}" . max(1, $rowIndex - 1))->getAlignment()->setWrapText(true);

        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $filename = 'i-waran-export-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportReportXlsx(Request $request)
    {
        $query = IwaranWarrant::query();

        if ($request->filled('status')) {
            $query->where('status', $request->string('status')->toString());
        }

        if ($request->filled('district_id')) {
            $query->where('daerah_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('tarikh_masa_terima', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('tarikh_masa_terima', '<=', $request->string('to_date')->toString());
        }

        $total = (clone $query)->count();
        $byStatus = (clone $query)
            ->select('status', DB::raw('COUNT(*) as total'))
            ->groupBy('status')
            ->orderByDesc('total')
            ->get();
        $byJenisWaran = (clone $query)
            ->select('jenis_waran', DB::raw('COUNT(*) as total'))
            ->groupBy('jenis_waran')
            ->orderByDesc('total')
            ->get();
        $byDistrict = (clone $query)
            ->leftJoin('districts', 'iwaran_warans.daerah_id', '=', 'districts.id')
            ->select('districts.name as district_name', DB::raw('COUNT(iwaran_warans.id) as total'))
            ->groupBy('districts.name')
            ->orderByDesc('total')
            ->get();
        $byDate = (clone $query)
            ->whereNotNull('tarikh_masa_terima')
            ->select(DB::raw('DATE(tarikh_masa_terima) as date'), DB::raw('COUNT(*) as total'))
            ->groupBy(DB::raw('DATE(tarikh_masa_terima)'))
            ->orderBy('date')
            ->get();

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        $makeSheet = function (string $title, array $headers) use ($spreadsheet) {
            $sheet = $spreadsheet->createSheet();
            $sheet->setTitle($title);
            $sheet->fromArray($headers, null, 'A1');
            $lastCol = Coordinate::stringFromColumnIndex(count($headers));
            $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
            $sheet->getStyle("A1:{$lastCol}1")->getFill()
                ->setFillType(Fill::FILL_SOLID)
                ->getStartColor()->setARGB('FFEFF6F2');
            $sheet->freezePane('A2');
            return $sheet;
        };

        $summarySheet = $makeSheet('Summary', ['Metrik', 'Nilai']);
        $summarySheet->fromArray([['Jumlah', $total]], null, 'A2');
        $summarySheet->getColumnDimension('A')->setWidth(24);
        $summarySheet->getColumnDimension('B')->setWidth(18);

        $jenisSheet = $makeSheet('By Jenis Waran', ['Jenis Waran', 'Jumlah']);
        $r = 2;
        foreach ($byJenisWaran as $row) {
            $jenisSheet->fromArray([[$row->jenis_waran ?: 'Tidak diketahui', $row->total]], null, "A{$r}");
            $r++;
        }
        $jenisSheet->getColumnDimension('A')->setWidth(18);
        $jenisSheet->getColumnDimension('B')->setWidth(12);

        $statusSheet = $makeSheet('By Status', ['Status', 'Jumlah']);
        $r = 2;
        foreach ($byStatus as $row) {
            $statusSheet->fromArray([[$row->status, $row->total]], null, "A{$r}");
            $r++;
        }
        $statusSheet->getColumnDimension('A')->setWidth(18);
        $statusSheet->getColumnDimension('B')->setWidth(12);

        $districtSheet = $makeSheet('By District', ['Daerah', 'Jumlah']);
        $r = 2;
        foreach ($byDistrict as $row) {
            $districtSheet->fromArray([[$row->district_name ?: 'Tidak diketahui', $row->total]], null, "A{$r}");
            $r++;
        }
        $districtSheet->getColumnDimension('A')->setWidth(22);
        $districtSheet->getColumnDimension('B')->setWidth(12);

        $dateSheet = $makeSheet('By Date', ['Tarikh', 'Jumlah']);
        $r = 2;
        foreach ($byDate as $row) {
            $dateSheet->fromArray([[$row->date, $row->total]], null, "A{$r}");
            $r++;
        }
        $dateSheet->getColumnDimension('A')->setWidth(14);
        $dateSheet->getColumnDimension('B')->setWidth(12);

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $filename = 'i-waran-report-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function exportSingleXlsx(IwaranWarrant $iwaranWarrant)
    {
        $iwaranWarrant->load([
            'daerah:id,name',
            'mahkamah:id,nama',
            'pendaftar:id,name',
            'pelaksana:id,name',
            'jenisKesMal:id,nama',
            'jenisKesJenayah:id,nama',
            'hasilPerlaksanaan:id,nama',
            'attachments',
        ]);

        $spreadsheet = new Spreadsheet();
        $spreadsheet->removeSheetByIndex(0);

        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle('Waran');
        $sheet->getColumnDimension('A')->setWidth(28);
        $sheet->getColumnDimension('B')->setWidth(58);

        $sheet->setCellValue('A1', 'Butiran Waran');
        $sheet->mergeCells('A1:B1');
        $sheet->getStyle('A1:B1')->getFont()->setBold(true)->setSize(14);
        $sheet->getStyle('A1:B1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFF6F2');

        $rows = [
            ['ID', $iwaranWarrant->id],
            ['No. Ruj Fail', $iwaranWarrant->no_ruj_fail],
            ['Jenis Waran', $iwaranWarrant->jenis_waran],
            ['No. Kes', $iwaranWarrant->no_kes],
            ['Daerah', optional($iwaranWarrant->daerah)->name],
            ['Tarikh/Masa Terima', $iwaranWarrant->tarikh_masa_terima],
            ['Status', $iwaranWarrant->status],
            ['Mahkamah', optional($iwaranWarrant->mahkamah)->nama],
            ['Tarikh Bicara', $iwaranWarrant->tarikh_bicara],
            ['Jenis Kes (Mal)', optional($iwaranWarrant->jenisKesMal)->nama],
            ['Jenis Kes (Jenayah)', optional($iwaranWarrant->jenisKesJenayah)->nama],
            ['Email', $iwaranWarrant->emel],
            ['Email Mahkamah', $iwaranWarrant->emel_mahkamah],
            ['Pendaftar', optional($iwaranWarrant->pendaftar)->name],
            ['Catatan Pendaftar', $iwaranWarrant->catatan_pendaftar],
            ['Nama OKT', $iwaranWarrant->nama_okt],
            ['No. KP OKT', $iwaranWarrant->no_kp_okt],
            ['Telefon OKT', $iwaranWarrant->telefon_okt],
            ['Alamat OKT', $iwaranWarrant->alamat_okt],
            ['Pelaksana', optional($iwaranWarrant->pelaksana)->name],
            ['Alamat Pejabat', $iwaranWarrant->alamat_pejabat],
            ['Jumlah Perlaksanaan', $iwaranWarrant->jumlah_perlaksanaan],
            ['Tarikh/Masa Perlaksanaan 1', $iwaranWarrant->tarikh_masa_perlaksanaan_1],
            ['Tarikh/Masa Perlaksanaan 2', $iwaranWarrant->tarikh_masa_perlaksanaan_2],
            ['Tarikh/Masa Perlaksanaan 3', $iwaranWarrant->tarikh_masa_perlaksanaan_3],
            ['Hasil Perlaksanaan', optional($iwaranWarrant->hasilPerlaksanaan)->nama],
            ['Laporan', $iwaranWarrant->laporan],
            ['Catatan Pelaksana', $iwaranWarrant->catatan_pelaksana],
            ['Created At', optional($iwaranWarrant->created_at)?->toDateTimeString()],
            ['Updated At', optional($iwaranWarrant->updated_at)?->toDateTimeString()],
        ];

        $startRow = 3;
        $sheet->fromArray($rows, null, "A{$startRow}");
        $sheet->getStyle("A{$startRow}:A" . ($startRow + count($rows) - 1))->getFont()->setBold(true);
        $sheet->getStyle("A{$startRow}:B" . ($startRow + count($rows) - 1))->getAlignment()->setWrapText(true);
        $sheet->freezePane('A3');

        $attSheet = $spreadsheet->createSheet();
        $attSheet->setTitle('Lampiran');
        $attSheet->fromArray(['Nama Fail', 'Mime', 'Saiz (Bytes)', 'Created At'], null, 'A1');
        $attSheet->getStyle('A1:D1')->getFont()->setBold(true);
        $attSheet->getStyle('A1:D1')->getFill()->setFillType(Fill::FILL_SOLID)->getStartColor()->setARGB('FFEFF6F2');
        $attSheet->freezePane('A2');
        $attSheet->getColumnDimension('A')->setWidth(54);
        $attSheet->getColumnDimension('B')->setWidth(22);
        $attSheet->getColumnDimension('C')->setWidth(14);
        $attSheet->getColumnDimension('D')->setWidth(20);

        $r = 2;
        foreach (($iwaranWarrant->attachments ?? []) as $att) {
            $attSheet->fromArray([[
                $att->file_name,
                $att->mime,
                $att->size,
                optional($att->created_at)?->toDateTimeString(),
            ]], null, "A{$r}");
            $r++;
        }

        $spreadsheet->setActiveSheetIndex(0);

        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $filename = 'i-waran-' . $iwaranWarrant->id . '-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function show(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $districtId = $this->getUserDistrictId($user);
        if ($user->hasRole('pegawai_daerah')) {
            if (! $districtId || (int) ($iwaranWarrant->daerah_id ?? 0) !== $districtId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        if ($request->query('only') === 'attachments') {
            $iwaranWarrant->load(['attachments']);
            $attachments = $iwaranWarrant->attachments->map(fn (IwaranWaranAttachment $attachment) => $this->transformAttachment($attachment));

            return response()->json([
                'message' => 'Lampiran waran',
                'data' => [
                    'attachments' => $attachments,
                ],
            ]);
        }

        if ($request->query('only') === 'court-documents') {
            $iwaranWarrant->load(['courtDocuments']);
            $courtDocuments = $iwaranWarrant->courtDocuments->map(fn (IwaranCourtDocument $document) => $this->transformCourtDocument($document));

            return response()->json([
                'message' => 'Dokumen mahkamah waran',
                'data' => [
                    'court_documents' => $courtDocuments,
                ],
            ]);
        }

        $relations = [
            'createdBy:id,name',
            'updatedBy:id,name',
            'deletedBy:id,name',
            'daerah:id,name',
            'mahkamah:id,nama',
            'pendaftar:id,name',
            'pelaksana:id,name',
                'receivedBy:id,name',
                'sentToDistrictBy:id,name',
                'sentToCourtBy:id,name',
                'jenisKesMal:id,nama',
                'jenisKesJenayah:id,nama',
                'hasilPerlaksanaan:id,nama',
        ];

        if (! $request->boolean('lightweight')) {
            $relations[] = 'attachments';
            $relations[] = 'courtDocuments';
        }

        $iwaranWarrant->load($relations);

        $attachments = collect();
        if ($iwaranWarrant->relationLoaded('attachments')) {
            $attachments = $iwaranWarrant->attachments->map(fn (IwaranWaranAttachment $attachment) => $this->transformAttachment($attachment));
        }

        $courtDocuments = collect();
        if ($iwaranWarrant->relationLoaded('courtDocuments')) {
            $courtDocuments = $iwaranWarrant->courtDocuments->map(fn (IwaranCourtDocument $document) => $this->transformCourtDocument($document));
        }

        return response()->json([
            'message' => 'Maklumat waran',
            'data' => array_merge($this->appendWorkflowMeta($iwaranWarrant, $user), [
                'attachments' => $attachments,
                'court_documents' => $courtDocuments,
            ]),
        ]);
    }

    public function update(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $districtId = $this->getUserDistrictId($user);
        if ($user->hasRole('pegawai_daerah')) {
            if (! $districtId || (int) ($iwaranWarrant->daerah_id ?? 0) !== $districtId) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $data = $request->validate([
            'jenis_waran' => ['nullable', 'in:tangkap,geledah'],
            'no_ruj_fail' => ['nullable', 'string'],
            'tarikh_masa_terima' => ['required', 'date'],
            'tahun' => ['required', 'integer', 'digits:4'],
            'no_kes' => ['nullable', 'string'],
            'jenis_kes_mal_id' => ['nullable', 'integer'],
            'jenis_kes_mal_lain' => ['nullable', 'string', 'max:255'],
            'jenis_kes_jenayah_id' => ['nullable', 'integer'],
            'jenis_kes_jenayah_lain' => ['nullable', 'string', 'max:255'],
            'mahkamah_id' => ['nullable', 'integer'],
            'daerah_id' => ['nullable', 'integer'],
            'emel' => $this->emailListValidationRules(),
            'emel_mahkamah' => $this->emailListValidationRules(),
            'tarikh_bicara' => ['nullable', 'date'],
            'fail_waran' => ['nullable', 'string'],
            'nama_okt' => ['nullable', 'string'],
            'no_kp_okt' => ['nullable', 'string'],
            'alamat_okt' => ['nullable', 'string'],
            'telefon_okt' => ['nullable', 'string'],
            'catatan_pendaftar' => ['nullable', 'string'],
            'tindakan_oleh_staff_id' => ['nullable', 'integer'],
            'alamat_pejabat' => ['nullable', 'string'],
            'status' => ['nullable', 'string'],
            'jumlah_perlaksanaan' => ['nullable', 'integer'],
            'tarikh_masa_perlaksanaan_1' => ['nullable', 'date'],
            'tarikh_masa_perlaksanaan_2' => ['nullable', 'date'],
            'tarikh_masa_perlaksanaan_3' => ['nullable', 'date'],
            'hasil_perlaksanaan_id' => ['nullable', 'integer'],
            'laporan' => ['nullable', 'string'],
            'catatan_pelaksana' => ['nullable', 'string'],
        ]);

        $data['status'] = $data['status'] ?? ($iwaranWarrant->status ?: 'draf');
        $this->applyWorkflowStageFromStatus($data, $iwaranWarrant);

        $iwaranWarrant->update($data);

        return response()->json([
            'message' => 'Waran dikemaskini.',
                'data' => $this->appendWorkflowMeta(
                $iwaranWarrant->fresh()->load(['daerah:id,name', 'receivedBy:id,name', 'sentToDistrictBy:id,name', 'sentToCourtBy:id,name']),
                $user
            ),
        ]);
    }

    public function dispatchToDistrict(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user || ! $user->hasAnyRole(['pegawai_hq', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (! $iwaranWarrant->daerah_id) {
            return response()->json([
                'message' => 'Daerah waran belum dipilih.',
                'errors' => [
                    'daerah_id' => ['Daerah waran belum dipilih.'],
                ],
            ], 422);
        }

        $emailMeta = $this->sendDispatchEmailToDistrict($iwaranWarrant->fresh());
        if (($emailMeta['sent'] ?? false) !== true) {
            return response()->json([
                'message' => empty($emailMeta['to'] ?? [])
                    ? 'Email daerah belum lengkap. Sila semak email daerah.'
                    : 'Gagal menghantar email i-Waran ke daerah.',
                'meta' => [
                    'dispatch_email' => $emailMeta,
                ],
            ], 422);
        }

        $iwaranWarrant->update([
            'current_stage' => IwaranWarrant::STAGE_DIHANTAR_KE_DAERAH,
            'sent_to_district_at' => now(),
            'sent_to_district_by_user_id' => $user->id,
            'received_at' => null,
            'received_by_user_id' => null,
        ]);

        return response()->json([
            'message' => 'Waran berjaya dihantar ke daerah.',
            'meta' => [
                'dispatch_email' => $emailMeta,
            ],
                'data' => $this->appendWorkflowMeta(
                $iwaranWarrant->fresh()->load(['daerah:id,name', 'receivedBy:id,name', 'sentToDistrictBy:id,name', 'sentToCourtBy:id,name']),
                $user
            ),
        ]);
    }

    public function pickup(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $maintenanceOverride = $this->canBypassWorkflowLocks($user);
        $districtId = $this->getUserDistrictId($user);
        if (! $maintenanceOverride && (! $districtId || (int) ($iwaranWarrant->daerah_id ?? 0) !== $districtId)) {
            return response()->json(['message' => 'Waran ini bukan untuk daerah anda.'], 403);
        }

        if (! $maintenanceOverride && (string) $iwaranWarrant->current_stage !== IwaranWarrant::STAGE_DIHANTAR_KE_DAERAH) {
            return response()->json(['message' => 'Waran ini tidak berada dalam queue penerimaan daerah.'], 422);
        }

        if (
            ! $maintenanceOverride
            && $iwaranWarrant->received_by_user_id
            && (int) $iwaranWarrant->received_by_user_id !== (int) $user->id
        ) {
            return response()->json(['message' => 'Waran ini telah diterima oleh pegawai lain.'], 422);
        }

        $iwaranWarrant->update([
            'current_stage' => $maintenanceOverride
                && (string) $iwaranWarrant->current_stage === IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH
                    ? IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH
                    : IwaranWarrant::STAGE_DITERIMA_DAERAH,
            'received_by_user_id' => $user->id,
            'received_at' => now(),
        ]);

        return response()->json([
            'message' => 'Waran berjaya diterima.',
                'data' => $this->appendWorkflowMeta(
                $iwaranWarrant->fresh()->load(['daerah:id,name', 'receivedBy:id,name', 'sentToDistrictBy:id,name', 'sentToCourtBy:id,name']),
                $user
            ),
        ]);
    }

    public function sendToCourt(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $this->ensureAuthorizedWaranUser($request);
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (! $this->canSendWarrantToCourt($user, $iwaranWarrant)) {
            return response()->json(['message' => 'Waran belum sedia untuk dihantar ke mahkamah.'], 422);
        }

        $emailMeta = $this->sendExecutionEmailToCourt($iwaranWarrant->fresh());
        if (($emailMeta['sent'] ?? false) !== true) {
            return response()->json([
                'message' => empty($emailMeta['to'] ?? [])
                    ? 'Email mahkamah belum lengkap. Sila semak email mahkamah.'
                    : 'Gagal menghantar email i-Waran ke mahkamah.',
                'meta' => [
                    'court_email' => $emailMeta,
                ],
            ], 422);
        }

        $iwaranWarrant->update([
            'sent_to_court_at' => now(),
            'sent_to_court_by_user_id' => $user->id,
            'current_stage' => IwaranWarrant::STAGE_HANTAR_KE_MAHKAMAH,
        ]);

        return response()->json([
            'message' => 'Email i-Waran berjaya dihantar ke mahkamah.',
            'meta' => [
                'court_email' => $emailMeta,
            ],
            'data' => $this->appendWorkflowMeta(
                $iwaranWarrant->fresh()->load(['daerah:id,name', 'receivedBy:id,name', 'sentToDistrictBy:id,name', 'sentToCourtBy:id,name']),
                $user
            ),
        ]);
    }

    public function uploadAttachments(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'max:20'],
            'files.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:51200'], // 50MB per file (max is in KB)
        ]);

        $stored = [];
        $disk = 'local'; // keep attachments private; downloads go through auth route
        $baseDir = "iwaran/{$iwaranWarrant->id}";
        $userId = optional($request->user())->id;

        foreach ($request->file('files', []) as $file) {
            $originalName = $file->getClientOriginalName();
            $ext = $file->getClientOriginalExtension();
            $safeBase = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
            $storedName = time() . '-' . Str::random(8) . '-' . ($safeBase ?: 'file') . ($ext ? ".{$ext}" : '');
            $path = $file->storeAs($baseDir, $storedName, $disk);

            $attachment = IwaranWaranAttachment::create([
                'iwaran_waran_id' => $iwaranWarrant->id,
                'user_id' => $userId,
                'file_name' => $originalName,
                'disk' => $disk,
                'path' => $path,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            $stored[] = [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'mime' => $attachment->mime,
                'size' => $attachment->size,
                'created_at' => $attachment->created_at,
                'download_url' => route('iwaran.attachments.download', ['attachment' => $attachment->id]),
            ];
        }

        return response()->json([
            'message' => 'Fail berjaya dimuat naik.',
            'data' => $stored,
        ], 201);
    }

    public function uploadCourtDocuments(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $request->validate([
            'files' => ['required', 'array', 'max:20'],
            'files.*' => ['required', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:51200'],
        ]);

        $stored = [];
        $disk = 'local';
        $baseDir = "iwaran/{$iwaranWarrant->id}/court-documents";
        $userId = optional($request->user())->id;

        foreach ($request->file('files', []) as $file) {
            $originalName = $file->getClientOriginalName();
            $ext = $file->getClientOriginalExtension();
            $safeBase = Str::slug(pathinfo($originalName, PATHINFO_FILENAME));
            $storedName = time() . '-' . Str::random(8) . '-' . ($safeBase ?: 'court-document') . ($ext ? ".{$ext}" : '');
            $path = $file->storeAs($baseDir, $storedName, $disk);

            $document = IwaranCourtDocument::create([
                'iwaran_waran_id' => $iwaranWarrant->id,
                'user_id' => $userId,
                'file_name' => $originalName,
                'disk' => $disk,
                'path' => $path,
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
            ]);

            $stored[] = $this->transformCourtDocument($document);
        }

        return response()->json([
            'message' => 'Dokumen mahkamah berjaya dimuat naik.',
            'data' => $stored,
        ], 201);
    }

    public function downloadAttachment(Request $request, IwaranWaranAttachment $attachment)
    {
        $disk = $attachment->disk ?: 'local';
        if (!Storage::disk($disk)->exists($attachment->path)) {
            return response()->json(['message' => 'Fail tidak dijumpai.'], 404);
        }

        return Storage::disk($disk)->download($attachment->path, $attachment->file_name);
    }

    public function deleteAttachment(Request $request, IwaranWaranAttachment $attachment): JsonResponse
    {
        $attachment->delete();

        return response()->json([
            'message' => 'Fail dipadam.',
        ]);
    }

    public function downloadCourtDocument(Request $request, IwaranCourtDocument $document)
    {
        $disk = $document->disk ?: 'local';
        if (!Storage::disk($disk)->exists($document->path)) {
            return response()->json(['message' => 'Fail tidak dijumpai.'], 404);
        }

        return Storage::disk($disk)->download($document->path, $document->file_name);
    }

    public function deleteCourtDocument(Request $request, IwaranCourtDocument $document): JsonResponse
    {
        $document->delete();

        return response()->json([
            'message' => 'Dokumen mahkamah dipadam.',
        ]);
    }

    public function destroy(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! method_exists($user, 'hasAnyRole') || ! $user->hasAnyRole(['pegawai_hq', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $iwaranWarrant->load(['attachments', 'courtDocuments']);

        $iwaranWarrant->delete();

        return response()->json([
            'message' => 'Waran dipadam.',
        ]);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $this->isSystemUser($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $iwaranWarrant = IwaranWarrant::withTrashed()
            ->with(['attachments', 'courtDocuments'])
            ->find($id);

        if (! $iwaranWarrant || ! $iwaranWarrant->trashed()) {
            return response()->json(['message' => 'Rekod waran dipadam tidak dijumpai.'], 404);
        }

        $iwaranWarrant->restore();
        $iwaranWarrant->attachments()->onlyTrashed()->restore();
        $iwaranWarrant->courtDocuments()->onlyTrashed()->restore();

        $fresh = IwaranWarrant::query()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
                'receivedBy:id,name',
                'sentToDistrictBy:id,name',
                'sentToCourtBy:id,name',
            ])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Rekod waran berjaya dipulihkan.',
            'data' => $this->appendWorkflowMeta($fresh, $user),
        ]);
    }
}
