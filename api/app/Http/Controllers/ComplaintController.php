<?php

namespace App\Http\Controllers; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Appointment;
use App\Models\CaseOyd;
use App\Models\CaseOydMedia;
use App\Models\CasePoliceReport;
use App\Models\CasePoliceReportMedia;
use App\Models\CaseRecord;
use App\Models\CaseSeizureItem;
use App\Models\CaseSeizureItemMedia;
use App\Models\Complaint;
use App\Models\ComplaintAttachment;
use App\Models\ComplaintOyd;
use App\Models\ComplaintOydMedia;
use App\Models\ComplaintPoliceReport;
use App\Models\ComplaintPoliceReportMedia;
use App\Models\ComplaintSeizureItem;
use App\Models\ComplaintSeizureItemMedia;
use App\Models\District;
use App\Models\Office;
use App\Models\Staff;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use App\Services\ComplaintReferenceService;
use App\Services\CaseReferenceService;
use App\Services\MobilePushNotificationService;
use Barryvdh\DomPDF\Facade\Pdf;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;


class ComplaintController extends Controller
{
    public function __construct(
        private MobilePushNotificationService $mobilePushNotificationService,
        private ComplaintReferenceService $complaintReferenceService,
        private CaseReferenceService $caseReferenceService
    ) {
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()->orderByDesc('id');
        $this->applyComplaintAccessScope($query, $user);
        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'List of complaints');
    }

    public function myComplaints(Request $request)
    {
        $user = $request->user();

        $query = Complaint::query()
            ->where('submitted_by_user_id', $user->id)
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'My complaints');
    }

    public function caseIndex(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'case_type' => 'nullable|string|max:10',
            'keyword' => 'nullable|string|max:255',
            'exclude_complaint_id' => 'nullable|integer',
            'limit' => 'nullable|integer|min:1|max:50',
            'page' => 'nullable|integer|min:1',
            'per_page' => 'nullable|integer|min:1|max:100',
            'with_complaints' => 'nullable',
        ]);

        $query = CaseRecord::query()
            ->select([
                'id',
                'case_type',
                'case_register_no',
                'file_no',
                'complaint_year',
                'district_id',
                'district_name',
                'ppa_classification',
                'current_status',
                'op_category',
                'op_case_status',
                'arrest_status',
                'action_datetime',
                'created_at',
            ])
            ->withCount('complaints')
            ->orderByDesc('id');

        $withComplaints = filter_var($validated['with_complaints'] ?? false, FILTER_VALIDATE_BOOLEAN);
        if ($withComplaints) {
            $query->with(['complaints' => function ($subQuery) {
                $subQuery->select([
                    'complaints.id',
                    'complaints.reference_no',
                    'complaints.case_register_no',
                    'complaints.case_type',
                    'complaints.district_name',
                    'complaints.complainant_name',
                    'complaints.complaint_date',
                    'complaints.complaint_time',
                ])->orderByDesc('complaints.id');
            }]);
        }

        $caseType = strtoupper(trim((string) ($validated['case_type'] ?? '')));
        if ($caseType !== '') {
            $query->where('case_type', $caseType);
        }

        $keyword = trim((string) ($validated['keyword'] ?? ''));
        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery->where('case_register_no', 'like', '%' . $keyword . '%')
                    ->orWhere('file_no', 'like', '%' . $keyword . '%')
                    ->orWhere('district_name', 'like', '%' . $keyword . '%');
            });
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $excludeComplaintId = (int) ($validated['exclude_complaint_id'] ?? 0);
        if ($excludeComplaintId > 0) {
            $query->whereDoesntHave('complaints', function ($subQuery) use ($excludeComplaintId) {
                $subQuery->where('complaints.id', $excludeComplaintId);
            });
        }

        $perPage = (int) ($validated['per_page'] ?? 0);
        if ($perPage > 0) {
            $rows = $query->paginate($perPage);
            return response()->json([
                'message' => 'Senarai kes',
                'data' => $rows->items(),
                'meta' => [
                    'current_page' => $rows->currentPage(),
                    'last_page' => $rows->lastPage(),
                    'per_page' => $rows->perPage(),
                    'total' => $rows->total(),
                ],
            ]);
        }

        $limit = (int) ($validated['limit'] ?? 10);
        $rows = $query->limit($limit)->get();

        return response()->json([
            'message' => 'Senarai kes',
            'data' => $rows,
        ]);
    }

    public function storeCase(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'complaint_ids' => ['required', 'array', 'min:1', 'max:50'],
            'complaint_ids.*' => ['integer', 'distinct', 'exists:complaints,id'],
        ]);

        $complaintIds = array_values(array_unique(array_map('intval', $validated['complaint_ids'])));
        $complaints = Complaint::query()
            ->whereIn('id', $complaintIds)
            ->orderByRaw('FIELD(id, ' . implode(',', $complaintIds) . ')')
            ->get();

        if ($complaints->count() !== count($complaintIds)) {
            return response()->json(['message' => 'Sebahagian aduan tidak dijumpai.'], 422);
        }

        foreach ($complaints as $complaint) {
            if (! $this->canViewComplaint($complaint, $user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
            if (strtoupper(trim((string) ($complaint->case_type ?? ''))) !== 'AJ') {
                return response()->json(['message' => 'Hanya aduan AJ boleh dibuka sebagai kes.'], 422);
            }
        }

        $primaryComplaint = $complaints->first();
        $districtId = (int) ($primaryComplaint->district_id ?? 0);
        $hasDifferentDistrict = $complaints->contains(function ($complaint) use ($districtId) {
            return (int) ($complaint->district_id ?? 0) !== $districtId;
        });
        if ($hasDifferentDistrict) {
            return response()->json(['message' => 'Aduan yang dipilih mesti daripada daerah yang sama.'], 422);
        }

        if ($user->hasRole('pegawai_daerah')) {
            $userDistrictId = $this->resolveUserDistrictId($user);
            if (! $userDistrictId || (int) $userDistrictId !== $districtId) {
                return response()->json(['message' => 'Kes luar daerah tidak dibenarkan.'], 403);
            }
        }

        $case = DB::transaction(function () use ($complaints, $primaryComplaint) {
            $case = $this->createAdditionalCaseForComplaint($primaryComplaint, [
                'opened_at' => now(),
            ]);

            foreach ($complaints as $complaint) {
                DB::table('case_complaint_links')->updateOrInsert(
                    [
                        'case_id' => $case->id,
                        'complaint_id' => $complaint->id,
                    ],
                    [
                        'is_primary' => true,
                        'notes' => 'Case created from case list multi-complaint flow.',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );

                $this->setPrimaryCase($complaint, $case->id);
            }

            return $case->fresh(['complaints:id,reference_no,case_type,district_name,complainant_name,complaint_date,complaint_time']);
        }, 3);

        return response()->json([
            'message' => 'Kes baharu berjaya ditambah.',
            'data' => $case,
            'meta' => [
                'primary_complaint_id' => $primaryComplaint->id,
                'complaint_ids' => $complaintIds,
            ],
        ], 201);
    }

    public function caseShow(Request $request, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'message' => 'Maklumat kes',
            'data' => $this->loadCaseDetail($case),
        ]);
    }

    public function caseUpdate(Request $request, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'file_no' => ['nullable', 'string', 'max:255'],
            'report_offense_id' => ['nullable', 'integer', 'exists:ref_offenses,id'],
            'arrest_staff_id' => ['nullable', 'integer', 'exists:staff,id'],
            'current_status' => ['nullable', 'string', 'max:255'],
            'op_category' => ['nullable', 'string', 'max:255'],
            'op_case_status' => ['nullable', 'string', 'max:255'],
            'op_notes' => ['nullable', 'string', 'max:20000'],
            'arrest_status' => ['nullable', 'string', 'max:20'],
            'arrest_by' => ['nullable', 'string', 'max:255'],
            'male_count' => ['nullable', 'integer', 'min:0'],
            'female_count' => ['nullable', 'integer', 'min:0'],
            'other_count' => ['nullable', 'integer', 'min:0'],
            'action_datetime' => ['nullable', 'date'],
            'statement_datetime' => ['nullable', 'date'],
            'court_date' => ['nullable', 'date'],
            'report_notes' => ['nullable', 'string'],
            'oyds' => ['nullable', 'array'],
            'oyds.*.id' => ['nullable', 'integer'],
            'oyds.*.name' => ['nullable', 'string', 'max:255'],
            'oyds.*.id_number' => ['nullable', 'string', 'max:255'],
            'oyds.*.investigator_name' => ['nullable', 'string', 'max:255'],
            'oyds.*.file_no' => ['nullable', 'string', 'max:255'],
            'seizure_status' => ['nullable', 'string', 'max:20'],
            'police_report_status' => ['nullable', 'string', 'max:20'],
            'seizure_items' => ['nullable', 'array'],
            'seizure_items.*.id' => ['nullable', 'integer'],
            'seizure_items.*.item_no' => ['nullable', 'string', 'max:255'],
            'seizure_items.*.description' => ['nullable', 'string', 'max:2000'],
            'seizure_items.*.storage' => ['nullable', 'string', 'max:1000'],
            'police_reports' => ['nullable', 'array'],
            'police_reports.*.id' => ['nullable', 'integer'],
            'police_reports.*.report_no' => ['nullable', 'string', 'max:255'],
            'police_reports.*.description' => ['nullable', 'string', 'max:2000'],
            'police_reports.*.station' => ['nullable', 'string', 'max:1000'],
        ]);

        DB::transaction(function () use ($case, $validated) {
            $case->update([
                'file_no' => $this->nullableString($validated['file_no'] ?? null),
                'report_offense_id' => $validated['report_offense_id'] ?? null,
                'arrest_staff_id' => $validated['arrest_staff_id'] ?? null,
                'current_status' => $this->nullableString($validated['current_status'] ?? null),
                'op_category' => $this->nullableString($validated['op_category'] ?? null),
                'op_case_status' => $this->nullableString($validated['op_case_status'] ?? null),
                'op_notes' => $this->nullableString($validated['op_notes'] ?? null),
                'arrest_status' => $this->nullableString($validated['arrest_status'] ?? null),
                'arrest_by' => $this->nullableString($validated['arrest_by'] ?? null),
                'male_count' => $validated['male_count'] ?? null,
                'female_count' => $validated['female_count'] ?? null,
                'other_count' => $validated['other_count'] ?? null,
                'action_datetime' => $validated['action_datetime'] ?? null,
                'statement_datetime' => $validated['statement_datetime'] ?? null,
                'court_date' => $validated['court_date'] ?? null,
                'report_notes' => $this->nullableString($validated['report_notes'] ?? null),
                'seizure_status' => $this->nullableString($validated['seizure_status'] ?? null),
                'police_report_status' => $this->nullableString($validated['police_report_status'] ?? null),
            ]);

            $this->syncCaseChildRows($case, CaseOyd::class, 'oyds', $validated['oyds'] ?? [], ['name', 'id_number', 'investigator_name', 'file_no']);
            $this->syncCaseChildRows($case, CaseSeizureItem::class, 'seizureItems', $validated['seizure_items'] ?? [], ['item_no', 'description', 'storage']);
            $this->syncCaseChildRows($case, CasePoliceReport::class, 'policeReports', $validated['police_reports'] ?? [], ['report_no', 'description', 'station']);
        }, 3);

        $freshCase = $this->loadCaseDetail($case->fresh());
        $autoLaporanEmailMeta = $this->autoSendLaporanTindakanEmailAfterCaseSave($freshCase);

        $response = [
            'message' => 'Maklumat kes berjaya dikemaskini.',
            'data' => $this->loadCaseDetail($case->fresh()),
        ];

        if ($autoLaporanEmailMeta) {
            $response['meta'] = [
                'laporan_tindakan_auto_email' => $autoLaporanEmailMeta,
            ];
        }

        return response()->json($response);
    }

    public function createCaseOyd(Request $request, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'investigator_name' => 'nullable|string|max:255',
            'file_no' => 'nullable|string|max:255',
        ]);

        $oyd = CaseOyd::create([
            'case_id' => $case->id,
            'name' => $this->nullableString($data['name'] ?? null),
            'id_number' => $this->nullableString($data['id_number'] ?? null),
            'investigator_name' => $this->nullableString($data['investigator_name'] ?? null),
            'file_no' => $this->nullableString($data['file_no'] ?? null),
        ]);

        return response()->json([
            'message' => 'OYDS kes dicipta.',
            'data' => $oyd->fresh(['media:id,case_oyd_id,category,file_name,mime,size,created_at']),
        ], 201);
    }

    public function createCaseSeizureItem(Request $request, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'item_no' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'storage' => 'nullable|string|max:1000',
        ]);

        $item = CaseSeizureItem::create([
            'case_id' => $case->id,
            'item_no' => $this->nullableString($data['item_no'] ?? null),
            'description' => $this->nullableString($data['description'] ?? null),
            'storage' => $this->nullableString($data['storage'] ?? null),
        ]);

        return response()->json([
            'message' => 'Barang kes dicipta.',
            'data' => $item->fresh(['media:id,case_seizure_item_id,category,file_name,mime,size,created_at']),
        ], 201);
    }

    public function createCasePoliceReport(Request $request, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'report_no' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:2000',
            'station' => 'nullable|string|max:1000',
        ]);

        $report = CasePoliceReport::create([
            'case_id' => $case->id,
            'report_no' => $this->nullableString($data['report_no'] ?? null),
            'description' => $this->nullableString($data['description'] ?? null),
            'station' => $this->nullableString($data['station'] ?? null),
        ]);

        return response()->json([
            'message' => 'Report polis dicipta.',
            'data' => $report->fresh(['media:id,case_police_report_id,category,file_name,mime,size,created_at']),
        ], 201);
    }

    public function uploadCaseOydMedia(Request $request, CaseRecord $case, CaseOyd $oyd)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $oyd->case_id !== (int) $case->id) {
            return response()->json(['message' => 'OYDS tidak sah untuk kes ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $category = $request->input('category', 'lain_lain');
        $files = $request->file('files', []);
        $this->storeCaseMediaFiles($files, CaseOydMedia::class, 'case_oyd_id', $oyd->id, "cases/oyds/{$case->id}/{$oyd->id}", $category, $user->id);

        $scanResult = null;
        $scanMessage = null;
        if ($category === 'ic') {
            $firstImage = collect($files)->first(function ($file) {
                return str_starts_with(strtolower((string) $file->getClientMimeType()), 'image/');
            });
            if ($firstImage) {
                $ocrText = $this->runTesseractOcr($firstImage->getRealPath());
                if ($ocrText) {
                    $unsupported = $this->detectUnsupportedDocumentType($ocrText);
                    if ($unsupported === 'lesen_memandu') {
                        $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR ditolak: imej dikesan sebagai lesen memandu.';
                    } else {
                        $parsed = $this->parseMyKadText($ocrText);
                        if (($parsed['name'] ?? '') !== '' || ($parsed['id_number'] ?? '') !== '') {
                            $oyd->update([
                                'name' => $parsed['name'] ?: ($oyd->name ?: null),
                                'id_number' => $parsed['id_number'] ?: ($oyd->id_number ?: null),
                            ]);
                            $scanResult = [
                                'name' => $oyd->fresh()->name,
                                'id_number' => $oyd->fresh()->id_number,
                            ];
                            $scanMessage = 'OCR IC berjaya: nama/no. K/P dikemaskini.';
                        } else {
                            $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR tidak dapat kesan nama/no. K/P.';
                        }
                    }
                } else {
                    $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR gagal dijalankan.';
                }
            }
        }

        return response()->json([
            'message' => 'Lampiran OYDS berjaya dimuat naik.',
            'media' => $oyd->fresh()->media()->orderByDesc('id')->get([
                'id', 'case_oyd_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'oyd' => $oyd->fresh(['media:id,case_oyd_id,category,file_name,mime,size,created_at']),
            'scan_message' => $scanMessage,
            'scan_result' => $scanResult,
        ]);
    }

    public function uploadCaseSeizureItemMedia(Request $request, CaseRecord $case, CaseSeizureItem $item)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $item->case_id !== (int) $case->id) {
            return response()->json(['message' => 'Barang kes tidak sah untuk kes ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $this->storeCaseMediaFiles(
            $request->file('files', []),
            CaseSeizureItemMedia::class,
            'case_seizure_item_id',
            $item->id,
            "cases/seizure-items/{$case->id}/{$item->id}",
            $request->input('category', 'lain_lain'),
            $user->id
        );

        return response()->json([
            'message' => 'Lampiran Barang Kes berjaya dimuat naik.',
            'media' => $item->fresh()->media()->orderByDesc('id')->get([
                'id', 'case_seizure_item_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'item' => $item->fresh(['media:id,case_seizure_item_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function uploadCasePoliceReportMedia(Request $request, CaseRecord $case, CasePoliceReport $report)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $report->case_id !== (int) $case->id) {
            return response()->json(['message' => 'Report polis tidak sah untuk kes ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $this->storeCaseMediaFiles(
            $request->file('files', []),
            CasePoliceReportMedia::class,
            'case_police_report_id',
            $report->id,
            "cases/police-reports/{$case->id}/{$report->id}",
            $request->input('category', 'lain_lain'),
            $user->id
        );

        return response()->json([
            'message' => 'Lampiran Report Polis berjaya dimuat naik.',
            'media' => $report->fresh()->media()->orderByDesc('id')->get([
                'id', 'case_police_report_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'report' => $report->fresh(['media:id,case_police_report_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function deleteCaseOydMedia(Request $request, CaseRecord $case, CaseOydMedia $media)
    {
        return $this->deleteCaseMedia($request, $case, $media, CaseOyd::class, 'case_oyd_id', 'Lampiran OYDS dipadam.');
    }

    public function deleteCaseSeizureItemMedia(Request $request, CaseRecord $case, CaseSeizureItemMedia $media)
    {
        return $this->deleteCaseMedia($request, $case, $media, CaseSeizureItem::class, 'case_seizure_item_id', 'Lampiran Barang Kes dipadam.');
    }

    public function deleteCasePoliceReportMedia(Request $request, CaseRecord $case, CasePoliceReportMedia $media)
    {
        return $this->deleteCaseMedia($request, $case, $media, CasePoliceReport::class, 'case_police_report_id', 'Lampiran Report Polis dipadam.');
    }

    public function downloadCaseOydMedia(Request $request, CaseRecord $case, CaseOydMedia $media)
    {
        return $this->downloadCaseMedia($request, $case, $media, CaseOyd::class, 'case_oyd_id');
    }

    public function downloadCaseSeizureItemMedia(Request $request, CaseRecord $case, CaseSeizureItemMedia $media)
    {
        return $this->downloadCaseMedia($request, $case, $media, CaseSeizureItem::class, 'case_seizure_item_id');
    }

    public function downloadCasePoliceReportMedia(Request $request, CaseRecord $case, CasePoliceReportMedia $media)
    {
        return $this->downloadCaseMedia($request, $case, $media, CasePoliceReport::class, 'case_police_report_id');
    }

    public function pendingApprovals(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Complaint::query()
            ->whereNotNull('approver_staff_id')
            ->whereNull('approver_confirmed_at')
            ->orderByDesc('id');

        if ($user->staff) {
            $query->where('approver_staff_id', $user->staff->id);
        } elseif ($user->name) {
            $query->whereHas('approverStaff', function ($subQuery) use ($user) {
                $subQuery->whereRaw('LOWER(name) = ?', [strtolower($user->name)]);
            });
        }

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'Pending approvals');
    }

    public function pickupQueue(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $complaintIds = DB::table('complaint_assignments')
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->pluck('complaint_id');

        $query = Complaint::query()
            ->whereIn('id', $complaintIds)
            ->whereNull('pic_user_id')
            ->whereNotNull('approver_confirmed_at')
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'Pickup queue');
    }

    public function myPicComplaints(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Complaint::query()
            ->where('pic_user_id', $user->id)
            ->orderByDesc('id');

        $this->applyComplaintFilters($query, $request);

        return $this->respondWithPagination($query, $request, 'PIC complaints');
    }

    public function exportXlsx(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = $this->buildComplaintListQuery($request, $user);
        if (! $query) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $rows = $query
            ->with([
                'receivedBy:id,name',
                'approverStaff:id,name',
            ])
            ->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle('Senarai Aduan');

        $headers = [
            'Bil',
            'No Aduan',
            'Tarikh Aduan',
            'Tarikh Kejadian',
            'Kategori',
            'Daerah',
            'Pengadu',
            'No. K/P',
            'Telefon',
            'Kaedah Aduan',
            'Status Aduan',
            'Status Tindakan',
            'Status Siasatan',
            'Klasifikasi',
            'Status Pendakwaan',
            'No. Daftar Kes',
            'Nombor Fail',
            'Penerima Aduan',
            'Pegawai Pengesah',
            'Ringkasan',
            'Dicipta Pada',
            'Dikemas Kini Pada',
        ];

        $sheet->fromArray($headers, null, 'A1');
        $lastCol = Coordinate::stringFromColumnIndex(count($headers));
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastCol}1")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFEFF6F2');
        $sheet->freezePane('A2');

        $rowIndex = 2;
        foreach ($rows as $index => $complaint) {
            $sheet->fromArray([[
                $index + 1,
                $complaint->reference_no,
                $complaint->complaint_date,
                $complaint->incident_date,
                $complaint->case_type,
                $complaint->district_name,
                $complaint->complainant_name,
                $complaint->identification_number,
                $complaint->contact_number,
                $complaint->channel,
                $complaint->current_stage,
                $complaint->aj_current_status,
                $complaint->aj_ip_status ?: $complaint->ak_ip_status,
                $complaint->aj_ppa_classification,
                $complaint->aj_prosecution_status,
                $complaint->case_register_no,
                $complaint->aj_file_no,
                optional($complaint->receivedBy)->name,
                optional($complaint->approverStaff)->name,
                $complaint->summary,
                optional($complaint->created_at)?->format('Y-m-d H:i:s'),
                optional($complaint->updated_at)?->format('Y-m-d H:i:s'),
            ]], null, "A{$rowIndex}");
            $rowIndex++;
        }

        $widths = [6, 18, 14, 14, 12, 18, 24, 18, 16, 18, 18, 24, 18, 14, 18, 18, 18, 22, 22, 44, 20, 20];
        foreach ($widths as $i => $width) {
            $col = Coordinate::stringFromColumnIndex($i + 1);
            $sheet->getColumnDimension($col)->setWidth($width);
        }
        $sheet->getStyle("A1:{$lastCol}" . max(1, $rowIndex - 1))->getAlignment()->setWrapText(true);

        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        $filename = 'aduan-export-' . now()->format('Ymd-His') . '.xlsx';

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    public function reportSummary(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query();
        $this->applyComplaintAccessScope($query, $user);
        $this->applyComplaintFilters($query, $request);

        $total = (clone $query)->count();
        $totalAj = (clone $query)->where('case_type', 'AJ')->count();
        $totalAk = (clone $query)->where('case_type', 'AK')->count();
        $totalKes = (clone $query)->where('is_case', true)->count();
        $totalSelesai = (clone $query)->whereIn('current_stage', ['selesai', 'laporan_tindakan'])->count();

        $byCaseType = (clone $query)
            ->select('case_type', DB::raw('COUNT(*) as total'))
            ->groupBy('case_type')
            ->orderByDesc('total')
            ->get();

        $byStage = (clone $query)
            ->select('current_stage', DB::raw('COUNT(*) as total'))
            ->groupBy('current_stage')
            ->orderByDesc('total')
            ->get();

        $byActionStatus = (clone $query)
            ->where('case_type', 'AJ')
            ->whereNotNull('aj_current_status')
            ->where('aj_current_status', '!=', '')
            ->select('aj_current_status', DB::raw('COUNT(*) as total'))
            ->groupBy('aj_current_status')
            ->orderByDesc('total')
            ->get();

        $byIpStatus = (clone $query)
            ->selectRaw("COALESCE(NULLIF(aj_ip_status, ''), NULLIF(ak_ip_status, '')) as ip_status, COUNT(*) as total")
            ->where(function ($subQuery) {
                $subQuery->where(function ($nested) {
                    $nested->whereNotNull('aj_ip_status')
                        ->where('aj_ip_status', '!=', '');
                })->orWhere(function ($nested) {
                    $nested->whereNotNull('ak_ip_status')
                        ->where('ak_ip_status', '!=', '');
                });
            })
            ->groupBy(DB::raw("COALESCE(NULLIF(aj_ip_status, ''), NULLIF(ak_ip_status, ''))"))
            ->orderByDesc('total')
            ->get();

        $byClassification = (clone $query)
            ->where('case_type', 'AJ')
            ->whereNotNull('aj_ppa_classification')
            ->where('aj_ppa_classification', '!=', '')
            ->select('aj_ppa_classification', DB::raw('COUNT(*) as total'))
            ->groupBy('aj_ppa_classification')
            ->orderByDesc('total')
            ->get();

        $byDistrict = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaints.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $byDate = (clone $query)
            ->whereNotNull('complaint_date')
            ->selectRaw('DATE(complaint_date) as date, COUNT(*) as total')
            ->groupBy(DB::raw('DATE(complaint_date)'))
            ->orderBy('date')
            ->get();

        return response()->json([
            'message' => 'Ringkasan laporan aduan',
            'data' => [
                'total' => $total,
                'total_aj' => $totalAj,
                'total_ak' => $totalAk,
                'total_kes' => $totalKes,
                'total_selesai' => $totalSelesai,
                'by_case_type' => $byCaseType,
                'by_stage' => $byStage,
                'by_action_status' => $byActionStatus,
                'by_ip_status' => $byIpStatus,
                'by_classification' => $byClassification,
                'by_district' => $byDistrict,
                'by_date' => $byDate,
            ],
        ]);
    }

    public function exportReportCsv(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->latest('id')
            ->with(['receivedBy:id,name', 'approverStaff:id,name,staff_id']);

        $this->applyComplaintAccessScope($query, $user);
        $this->applyComplaintFilters($query, $request);

        $filename = 'complaint-report-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($query) {
            echo "\xEF\xBB\xBF";
            echo $this->csvRow([
                'ID',
                'No Aduan',
                'Tarikh Aduan',
                'Pengadu',
                'Daerah',
                'Kategori',
                'Status',
                'Status Tindakan',
                'Klasifikasi',
                'Status Siasatan',
                'Status Pendakwaan',
                'No Daftar Kes',
                'Nombor Fail',
                'Penerima Aduan',
                'Pegawai Pengesah',
                'Ringkasan',
            ]);

            $query->chunk(500, function ($rows) {
                foreach ($rows as $complaint) {
                    echo $this->csvRow([
                        $complaint->id,
                        $complaint->reference_no,
                        $complaint->complaint_date,
                        $complaint->complainant_name,
                        $complaint->district_name,
                        $complaint->case_type,
                        $complaint->current_stage,
                        $complaint->aj_current_status,
                        $complaint->aj_ppa_classification,
                        $complaint->aj_ip_status ?: $complaint->ak_ip_status,
                        $complaint->aj_prosecution_status,
                        $complaint->case_register_no,
                        $complaint->aj_file_no,
                        $complaint->receivedBy?->name,
                        $complaint->approverStaff?->name,
                        trim((string) ($complaint->summary ?: $complaint->borang5_statement ?: '')),
                    ]);
                }
            });
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function reportArrestByDistrict(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->whereNotNull('aj_male_count')
                    ->orWhereNotNull('aj_female_count')
                    ->orWhereNotNull('aj_other_count');
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '<=', $request->string('to_date')->toString());
        }

        $rows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COALESCE(SUM(complaints.aj_male_count), 0) as total_male'),
                DB::raw('COALESCE(SUM(complaints.aj_female_count), 0) as total_female'),
                DB::raw('COALESCE(SUM(complaints.aj_other_count), 0) as total_other'),
                DB::raw('COUNT(complaints.id) as total_records')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc(DB::raw('(COALESCE(SUM(complaints.aj_male_count), 0) + COALESCE(SUM(complaints.aj_female_count), 0) + COALESCE(SUM(complaints.aj_other_count), 0))'))
            ->get();

        $totals = [
            'male' => (int) $rows->sum(fn ($row) => (int) ($row->total_male ?? 0)),
            'female' => (int) $rows->sum(fn ($row) => (int) ($row->total_female ?? 0)),
            'other' => (int) $rows->sum(fn ($row) => (int) ($row->total_other ?? 0)),
            'records' => (int) $rows->sum(fn ($row) => (int) ($row->total_records ?? 0)),
        ];

        return response()->json([
            'message' => 'Statistik tangkapan mengikut daerah',
            'data' => [
                'totals' => $totals,
                'rows' => $rows,
            ],
        ]);
    }

    public function reportArrestByOffense(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->whereNotNull('aj_male_count')
                    ->orWhereNotNull('aj_female_count')
                    ->orWhereNotNull('aj_other_count');
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '<=', $request->string('to_date')->toString());
        }

        $rows = (clone $query)
            ->leftJoin('ref_offenses', 'complaints.aj_report_offense_id', '=', 'ref_offenses.id')
            ->select(
                'ref_offenses.id as offense_id',
                'ref_offenses.code as offense_code',
                'ref_offenses.section as offense_section',
                'ref_offenses.name as offense_name',
                DB::raw('COALESCE(SUM(complaints.aj_male_count), 0) as total_male'),
                DB::raw('COALESCE(SUM(complaints.aj_female_count), 0) as total_female'),
                DB::raw('COALESCE(SUM(complaints.aj_other_count), 0) as total_other'),
                DB::raw('COUNT(complaints.id) as total_records')
            )
            ->groupBy('ref_offenses.id', 'ref_offenses.code', 'ref_offenses.section', 'ref_offenses.name')
            ->orderByDesc(DB::raw('(COALESCE(SUM(complaints.aj_male_count), 0) + COALESCE(SUM(complaints.aj_female_count), 0) + COALESCE(SUM(complaints.aj_other_count), 0))'))
            ->get()
            ->map(function ($row) {
                $parts = array_filter([
                    $row->offense_code ?: null,
                    $row->offense_section ? 'Sec ' . $row->offense_section : null,
                    $row->offense_name ?: null,
                ]);
                $row->offense_label = $parts ? implode(' / ', $parts) : 'Tidak diketahui';
                return $row;
            })
            ->values();

        $totals = [
            'male' => (int) $rows->sum(fn ($row) => (int) ($row->total_male ?? 0)),
            'female' => (int) $rows->sum(fn ($row) => (int) ($row->total_female ?? 0)),
            'other' => (int) $rows->sum(fn ($row) => (int) ($row->total_other ?? 0)),
            'records' => (int) $rows->sum(fn ($row) => (int) ($row->total_records ?? 0)),
        ];

        return response()->json([
            'message' => 'Rekod tangkapan mengikut kesalahan',
            'data' => [
                'totals' => $totals,
                'rows' => $rows,
            ],
        ]);
    }

    public function reportIpStatus(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where(function ($subQuery) {
                $subQuery->where(function ($nested) {
                    $nested->whereNotNull('aj_ip_status')
                        ->where('aj_ip_status', '!=', '');
                })->orWhere(function ($nested) {
                    $nested->whereNotNull('ak_ip_status')
                        ->where('ak_ip_status', '!=', '');
                });
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('case_type')) {
            $query->where('case_type', strtoupper($request->string('case_type')->toString()));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaint_date', '<=', $request->string('to_date')->toString());
        }

        $rows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->selectRaw("
                COALESCE(NULLIF(complaints.aj_ip_status, ''), NULLIF(complaints.ak_ip_status, '')) as ip_status,
                complaints.case_type,
                districts.id as district_id,
                districts.name as district_name,
                COUNT(complaints.id) as total
            ")
            ->groupBy(
                DB::raw("COALESCE(NULLIF(complaints.aj_ip_status, ''), NULLIF(complaints.ak_ip_status, ''))"),
                'complaints.case_type',
                'districts.id',
                'districts.name'
            )
            ->orderByDesc('total')
            ->get();

        $statusRows = $rows
            ->groupBy('ip_status')
            ->map(function ($group, $status) {
                return [
                    'ip_status' => $status ?: 'Tidak diketahui',
                    'total' => (int) $group->sum('total'),
                    'aj_total' => (int) $group->where('case_type', 'AJ')->sum('total'),
                    'ak_total' => (int) $group->where('case_type', 'AK')->sum('total'),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $districtRows = $rows
            ->groupBy(fn ($row) => $row->district_id ?: 'unknown')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'district_id' => $first->district_id,
                    'district_name' => $first->district_name ?: 'Tidak diketahui',
                    'total' => (int) $group->sum('total'),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $totals = [
            'records' => (int) $rows->sum('total'),
            'statuses' => (int) $statusRows->count(),
            'aj' => (int) $rows->where('case_type', 'AJ')->sum('total'),
            'ak' => (int) $rows->where('case_type', 'AK')->sum('total'),
        ];

        return response()->json([
            'message' => 'Statistik status IP',
            'data' => [
                'totals' => $totals,
                'status_rows' => $statusRows,
                'district_rows' => $districtRows,
            ],
        ]);
    }

    public function reportActionStatus(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->whereNotNull('aj_current_status')
            ->where('aj_current_status', '!=', '');

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('classification')) {
            $classification = $this->normalizePpaClassification($request->string('classification')->toString());
            if ($classification) {
                $this->applyPpaClassificationFilter($query, $classification);
            }
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaint_date', '<=', $request->string('to_date')->toString());
        }

        $rows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'complaints.aj_current_status',
                'complaints.aj_ppa_classification',
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaints.id) as total')
            )
            ->groupBy(
                'complaints.aj_current_status',
                'complaints.aj_ppa_classification',
                'districts.id',
                'districts.name'
            )
            ->orderByDesc('total')
            ->get();

        $statusRows = $rows
            ->groupBy('aj_current_status')
            ->map(function ($group, $status) {
                return [
                    'action_status' => $status ?: 'Tidak diketahui',
                    'total' => (int) $group->sum('total'),
                    'fna_total' => (int) $group->whereIn('aj_ppa_classification', ['FNA', 'FFA'])->sum('total'),
                    'kiv_total' => (int) $group->where('aj_ppa_classification', 'KIV')->sum('total'),
                    'nfa_total' => (int) $group->where('aj_ppa_classification', 'NFA')->sum('total'),
                    'op_total' => (int) $group->where('aj_ppa_classification', 'OP')->sum('total'),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $classificationRows = $rows
            ->groupBy('aj_ppa_classification')
            ->map(function ($group, $classification) {
                $normalized = $this->normalizePpaClassification((string) $classification);
                return [
                    'classification' => $normalized ?: 'Tidak diketahui',
                    'total' => (int) $group->sum('total'),
                ];
            })
            ->groupBy('classification')
            ->map(function ($group, $classification) {
                return [
                    'classification' => $classification,
                    'total' => (int) collect($group)->sum('total'),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $districtRows = $rows
            ->groupBy(fn ($row) => $row->district_id ?: 'unknown')
            ->map(function ($group) {
                $first = $group->first();

                return [
                    'district_id' => $first->district_id,
                    'district_name' => $first->district_name ?: 'Tidak diketahui',
                    'total' => (int) $group->sum('total'),
                ];
            })
            ->sortByDesc('total')
            ->values();

        $totals = [
            'records' => (int) $rows->sum('total'),
            'statuses' => (int) $statusRows->count(),
            'classifications' => (int) $classificationRows->count(),
            'districts' => (int) $districtRows->count(),
        ];

        return response()->json([
            'message' => 'Statistik status tindakan',
            'data' => [
                'totals' => $totals,
                'status_rows' => $statusRows,
                'classification_rows' => $classificationRows,
                'district_rows' => $districtRows,
            ],
        ]);
    }

    public function exportArrestByDistrictXlsx(Request $request)
    {
        $response = $this->reportArrestByDistrict($request);
        $payload = $response->getData(true);
        $data = $payload['data'] ?? ['totals' => [], 'rows' => []];

        $spreadsheet = $this->makeReportSpreadsheet(
            'Summary',
            ['Metrik', 'Nilai'],
            [
                ['Jumlah Lelaki', $data['totals']['male'] ?? 0],
                ['Jumlah Perempuan', $data['totals']['female'] ?? 0],
                ['Jumlah Lain-lain', $data['totals']['other'] ?? 0],
                ['Rekod Laporan', $data['totals']['records'] ?? 0],
            ]
        );

        $sheet = $this->addReportSheet($spreadsheet, 'By District', ['Daerah', 'Lelaki', 'Perempuan', 'Lain-lain', 'Jumlah', 'Rekod']);
        $rows = collect($data['rows'] ?? [])->map(function ($row) {
            $male = (int) ($row['total_male'] ?? 0);
            $female = (int) ($row['total_female'] ?? 0);
            $other = (int) ($row['total_other'] ?? 0);
            return [
                $row['district_name'] ?? 'Tidak diketahui',
                $male,
                $female,
                $other,
                $male + $female + $other,
                (int) ($row['total_records'] ?? 0),
            ];
        })->values()->all();
        if ($rows) {
            $sheet->fromArray($rows, null, 'A2');
        }
        foreach ([22, 12, 12, 12, 12, 12] as $i => $width) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        return $this->downloadSpreadsheet($spreadsheet, 'aduan-arrest-by-district-' . now()->format('Ymd-His') . '.xlsx');
    }

    public function exportIpStatusXlsx(Request $request)
    {
        $response = $this->reportIpStatus($request);
        $payload = $response->getData(true);
        $data = $payload['data'] ?? ['totals' => [], 'status_rows' => [], 'district_rows' => []];

        $spreadsheet = $this->makeReportSpreadsheet(
            'Summary',
            ['Metrik', 'Nilai'],
            [
                ['Jumlah Rekod', $data['totals']['records'] ?? 0],
                ['Bil Status IP', $data['totals']['statuses'] ?? 0],
                ['Jumlah AJ', $data['totals']['aj'] ?? 0],
                ['Jumlah AK', $data['totals']['ak'] ?? 0],
            ]
        );

        $statusSheet = $this->addReportSheet($spreadsheet, 'By Status IP', ['Status IP', 'AJ', 'AK', 'Jumlah']);
        $statusRows = collect($data['status_rows'] ?? [])->map(fn ($row) => [
            $row['ip_status'] ?? 'Tidak diketahui',
            (int) ($row['aj_total'] ?? 0),
            (int) ($row['ak_total'] ?? 0),
            (int) ($row['total'] ?? 0),
        ])->values()->all();
        if ($statusRows) {
            $statusSheet->fromArray($statusRows, null, 'A2');
        }
        foreach ([28, 12, 12, 12] as $i => $width) {
            $statusSheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        $districtSheet = $this->addReportSheet($spreadsheet, 'By District', ['Daerah', 'Jumlah']);
        $districtRows = collect($data['district_rows'] ?? [])->map(fn ($row) => [
            $row['district_name'] ?? 'Tidak diketahui',
            (int) ($row['total'] ?? 0),
        ])->values()->all();
        if ($districtRows) {
            $districtSheet->fromArray($districtRows, null, 'A2');
        }
        foreach ([24, 12] as $i => $width) {
            $districtSheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        return $this->downloadSpreadsheet($spreadsheet, 'aduan-ip-status-' . now()->format('Ymd-His') . '.xlsx');
    }

    public function exportActionStatusXlsx(Request $request)
    {
        $response = $this->reportActionStatus($request);
        $payload = $response->getData(true);
        $data = $payload['data'] ?? ['totals' => [], 'status_rows' => [], 'classification_rows' => [], 'district_rows' => []];

        $spreadsheet = $this->makeReportSpreadsheet(
            'Summary',
            ['Metrik', 'Nilai'],
            [
                ['Jumlah Rekod', $data['totals']['records'] ?? 0],
                ['Bil Status', $data['totals']['statuses'] ?? 0],
                ['Bil Klasifikasi', $data['totals']['classifications'] ?? 0],
                ['Bil Daerah', $data['totals']['districts'] ?? 0],
            ]
        );

        $statusSheet = $this->addReportSheet($spreadsheet, 'By Action Status', ['Status Tindakan', 'FNA', 'KIV', 'NFA', 'OP', 'Jumlah']);
        $statusRows = collect($data['status_rows'] ?? [])->map(fn ($row) => [
            $row['action_status'] ?? 'Tidak diketahui',
            (int) ($row['fna_total'] ?? 0),
            (int) ($row['kiv_total'] ?? 0),
            (int) ($row['nfa_total'] ?? 0),
            (int) ($row['op_total'] ?? 0),
            (int) ($row['total'] ?? 0),
        ])->values()->all();
        if ($statusRows) {
            $statusSheet->fromArray($statusRows, null, 'A2');
        }
        foreach ([28, 10, 10, 10, 10, 12] as $i => $width) {
            $statusSheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        $classificationSheet = $this->addReportSheet($spreadsheet, 'By Classification', ['Klasifikasi', 'Jumlah']);
        $classificationRows = collect($data['classification_rows'] ?? [])->map(fn ($row) => [
            $row['classification'] ?? 'Tidak diketahui',
            (int) ($row['total'] ?? 0),
        ])->values()->all();
        if ($classificationRows) {
            $classificationSheet->fromArray($classificationRows, null, 'A2');
        }
        foreach ([20, 12] as $i => $width) {
            $classificationSheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        $districtSheet = $this->addReportSheet($spreadsheet, 'By District', ['Daerah', 'Jumlah']);
        $districtRows = collect($data['district_rows'] ?? [])->map(fn ($row) => [
            $row['district_name'] ?? 'Tidak diketahui',
            (int) ($row['total'] ?? 0),
        ])->values()->all();
        if ($districtRows) {
            $districtSheet->fromArray($districtRows, null, 'A2');
        }
        foreach ([24, 12] as $i => $width) {
            $districtSheet->getColumnDimension(Coordinate::stringFromColumnIndex($i + 1))->setWidth($width);
        }

        return $this->downloadSpreadsheet($spreadsheet, 'aduan-action-status-' . now()->format('Ymd-His') . '.xlsx');
    }

    public function reportArrestors(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->whereNotNull('aj_arrest_by')
                    ->where('aj_arrest_by', '!=', '');
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('arrest_by')) {
            $query->whereRaw('LOWER(aj_arrest_by) = ?', [strtolower($request->string('arrest_by')->toString())]);
        }

        if ($request->filled('from_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '<=', $request->string('to_date')->toString());
        }

        $rows = (clone $query)
            ->leftJoin('staff as arrest_staff', 'complaints.aj_arrest_staff_id', '=', 'arrest_staff.id')
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'complaints.aj_arrest_by',
                'complaints.aj_arrest_staff_id',
                'arrest_staff.name as arrest_staff_name',
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COALESCE(SUM(complaints.aj_male_count), 0) as total_male'),
                DB::raw('COALESCE(SUM(complaints.aj_female_count), 0) as total_female'),
                DB::raw('COALESCE(SUM(complaints.aj_other_count), 0) as total_other'),
                DB::raw('COUNT(complaints.id) as total_records')
            )
            ->groupBy(
                'complaints.aj_arrest_by',
                'complaints.aj_arrest_staff_id',
                'arrest_staff.name',
                'districts.id',
                'districts.name'
            )
            ->orderByDesc(DB::raw('(COALESCE(SUM(complaints.aj_male_count), 0) + COALESCE(SUM(complaints.aj_female_count), 0) + COALESCE(SUM(complaints.aj_other_count), 0))'))
            ->get()
            ->map(function ($row) {
                $row->arrestor_label = $row->arrest_staff_name
                    ? $row->arrest_staff_name . ' (' . $row->aj_arrest_by . ')'
                    : ($row->aj_arrest_by ?: 'Tidak diketahui');
                return $row;
            })
            ->values();

        $typeRows = $rows
            ->groupBy('aj_arrest_by')
            ->map(function ($group, $type) {
                return [
                    'arrest_by' => $type ?: 'Tidak diketahui',
                    'total_male' => (int) $group->sum('total_male'),
                    'total_female' => (int) $group->sum('total_female'),
                    'total_other' => (int) $group->sum('total_other'),
                    'total_records' => (int) $group->sum('total_records'),
                ];
            })
            ->sortByDesc(fn ($row) => $row['total_male'] + $row['total_female'] + $row['total_other'])
            ->values();

        $totals = [
            'male' => (int) $rows->sum('total_male'),
            'female' => (int) $rows->sum('total_female'),
            'other' => (int) $rows->sum('total_other'),
            'records' => (int) $rows->sum('total_records'),
            'arrestors' => (int) $rows->count(),
        ];

        return response()->json([
            'message' => 'Senarai penangkap',
            'data' => [
                'totals' => $totals,
                'type_rows' => $typeRows,
                'rows' => $rows,
            ],
        ]);
    }

    public function reportArrestTotals(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->whereNotNull('aj_male_count')
                    ->orWhereNotNull('aj_female_count')
                    ->orWhereNotNull('aj_other_count');
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate(DB::raw('COALESCE(aj_action_datetime, complaint_date)'), '<=', $request->string('to_date')->toString());
        }

        $totals = [
            'male' => (int) (clone $query)->sum('aj_male_count'),
            'female' => (int) (clone $query)->sum('aj_female_count'),
            'other' => (int) (clone $query)->sum('aj_other_count'),
            'records' => (int) (clone $query)->count(),
        ];
        $totals['all'] = $totals['male'] + $totals['female'] + $totals['other'];

        $trendRows = (clone $query)
            ->selectRaw("
                DATE_FORMAT(COALESCE(aj_action_datetime, complaint_date), '%Y-%m') as period,
                COALESCE(SUM(aj_male_count), 0) as total_male,
                COALESCE(SUM(aj_female_count), 0) as total_female,
                COALESCE(SUM(aj_other_count), 0) as total_other,
                COUNT(id) as total_records
            ")
            ->groupBy(DB::raw("DATE_FORMAT(COALESCE(aj_action_datetime, complaint_date), '%Y-%m')"))
            ->orderBy('period')
            ->get()
            ->map(function ($row) {
                $row->total_all = (int) $row->total_male + (int) $row->total_female + (int) $row->total_other;
                return $row;
            })
            ->values();

        $districtRows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COALESCE(SUM(complaints.aj_male_count), 0) as total_male'),
                DB::raw('COALESCE(SUM(complaints.aj_female_count), 0) as total_female'),
                DB::raw('COALESCE(SUM(complaints.aj_other_count), 0) as total_other'),
                DB::raw('COUNT(complaints.id) as total_records')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc(DB::raw('(COALESCE(SUM(complaints.aj_male_count), 0) + COALESCE(SUM(complaints.aj_female_count), 0) + COALESCE(SUM(complaints.aj_other_count), 0))'))
            ->get()
            ->map(function ($row) {
                $row->total_all = (int) $row->total_male + (int) $row->total_female + (int) $row->total_other;
                return $row;
            })
            ->values();

        return response()->json([
            'message' => 'Jumlah tangkapan',
            'data' => [
                'totals' => $totals,
                'trend_rows' => $trendRows,
                'district_rows' => $districtRows,
            ],
        ]);
    }

    public function reportCaseProsecution(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->where('is_case', true)
                    ->orWhere(function ($nested) {
                        $nested->whereNotNull('aj_prosecution_status')
                            ->where('aj_prosecution_status', '!=', '');
                    });
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('prosecution_status')) {
            $query->whereRaw('LOWER(aj_prosecution_status) = ?', [strtolower($request->string('prosecution_status')->toString())]);
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaint_date', '<=', $request->string('to_date')->toString());
        }

        $statusRows = (clone $query)
            ->selectRaw("
                COALESCE(NULLIF(aj_prosecution_status, ''), 'Belum Direkodkan') as prosecution_status,
                COUNT(id) as total
            ")
            ->groupBy(DB::raw("COALESCE(NULLIF(aj_prosecution_status, ''), 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        $districtRows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaints.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $mahkamahRows = (clone $query)
            ->leftJoin('ref_mahkamah', 'complaints.aj_mahkamah_id', '=', 'ref_mahkamah.id')
            ->selectRaw("
                COALESCE(ref_mahkamah.name, 'Belum Direkodkan') as mahkamah_name,
                COUNT(complaints.id) as total
            ")
            ->groupBy(DB::raw("COALESCE(ref_mahkamah.name, 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        $totals = [
            'cases' => (int) (clone $query)->where('is_case', true)->count(),
            'records' => (int) (clone $query)->count(),
            'registered_cases' => (int) (clone $query)->whereNotNull('case_register_no')->where('case_register_no', '!=', '')->count(),
            'with_prosecution_status' => (int) (clone $query)->whereNotNull('aj_prosecution_status')->where('aj_prosecution_status', '!=', '')->count(),
            'with_mahkamah' => (int) (clone $query)->whereNotNull('aj_mahkamah_id')->count(),
        ];

        return response()->json([
            'message' => 'Statistik KES dan pendakwaan',
            'data' => [
                'totals' => $totals,
                'status_rows' => $statusRows,
                'district_rows' => $districtRows,
                'mahkamah_rows' => $mahkamahRows,
            ],
        ]);
    }

    public function reportOyds(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = ComplaintOyd::query()
            ->join('complaints', 'complaint_oyds.complaint_id', '=', 'complaints.id')
            ->whereNull('complaint_oyds.deleted_at')
            ->whereNull('complaints.deleted_at');

        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            // no extra scope
        } elseif ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('complaints.district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasAnyRole(['awam', 'user'])) {
            $query->where('complaints.submitted_by_user_id', $user->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($request->filled('district_id')) {
            $query->where('complaints.district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaints.complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaints.complaint_date', '<=', $request->string('to_date')->toString());
        }

        $totals = [
            'oyds' => (int) (clone $query)->count('complaint_oyds.id'),
            'with_id_number' => (int) (clone $query)->whereNotNull('complaint_oyds.id_number')->where('complaint_oyds.id_number', '!=', '')->count('complaint_oyds.id'),
            'with_investigator' => (int) (clone $query)->whereNotNull('complaint_oyds.investigator_name')->where('complaint_oyds.investigator_name', '!=', '')->count('complaint_oyds.id'),
            'complaints' => (int) (clone $query)->distinct('complaint_oyds.complaint_id')->count('complaint_oyds.complaint_id'),
        ];

        $districtRows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaint_oyds.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $investigatorRows = (clone $query)
            ->selectRaw("
                COALESCE(NULLIF(complaint_oyds.investigator_name, ''), 'Belum Direkodkan') as investigator_name,
                COUNT(complaint_oyds.id) as total
            ")
            ->groupBy(DB::raw("COALESCE(NULLIF(complaint_oyds.investigator_name, ''), 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'message' => 'Statistik OYDS',
            'data' => [
                'totals' => $totals,
                'district_rows' => $districtRows,
                'investigator_rows' => $investigatorRows,
            ],
        ]);
    }

    public function reportSeizureItems(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = ComplaintSeizureItem::query()
            ->join('complaints', 'complaint_seizure_items.complaint_id', '=', 'complaints.id')
            ->whereNull('complaint_seizure_items.deleted_at')
            ->whereNull('complaints.deleted_at');

        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            // no extra scope
        } elseif ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('complaints.district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
        } elseif ($user->hasAnyRole(['awam', 'user'])) {
            $query->where('complaints.submitted_by_user_id', $user->id);
        } else {
            $query->whereRaw('1 = 0');
        }

        if ($request->filled('district_id')) {
            $query->where('complaints.district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaints.complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaints.complaint_date', '<=', $request->string('to_date')->toString());
        }

        $totals = [
            'items' => (int) (clone $query)->count('complaint_seizure_items.id'),
            'complaints' => (int) (clone $query)->distinct('complaint_seizure_items.complaint_id')->count('complaint_seizure_items.complaint_id'),
            'with_storage' => (int) (clone $query)->whereNotNull('complaint_seizure_items.storage')->where('complaint_seizure_items.storage', '!=', '')->count('complaint_seizure_items.id'),
            'with_item_no' => (int) (clone $query)->whereNotNull('complaint_seizure_items.item_no')->where('complaint_seizure_items.item_no', '!=', '')->count('complaint_seizure_items.id'),
        ];

        $districtRows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaint_seizure_items.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $storageRows = (clone $query)
            ->selectRaw("
                COALESCE(NULLIF(complaint_seizure_items.storage, ''), 'Belum Direkodkan') as storage_name,
                COUNT(complaint_seizure_items.id) as total
            ")
            ->groupBy(DB::raw("COALESCE(NULLIF(complaint_seizure_items.storage, ''), 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        return response()->json([
            'message' => 'Statistik barang kes / sitaan',
            'data' => [
                'totals' => $totals,
                'district_rows' => $districtRows,
                'storage_rows' => $storageRows,
            ],
        ]);
    }

    public function reportCourtsAndProsecutors(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $query = Complaint::query()
            ->where('case_type', 'AJ')
            ->where(function ($subQuery) {
                $subQuery->whereNotNull('aj_mahkamah_id')
                    ->orWhereNotNull('aj_prosecutor_staff_id');
            });

        $this->applyComplaintAccessScope($query, $user);

        if ($request->filled('district_id')) {
            $query->where('district_id', $request->integer('district_id'));
        }

        if ($request->filled('from_date')) {
            $query->whereDate('complaint_date', '>=', $request->string('from_date')->toString());
        }

        if ($request->filled('to_date')) {
            $query->whereDate('complaint_date', '<=', $request->string('to_date')->toString());
        }

        $mahkamahRows = (clone $query)
            ->leftJoin('ref_mahkamah', 'complaints.aj_mahkamah_id', '=', 'ref_mahkamah.id')
            ->selectRaw("
                COALESCE(ref_mahkamah.name, 'Belum Direkodkan') as mahkamah_name,
                COUNT(complaints.id) as total
            ")
            ->groupBy(DB::raw("COALESCE(ref_mahkamah.name, 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        $prosecutorRows = (clone $query)
            ->leftJoin('staff as prosecutors', 'complaints.aj_prosecutor_staff_id', '=', 'prosecutors.id')
            ->selectRaw("
                COALESCE(prosecutors.name, 'Belum Direkodkan') as prosecutor_name,
                COUNT(complaints.id) as total
            ")
            ->groupBy(DB::raw("COALESCE(prosecutors.name, 'Belum Direkodkan')"))
            ->orderByDesc('total')
            ->get();

        $districtRows = (clone $query)
            ->leftJoin('districts', 'complaints.district_id', '=', 'districts.id')
            ->select(
                'districts.id as district_id',
                'districts.name as district_name',
                DB::raw('COUNT(complaints.id) as total')
            )
            ->groupBy('districts.id', 'districts.name')
            ->orderByDesc('total')
            ->get();

        $totals = [
            'records' => (int) (clone $query)->count(),
            'with_mahkamah' => (int) (clone $query)->whereNotNull('aj_mahkamah_id')->count(),
            'with_prosecutor' => (int) (clone $query)->whereNotNull('aj_prosecutor_staff_id')->count(),
            'mahkamah_count' => (int) $mahkamahRows->count(),
            'prosecutor_count' => (int) $prosecutorRows->count(),
        ];

        return response()->json([
            'message' => 'Statistik mahkamah dan pendakwa',
            'data' => [
                'totals' => $totals,
                'mahkamah_rows' => $mahkamahRows,
                'prosecutor_rows' => $prosecutorRows,
                'district_rows' => $districtRows,
            ],
        ]);
    }

    public function show(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $complaint->load([
            'submittedBy:id,name,email,office_type,district_id',
            'submittedBy.staff',
            'submittedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'receivedBy:id,name,email',
            'receivedBy.staff',
            'receivedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'approverStaff:id,name,staff_id',
            'picUser:id,name',
            'appointment:id,complaint_id,start_at,end_at,status',
            'actionUpdates:id,complaint_id,sort_order,classification,action_date,action_time,note,created_at',
            'oyds:id,complaint_id,name,id_number,investigator_name,file_no',
            'oyds.media:id,complaint_oyd_id,category,file_name,mime,size,created_at',
            'seizureItems:id,complaint_id,item_no,description,storage',
            'seizureItems.media:id,complaint_seizure_item_id,category,file_name,mime,size,created_at',
            'policeReports:id,complaint_id,report_no,description,station',
            'policeReports.media:id,complaint_police_report_id,category,file_name,mime,size,created_at',
            'attachments:id,complaint_id,category,title,file_name,mime,size,created_at',
            'ajDirectiveStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'ajDirectiveStaff.office:id,name,code,office_type,district_id,phone,address',
            'ajHandoverStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'ajHandoverStaff.office:id,name,code,office_type,district_id,phone,address',
            'ajArrestStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'ajArrestStaff.office:id,name,code,office_type,district_id,phone,address',
            'ajProsecutorStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'ajProsecutorStaff.office:id,name,code,office_type,district_id,phone,address',
            'cases:id,case_type,case_register_no,file_no,complaint_year,district_id,district_name,ppa_classification,current_status,arrest_status,action_datetime,created_at',
        ]);
        $complaint->attachments?->each(function ($attachment) use ($complaint) {
            $attachment->original_file_name = $attachment->file_name;
            if (! empty($attachment->title)) {
                $attachment->file_name = $attachment->title;
                $attachment->title = null;
            }
            $attachment->download_url = route('complaints.attachments.download', [
                'complaint' => $complaint->id,
                'attachment' => $attachment->id,
            ]);
        });
        if ($complaint->classification_id) {
            $complaint->classification_code = DB::table('complaint_classifications')
                ->where('id', $complaint->classification_id)
                ->value('code');
        }

        $this->normalizeComplaintReferenceAttributes($complaint);

        $offenseIds = array_values(array_filter([
            (int) ($complaint->ak_offense_id ?? 0),
            (int) ($complaint->aj_offense_id ?? 0),
            (int) ($complaint->aj_report_offense_id ?? 0),
        ]));
        $offenseMap = collect();
        if (! empty($offenseIds)) {
            $offenseMap = DB::table('ref_offenses')
                ->whereIn('id', array_unique($offenseIds))
                ->select('id', 'code', 'section', 'name')
                ->get()
                ->keyBy('id');
        }

        $akOffense = $offenseMap->get((int) ($complaint->ak_offense_id ?? 0));
        $ajOffense = $offenseMap->get((int) ($complaint->aj_offense_id ?? 0));
        $ajReportOffense = $offenseMap->get((int) ($complaint->aj_report_offense_id ?? 0));

        $complaint->setAttribute('ak_offense', $akOffense);
        $complaint->setAttribute('aj_offense', $ajOffense);
        $complaint->setAttribute('offense', $ajReportOffense ?: $ajOffense ?: $akOffense);
        $complaint->setAttribute('ak_offense_label', $this->formatOffenseLabel($akOffense));
        $complaint->setAttribute('aj_offense_label', $this->formatOffenseLabel($ajOffense));
        $complaint->setAttribute('offense_label', $this->formatOffenseLabel($ajReportOffense ?: $ajOffense ?: $akOffense));
        $complaint->setAttribute('primary_case', $this->resolvePrimaryCaseForComplaint($complaint));

        $isAssignedApprover = false;
        if ($user && $complaint->approverStaff) {
            if ($user->staff && $complaint->approver_staff_id) {
                $isAssignedApprover = (int) $user->staff->id === (int) $complaint->approver_staff_id;
            }
            if (! $isAssignedApprover && $user->name) {
                $isAssignedApprover = strcasecmp($user->name, $complaint->approverStaff->name) === 0;
            }
        }
        $approvalsCount = DB::table('complaint_approvals')
            ->where('complaint_id', $complaint->id)
            ->where('decision', 'approved')
            ->count();
        $hasApproved = false;
        if ($user) {
            $hasApproved = DB::table('complaint_approvals')
                ->where('complaint_id', $complaint->id)
                ->where('approver_user_id', $user->id)
                ->where('decision', 'approved')
                ->exists();
        }

        return response()->json([
            'message' => 'Complaint detail',
            'data' => $complaint,
            'meta' => [
                'approvals_count' => $approvalsCount,
                'approvals_required' => 2,
                'has_approved' => $hasApproved,
                'is_assigned_approver' => $isAssignedApprover,
            ],
        ]);
    }

    private function formatOffenseLabel($offense): string
    {
        if (! $offense) {
            return '';
        }

        $code = trim((string) ($offense->code ?? ''));
        $section = trim((string) ($offense->section ?? ''));
        $name = trim((string) ($offense->name ?? ''));
        $left = trim(implode(' ', array_filter([$code, $section])));
        $label = trim(implode(' - ', array_filter([$left, $name])));

        return $label;
    }

    public function openCase(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (strtoupper(trim((string) ($complaint->case_type ?? ''))) !== 'AJ') {
            return response()->json(['message' => 'Hanya aduan AJ boleh dibuka sebagai kes.'], 422);
        }

        $case = DB::transaction(function () use ($complaint) {
            return $this->findOrCreatePrimaryCase($complaint);
        }, 3);

        $freshComplaint = $complaint->fresh()->load([
            'cases:id,case_type,case_register_no,file_no,complaint_year,district_id,district_name,ppa_classification,current_status,arrest_status,action_datetime,created_at',
        ]);
        $freshComplaint->setAttribute('primary_case', $this->resolvePrimaryCaseForComplaint($freshComplaint));

        return response()->json([
            'message' => 'Kes berjaya dibuka.',
            'data' => $freshComplaint,
            'meta' => [
                'primary_case' => $case,
            ],
        ]);
    }

    public function createCase(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (strtoupper(trim((string) ($complaint->case_type ?? ''))) !== 'AJ') {
            return response()->json(['message' => 'Hanya aduan AJ boleh dibuka sebagai kes.'], 422);
        }

        $validated = $request->validate([
            'file_no' => ['nullable', 'string', 'max:255'],
            'report_offense_id' => ['nullable', 'integer', 'exists:ref_offenses,id'],
            'arrest_staff_id' => ['nullable', 'integer', 'exists:staff,id'],
            'current_status' => ['nullable', 'string', 'max:255'],
            'op_category' => ['nullable', 'string', 'max:255'],
            'op_case_status' => ['nullable', 'string', 'max:255'],
            'op_notes' => ['nullable', 'string', 'max:20000'],
            'arrest_status' => ['nullable', 'string', 'max:20'],
            'arrest_by' => ['nullable', 'string', 'max:255'],
            'male_count' => ['nullable', 'integer', 'min:0'],
            'female_count' => ['nullable', 'integer', 'min:0'],
            'other_count' => ['nullable', 'integer', 'min:0'],
            'action_datetime' => ['nullable', 'date'],
            'statement_datetime' => ['nullable', 'date'],
            'court_date' => ['nullable', 'date'],
            'report_notes' => ['nullable', 'string'],
            'oyds' => ['nullable', 'array'],
            'oyds.*.id' => ['nullable', 'integer'],
            'oyds.*.name' => ['nullable', 'string', 'max:255'],
            'oyds.*.id_number' => ['nullable', 'string', 'max:255'],
            'oyds.*.investigator_name' => ['nullable', 'string', 'max:255'],
            'oyds.*.file_no' => ['nullable', 'string', 'max:255'],
            'seizure_status' => ['nullable', 'string', 'max:20'],
            'police_report_status' => ['nullable', 'string', 'max:20'],
            'seizure_items' => ['nullable', 'array'],
            'seizure_items.*.id' => ['nullable', 'integer'],
            'seizure_items.*.item_no' => ['nullable', 'string', 'max:255'],
            'seizure_items.*.description' => ['nullable', 'string', 'max:2000'],
            'seizure_items.*.storage' => ['nullable', 'string', 'max:1000'],
            'police_reports' => ['nullable', 'array'],
            'police_reports.*.id' => ['nullable', 'integer'],
            'police_reports.*.report_no' => ['nullable', 'string', 'max:255'],
            'police_reports.*.description' => ['nullable', 'string', 'max:2000'],
            'police_reports.*.station' => ['nullable', 'string', 'max:1000'],
        ]);

        $case = DB::transaction(function () use ($complaint, $validated) {
            $case = $this->createAdditionalCaseForComplaint($complaint, [
                'file_no' => $this->nullableString($validated['file_no'] ?? null),
                'report_offense_id' => $validated['report_offense_id'] ?? null,
                'arrest_staff_id' => $validated['arrest_staff_id'] ?? null,
                'current_status' => $this->nullableString($validated['current_status'] ?? null),
                'op_category' => $this->nullableString($validated['op_category'] ?? null),
                'op_case_status' => $this->nullableString($validated['op_case_status'] ?? null),
                'op_notes' => $this->nullableString($validated['op_notes'] ?? null),
                'arrest_status' => $this->nullableString($validated['arrest_status'] ?? null),
                'arrest_by' => $this->nullableString($validated['arrest_by'] ?? null),
                'male_count' => $validated['male_count'] ?? null,
                'female_count' => $validated['female_count'] ?? null,
                'other_count' => $validated['other_count'] ?? null,
                'action_datetime' => $validated['action_datetime'] ?? null,
                'statement_datetime' => $validated['statement_datetime'] ?? null,
                'court_date' => $validated['court_date'] ?? null,
                'report_notes' => $this->nullableString($validated['report_notes'] ?? null),
                'seizure_status' => $this->nullableString($validated['seizure_status'] ?? null),
                'police_report_status' => $this->nullableString($validated['police_report_status'] ?? null),
            ]);

            $this->syncCaseChildRows($case, CaseOyd::class, 'oyds', $validated['oyds'] ?? [], ['name', 'id_number', 'investigator_name', 'file_no']);
            $this->syncCaseChildRows($case, CaseSeizureItem::class, 'seizureItems', $validated['seizure_items'] ?? [], ['item_no', 'description', 'storage']);
            $this->syncCaseChildRows($case, CasePoliceReport::class, 'policeReports', $validated['police_reports'] ?? [], ['report_no', 'description', 'station']);

            return $case->fresh();
        }, 3);

        $freshComplaint = $this->reloadComplaintWithCases($complaint);
        $freshCase = $this->loadCaseDetail($case);
        $autoLaporanEmailMeta = $this->autoSendLaporanTindakanEmailAfterCaseSave($freshCase);

        $response = [
            'message' => 'Kes baharu berjaya ditambah.',
            'data' => $freshComplaint,
            'meta' => [
                'primary_case' => $freshCase,
            ],
        ];

        if ($autoLaporanEmailMeta) {
            $response['meta']['laporan_tindakan_auto_email'] = $autoLaporanEmailMeta;
        }

        return response()->json($response);
    }

    public function activateCase(Request $request, Complaint $complaint, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $complaint->cases()->where('cases.id', $case->id)->exists()) {
            return response()->json(['message' => 'Kes ini tidak dipautkan pada aduan tersebut.'], 404);
        }
        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId && (int) ($case->district_id ?? 0) !== (int) $districtId) {
                return response()->json(['message' => 'Kes luar daerah tidak dibenarkan.'], 403);
            }
        }

        DB::transaction(function () use ($complaint, $case) {
            $this->setPrimaryCase($complaint, $case->id);
        }, 3);

        return response()->json([
            'message' => 'Kes aktif berjaya ditukar.',
            'data' => $this->reloadComplaintWithCases($complaint),
        ]);
    }

    public function attachCase(Request $request, Complaint $complaint, CaseRecord $case)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (strtoupper(trim((string) ($complaint->case_type ?? ''))) !== strtoupper(trim((string) ($case->case_type ?? '')))) {
            return response()->json(['message' => 'Kategori kes tidak sepadan dengan aduan.'], 422);
        }
        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId && (int) ($case->district_id ?? 0) !== (int) $districtId) {
                return response()->json(['message' => 'Kes luar daerah tidak dibenarkan.'], 403);
            }
        }

        DB::transaction(function () use ($complaint, $case) {
            DB::table('case_complaint_links')->insertOrIgnore([
                'case_id' => $case->id,
                'complaint_id' => $complaint->id,
                'is_primary' => false,
                'notes' => 'Attached to existing case from complaint detail flow.',
                'created_at' => now(),
                'updated_at' => now(),
            ]);

            $this->setPrimaryCase($complaint, $case->id);
        }, 3);

        return response()->json([
            'message' => 'Kes sedia ada berjaya dipautkan.',
            'data' => $this->reloadComplaintWithCases($complaint),
        ]);
    }

    public function emailBorang5(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:8000'],
        ]);

        $complaint->load([
            'submittedBy:id,name,email',
            'submittedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'submittedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'receivedBy:id,name,email',
            'receivedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'receivedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'approverStaff:id,name,staff_id',
        ]);

        $channel = strtolower(trim((string) ($complaint->channel ?? '')));
        $isPhysicalInformant = in_array($channel, ['walkin', 'walk-in', 'kaunter'], true);

        $receiverStaff = $complaint->receivedBy?->staff ?: $complaint->submittedBy?->staff;
        $issuerName = $complaint->submittedBy?->staff?->name
            ?: $complaint->submittedBy?->name
            ?: $complaint->receivedBy?->name
            ?: '-';

        $officerInformantName = $receiverStaff?->name ?: $complaint->receivedBy?->name ?: $issuerName;
        $officerInformantIdNumber = $receiverStaff?->staff_id ?: $receiverStaff?->ic_number ?: '-';
        $officerInformantOccupation = $receiverStaff?->position ?: 'Pegawai Penguatkuasa Agama';
        $officerInformantContactNumber = $this->resolveBorang5OfficePhone($complaint, $receiverStaff);
        $officerInformantAddress = $this->resolveBorang5OfficeAddress($complaint, $receiverStaff);

        $effectiveInformantName = $isPhysicalInformant
            ? ($complaint->complainant_name ?: '-')
            : $officerInformantName;
        $effectiveInformantIdNumber = $isPhysicalInformant
            ? ($complaint->identification_number ?: '-')
            : $officerInformantIdNumber;
        $effectiveInformantOccupation = $isPhysicalInformant
            ? ($complaint->complainant_occupation ?: '-')
            : $officerInformantOccupation;
        $effectiveInformantContactNumber = $isPhysicalInformant
            ? ($complaint->contact_number ?: '-')
            : $officerInformantContactNumber;
        $effectiveInformantAddress = $isPhysicalInformant
            ? (
                strtoupper(trim((string) ($complaint->case_type ?: 'AJ'))) === 'AJ'
                    ? ($complaint->current_address ?: $complaint->address ?: '-')
                    : ($complaint->address ?: '-')
            )
            : $officerInformantAddress;

        $approverSignerName = trim((string) ($complaint->approverStaff?->name ?: ''));
        // AK Borang 5: do not auto-fill officer signer with receiver/admin fallback.
        $effectiveOfficerSignerName = strtoupper((string) (
            $complaint->case_type === 'AK'
                ? ''
                : $approverSignerName
        ));
        $officerSignerPendingNote = (strtoupper((string) ($complaint->case_type ?: 'AJ')) === 'AJ' && $approverSignerName === '')
            ? '(Aduan belum disahkan oleh Pegawai Pengesah)'
            : '';

        $formatDateDmy = static function ($value): string {
            if (! $value) {
                return '-';
            }
            try {
                return Carbon::parse($value)->format('d-m-Y');
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $formatTime12hDot = static function ($value): string {
            if (! $value) {
                return '-';
            }
            try {
                return Carbon::parse($value)->format('g.i A');
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $reportDate = $formatDateDmy($complaint->complaint_date);
        $reportTime = $formatTime12hDot($complaint->complaint_time);
        $mainStatus = strtoupper(trim((string) ($complaint->aj_ppa_classification ?? '')));
        $reportText = $this->buildBorang5Narrative(
            (string) ($complaint->borang5_statement ?: $complaint->summary ?: ''),
            $this->resolveBorang5IncidentAddress($complaint)
        );

        $subjectReference = (string) ($complaint->reference_no ?: ('Aduan #' . $complaint->id));
        $subject = trim((string) ($validated['subject'] ?? '')) ?: "Borang 5 Aduan {$subjectReference}";
        $customBody = trim((string) ($validated['body'] ?? ''));
        $defaultBody = "Assalamualaikum\n\n"
            . "Aduan berstatus " . ($mainStatus !== '' ? $mainStatus : '-') . " untuk tindakan daerah "
            . (string) ($complaint->district_name ?: '-') . ".\n"
            . "Sila pastikan aduan diambil tindakan mengikut tempoh yang ditetapkan.\n\n"
            . "Muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail Aduan.\n\n"
            . "Terima kasih.";
        $bodyPlainText = $customBody !== '' ? $customBody : $defaultBody;
        $statusText = $mainStatus !== '' ? $mainStatus : '-';
        $districtText = (string) ($complaint->district_name ?: '-');
        $highlightLine = "Aduan berstatus {$statusText} untuk tindakan daerah {$districtText}.";
        $escapedBody = nl2br(e($bodyPlainText));
        $escapedBody = str_replace(
            e($highlightLine),
            'Aduan berstatus <strong>' . e($statusText) . '</strong> untuk tindakan daerah <strong>' . e($districtText) . '</strong>.',
            $escapedBody
        );
        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . $escapedBody
            . '</div>';
        $pdfBinary = Pdf::loadView('pdf.complaints.borang5', [
            'referenceNo' => $subjectReference,
            'caseType' => strtoupper((string) ($complaint->case_type ?: 'AJ')),
            'reportDate' => $reportDate,
            'reportTime' => $reportTime,
            'informantName' => (string) $effectiveInformantName,
            'informantIdNumber' => (string) $effectiveInformantIdNumber,
            'informantOccupation' => (string) $effectiveInformantOccupation,
            'informantContactNumber' => (string) $effectiveInformantContactNumber,
            'informantAddress' => (string) $effectiveInformantAddress,
            'reportText' => (string) $reportText,
            'officerSignerName' => (string) $effectiveOfficerSignerName,
            'officerSignerPendingNote' => (string) $officerSignerPendingNote,
            'mainStatus' => (string) $mainStatus,
        ])
            ->setPaper('a4', 'portrait')
            ->output();
        $safeReference = preg_replace('/[^A-Za-z0-9\-_]+/', '_', $subjectReference) ?: ('aduan_' . $complaint->id);
        $pdfFileName = 'borang5_' . $safeReference . '.pdf';

        try {
            Mail::send([], [], function ($message) use ($validated, $subject, $html, $pdfBinary, $pdfFileName): void {
                $message->to($validated['email'])
                    ->subject($subject)
                    ->html($html)
                    ->attachData($pdfBinary, $pdfFileName, ['mime' => 'application/pdf']);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal menghantar emel Borang 5.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Borang 5 berjaya dihantar melalui emel.',
            'data' => [
                'email' => $validated['email'],
                'subject' => $subject,
                'attachment' => $pdfFileName,
            ],
        ]);
    }

    public function emailTindakanAduan(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'subject' => ['nullable', 'string', 'max:255'],
            'body' => ['nullable', 'string', 'max:8000'],
        ]);

        $complaint->load([
            'submittedBy:id,name',
            'submittedBy.staff:id,name',
            'receivedBy:id,name',
            'ajDirectiveStaff:id,name',
            'ajHandoverStaff:id,name',
            'picUser:id,name',
            'actionUpdates:id,complaint_id,sort_order,classification,action_date,action_time,note',
        ]);

        $primaryCase = $this->resolvePrimaryCaseForComplaint($complaint);
        $caseSource = $primaryCase ?: $complaint;

        $formatDateDmySlash = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('d/m/Y');
            } catch (\Throwable) {
                return (string) $value;
            }
        };
        $formatTimeMalay = static function ($value): string {
            if (! $value) return '-';
            try {
                $dt = Carbon::parse($value);
                $session = ((int) $dt->format('H') < 12) ? 'PAGI' : 'PETANG';
                return $dt->format('g.i') . ' ' . $session;
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $complaintDate = $formatDateDmySlash($complaint->complaint_date);
        $complaintTime = $formatTimeMalay($complaint->complaint_time);
        $receivedBy = $complaint->receivedBy?->name
            ?: $complaint->submittedBy?->staff?->name
            ?: $complaint->submittedBy?->name
            ?: '-';
        $directiveBy = $complaint->ajDirectiveStaff?->name ?: '-';
        $pelaksanaName = $complaint->ajHandoverStaff?->name ?: $complaint->picUser?->name ?: '-';

        $directiveDateText = ($caseSource->directive_at ?? $complaint->aj_directive_at)
            ? $formatDateDmySlash($caseSource->directive_at ?? $complaint->aj_directive_at)
            : $complaintDate;
        $directiveTimeText = ($caseSource->directive_at ?? $complaint->aj_directive_at)
            ? $formatTimeMalay($caseSource->directive_at ?? $complaint->aj_directive_at)
            : $complaintTime;
        $handoverDateText = ($caseSource->handover_at ?? $complaint->handover_at)
            ? $formatDateDmySlash($caseSource->handover_at ?? $complaint->handover_at)
            : $complaintDate;
        $handoverTimeText = ($caseSource->handover_at ?? $complaint->handover_at)
            ? $formatTimeMalay($caseSource->handover_at ?? $complaint->handover_at)
            : $complaintTime;
        $historyRows = collect($complaint->actionUpdates ?? [])
            ->sortBy(fn ($row) => (int) ($row->sort_order ?? 0))
            ->filter(function ($row) {
                return trim((string) ($row->classification ?? '')) !== ''
                    || trim((string) ($row->action_date ?? '')) !== ''
                    || trim((string) ($row->action_time ?? '')) !== ''
                    || trim((string) ($row->note ?? '')) !== '';
            })
            ->map(function ($row) use ($formatDateDmySlash, $formatTimeMalay) {
                return [
                    'classification' => trim((string) ($row->classification ?? '')) !== '' ? (string) $row->classification : '-',
                    'date' => $row->action_date ? $formatDateDmySlash($row->action_date) : '-',
                    'time' => $row->action_time ? $formatTimeMalay($row->action_time) : '-',
                    'note' => trim((string) ($row->note ?? '')) !== '' ? (string) $row->note : '-',
                ];
            })
            ->values()
            ->all();

        $currentStatus = ($caseSource->current_status ?? $complaint->aj_current_status) ?: ($complaint->current_stage ?: '-');
        $districtDisplay = $complaint->district_name ?: '-';
        $caseRegisterNo = ($caseSource->case_register_no ?? $complaint->case_register_no) ?: '-';

        $defaultSubject = 'TINDAKAN (' . ((($caseSource->arrest_status ?? null) === 'ada' || $complaint->aj_arrest_status === 'ada') ? 'Ada Tangkapan' : 'Tiada Tangkapan') . ') : '
            . (($caseSource->case_register_no ?? $complaint->case_register_no) ?: $complaint->reference_no ?: ('Aduan #' . $complaint->id));
        $subject = trim((string) ($validated['subject'] ?? '')) ?: $defaultSubject;

        $defaultBody = "Assalamualaikum\n\n"
            . "Laporan Tindakan bagi daerah " . ($complaint->district_name ?: '-') . " telah diperolehi.\n\n"
            . "Sila muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail KES.\n\n"
            . "Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan\n\n"
            . "Terima kasih.";
        $bodyPlainText = trim((string) ($validated['body'] ?? '')) ?: $defaultBody;
        $highlightLine = 'Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan';
        $escapedBody = nl2br(e($bodyPlainText));
        $escapedBody = str_replace(
            e($highlightLine),
            '<strong>' . e($highlightLine) . '</strong>',
            $escapedBody
        );
        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . $escapedBody
            . '</div>';

        $pdfBinary = Pdf::loadView('pdf.complaints.tindakan-aduan', [
            'referenceNo' => (string) ($complaint->reference_no ?: '-'),
            'complaintDate' => $complaintDate,
            'complaintTime' => $complaintTime,
            'receivedBy' => $receivedBy,
            'pelaksanaName' => $pelaksanaName,
            'directiveBy' => $directiveBy,
            'directiveDateText' => $directiveDateText,
            'directiveTimeText' => $directiveTimeText,
            'districtDisplay' => $districtDisplay,
            'handoverDateText' => $handoverDateText,
            'handoverTimeText' => $handoverTimeText,
            'historyRows' => $historyRows,
            'currentStatus' => $currentStatus,
            'caseRegisterNo' => $caseRegisterNo,
            'directiveNotes' => (string) (($caseSource->directive_notes ?? null) ?: ($caseSource->report_notes ?? null) ?: $complaint->aj_directive_notes ?: $complaint->aj_report_notes ?: '-'),
        ])->setPaper('a4', 'portrait')->output();

        $safeReference = preg_replace('/[^A-Za-z0-9\-_]+/', '_', (string) ($complaint->reference_no ?: ('aduan_' . $complaint->id))) ?: ('aduan_' . $complaint->id);
        $pdfFileName = 'tindakan_aduan_' . $safeReference . '.pdf';

        try {
            Mail::send([], [], function ($message) use ($validated, $subject, $html, $pdfBinary, $pdfFileName): void {
                $message->to($validated['email'])
                    ->subject($subject)
                    ->html($html)
                    ->attachData($pdfBinary, $pdfFileName, ['mime' => 'application/pdf']);
            });
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Gagal menghantar emel Tindakan Aduan.',
                'error' => $e->getMessage(),
            ], 422);
        }

        return response()->json([
            'message' => 'Tindakan Aduan berjaya dihantar melalui emel.',
            'data' => [
                'email' => $validated['email'],
                'subject' => $subject,
                'attachment' => $pdfFileName,
            ],
        ]);
    }

    public function approve(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        $complaint->load('approverStaff:id,name');
        $isApprover = false;
        if ($user->staff && $complaint->approver_staff_id) {
            $isApprover = (int) $user->staff->id === (int) $complaint->approver_staff_id;
        }
        if (! $isApprover && $user->name && $complaint->approverStaff) {
            $isApprover = strcasecmp($user->name, $complaint->approverStaff->name) === 0;
        }
        if (! $isApprover) {
            return response()->json(['message' => 'Anda bukan pegawai pengesah yang ditetapkan.'], 403);
        }

        DB::table('complaint_approvals')->updateOrInsert(
            [
                'complaint_id' => $complaint->id,
                'approver_user_id' => $user->id,
            ],
            [
                'decision' => 'approved',
                'note' => $request->input('note'),
                'decided_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        $approvalsCount = DB::table('complaint_approvals')
            ->where('complaint_id', $complaint->id)
            ->where('decision', 'approved')
            ->count();

        // Temporary working rule: treat approved complaints as part of the KES domain first.
        // Status Terkini represents the current outcome/state of the case, not whether it is a case.
        $isCase = true;

        $complaint->update(array_merge(
            [
                'approver_confirmed_at' => now(),
                'is_case' => $isCase,
            ],
            $this->stagePayload('disahkan')
        ));

        return response()->json([
            'message' => 'Aduan telah disahkan oleh Pegawai Pengesah. Sila lengkapkan maklumat Jana Tindakan sebelum hantar ke daerah.',
            'approvals_count' => $approvalsCount,
            'current_stage' => $complaint->current_stage,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function dispatchToDistrict(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (strtoupper((string) ($complaint->case_type ?: 'AJ')) !== 'AJ') {
            return response()->json(['message' => 'Fungsi ini hanya terpakai untuk Aduan Jenayah (AJ).'], 422);
        }
        if (! $complaint->approver_confirmed_at) {
            return response()->json(['message' => 'Aduan belum disahkan oleh Pegawai Pengesah.'], 422);
        }
        if ((string) $complaint->current_stage === 'dihantar_ke_daerah') {
            return response()->json(['message' => 'Aduan telah dihantar ke daerah.'], 422);
        }
        if (! in_array((string) $complaint->current_stage, ['disahkan', 'menunggu_tindakan_pi'], true)) {
            return response()->json(['message' => 'Aduan perlu berstatus Disahkan sebelum dihantar ke daerah.'], 422);
        }

        $missingFields = [];
        if (! $complaint->aj_directive_staff_id) {
            $missingFields[] = 'Pegawai Yang Mengeluarkan Arahan';
        }
        if (! $complaint->aj_directive_at) {
            $missingFields[] = 'Tarikh / Masa Maklum Aduan';
        }
        if (! $complaint->aj_handover_staff_id) {
            $missingFields[] = 'Pegawai Yang Menerima Arahan';
        }
        if (! trim((string) $complaint->aj_current_status)) {
            $missingFields[] = 'Status Terkini';
        }
        if (
            trim((string) $complaint->aj_current_status) === 'Other'
            && trim((string) $complaint->aj_current_status_other) === ''
        ) {
            $missingFields[] = 'Status Terkini (Other)';
        }
        if (! trim((string) $complaint->aj_directive_notes)) {
            $missingFields[] = 'Arahan Tindakan';
        }

        if (! empty($missingFields)) {
            return response()->json([
                'message' => 'Lengkapkan medan wajib Jana Tindakan dahulu: ' . implode(', ', $missingFields) . '.',
                'errors' => [
                    'jana_tindakan' => $missingFields,
                ],
            ], 422);
        }

        $complaint->update($this->stagePayload('dihantar_ke_daerah'));

        $this->assignPpaToDistrict($complaint, $user->id);
        $this->mobilePushNotificationService->sendApprovedComplaintToDistrictNotification($complaint);

        return response()->json([
            'message' => 'Aduan berjaya dihantar ke daerah untuk tindakan lanjut.',
            'current_stage' => $complaint->current_stage,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function updateStatus(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'status' => 'required|string|in:baru,tunggu_pengesahan,menunggu_tindakan_pi,dalam_tindakan,kiv,selesai,laporan_tindakan,disahkan,dihantar_ke_daerah',
        ]);

        $complaint->update($this->stagePayload((string) $request->status));

        return response()->json([
            'message' => 'Status updated',
            'current_stage' => $complaint->current_stage,
        ]);
    }

    public function updateCaseType(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'case_type' => 'required|string|in:AJ,AK',
        ]);

        $complaint->update([
            'case_type' => $request->case_type,
        ]);

        return response()->json([
            'message' => 'Case type updated',
            'case_type' => $complaint->case_type,
        ]);
    }

    public function updateAssignees(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'approver_staff_id' => 'nullable|exists:staff,id',
        ]);

        // AK does not use approval flow. Keep receiver info only and mark as disahkan.
        if (strtoupper((string) ($complaint->case_type ?: 'AJ')) === 'AK') {
            $payload = [
                'received_by_user_id' => $user->id,
                'received_at' => now(),
            ];
            if (in_array((string) $complaint->current_stage, ['baru', 'tunggu_pengesahan'], true)) {
                $payload = array_merge($payload, $this->stagePayload('disahkan'));
            }
            if (! empty($payload)) {
                $complaint->update($payload);
            }

            return response()->json([
                'message' => 'AK tidak memerlukan pengesahan.',
                'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
            ]);
        }

        if (! $request->filled('approver_staff_id')) {
            return response()->json(['message' => 'Sila pilih Pegawai Pengesah dahulu.'], 422);
        }

        $classification = strtoupper(trim((string) ($complaint->aj_ppa_classification ?? '')));
        $offenseId = (int) ($complaint->aj_offense_id ?? 0);
        $borang5Statement = trim((string) ($complaint->borang5_statement ?? ''));
        $incidentAddress = trim((string) ($complaint->address ?? ''));

        $missingFields = [];
        $classification = $this->normalizePpaClassification($classification);
        if (! $classification) {
            $missingFields[] = 'Klasifikasi';
        }
        if ($offenseId <= 0) {
            $missingFields[] = 'Kesalahan Disyaki';
        }
        if ($incidentAddress === '') {
            $missingFields[] = 'Alamat Kejadian';
        }
        if ($borang5Statement === '') {
            $missingFields[] = 'Butiran Aduan (Borang 5)';
        }

        if (! empty($missingFields)) {
            return response()->json([
                'message' => 'Sila lengkapkan dan simpan medan wajib dahulu sebelum Hantar Pengesahan: ' . implode(', ', $missingFields) . '.',
                'errors' => [
                    'required_fields' => $missingFields,
                ],
            ], 422);
        }

        $payload = [];
        $payload['approver_staff_id'] = $request->approver_staff_id;
        if ((int) $request->approver_staff_id !== (int) $complaint->approver_staff_id || ! $complaint->approver_assigned_at) {
            $payload['approver_assigned_at'] = now();
        }
        $payload = array_merge($payload, $this->stagePayload('tunggu_pengesahan'));
        $payload['received_by_user_id'] = $user->id;
        $payload['received_at'] = now();

        if (! empty($payload)) {
            $complaint->update($payload);
        }

        return response()->json([
            'message' => 'Maklumat aduan telah dihantar kepada pengesah. Status: Menunggu Pengesahan.',
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function updateBasic(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Respect the same access scope as view. (E.g. pegawai_daerah limited to their district.)
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $allowedWhenBasicLocked = [
            'borang5_statement',
            'offense_id',
            'complaint_date',
            'complaint_time',
        ];
        $requestKeys = collect($request->keys())
            ->reject(fn ($key) => str_starts_with((string) $key, '_'))
            ->values()
            ->all();
        $isAllowedLockedUpdate = ! empty($requestKeys)
            && collect($requestKeys)->every(fn ($key) => in_array($key, $allowedWhenBasicLocked, true));

        if ($this->isBasicOfficerEditLockedByChannel($complaint->channel) && ! $isAllowedLockedUpdate) {
            return response()->json([
                'message' => 'Aduan dari portal atau WhatsApp AI tidak boleh dikemaskini oleh pegawai pada bahagian ini.',
            ], 422);
        }

        $validated = $request->validate([
            'complainant_name' => 'nullable|string|max:255',
            'identification_number' => 'nullable|string|max:255',
            'contact_number' => 'nullable|string|max:255',
            'informant_name' => 'nullable|string|max:255',
            'informant_identification_number' => 'nullable|string|max:255',
            'informant_contact_number' => 'nullable|string|max:255',
            'complainant_occupation' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:1000',
            'district_id' => 'nullable|exists:districts,id',
            'summary' => 'nullable|string|max:10000',
            'borang5_statement' => 'nullable|string|max:20000',
            'complaint_date' => 'nullable|date',
            'complaint_time' => 'nullable|date_format:H:i',
            'incident_date' => 'nullable|date',
            'incident_time' => 'nullable|date_format:H:i',
            'offense_id' => 'nullable|exists:ref_offenses,id',
            'ak_subtype' => 'nullable|string|in:nikah,cerai,rujuk,poligami',
            'ak_partner_name' => 'nullable|string|max:255',
            'ak_cerai_count' => 'nullable|integer|min:1|max:99',
            'ak_cerai_talaq_count' => 'nullable|integer|min:1|max:99',
            'ak_poligami_marriage_count' => 'nullable|integer|min:1|max:99',
            'ak_poligami_wife_count' => 'nullable|integer|min:1|max:99',
            'ak_event_date' => 'nullable|date',
            'ak_event_place' => 'nullable|string|max:255',
            'ak_event_time' => 'nullable|date_format:H:i',
            'current_address' => 'nullable|string|max:1000',
            'ak_rujuk_date' => 'nullable|date',
            'attachments' => 'nullable|array|max:10',
            'attachments.*' => 'file|max:51200|mimes:pdf,jpg,jpeg,png,doc,docx',
        ]);

        $payload = [];
        foreach ([
            'complainant_name',
            'identification_number',
            'contact_number',
            'informant_name',
            'informant_identification_number',
            'informant_contact_number',
            'complainant_occupation',
            'address',
            'borang5_statement',
            'complaint_date',
            'incident_date',
            'ak_subtype',
            'ak_partner_name',
            'ak_cerai_count',
            'ak_cerai_talaq_count',
            'ak_poligami_marriage_count',
            'ak_poligami_wife_count',
            'ak_event_date',
            'ak_event_place',
            'current_address',
            'ak_rujuk_date',
        ] as $key) {
            if (array_key_exists($key, $validated)) {
                $payload[$key] = $validated[$key];
            }
        }

        // complaints.summary is non-nullable in current schema.
        // Allow officer flows to keep it empty string (but never NULL).
        if (array_key_exists('summary', $validated)) {
            $payload['summary'] = $validated['summary'] ?? '';
        }

        if (array_key_exists('complaint_time', $validated)) {
            // Stored as TIME in DB; normalize to H:i:s
            $payload['complaint_time'] = $validated['complaint_time'] !== null
                ? ($validated['complaint_time'] . ':00')
                : null;
        }

        if (array_key_exists('incident_time', $validated)) {
            $payload['incident_time'] = $validated['incident_time'] !== null && $validated['incident_time'] !== ''
                ? ($validated['incident_time'] . ':00')
                : null;
        }

        if (array_key_exists('ak_event_time', $validated)) {
            $payload['ak_event_time'] = $validated['ak_event_time'] !== null && $validated['ak_event_time'] !== ''
                ? ($validated['ak_event_time'] . ':00')
                : null;
        }

        if (array_key_exists('district_id', $validated)) {
            $district = $validated['district_id'] ? District::find($validated['district_id']) : null;
            $payload['district_id'] = $district?->id;
            $payload['district_name'] = $district?->name;
        }

        if (array_key_exists('offense_id', $validated)) {
            $offenseId = $validated['offense_id'] ? (int) $validated['offense_id'] : null;
            if (strtoupper((string) ($complaint->case_type ?: 'AJ')) === 'AK') {
                $payload['ak_offense_id'] = $offenseId;
            } else {
                $payload['aj_offense_id'] = $offenseId;
            }
        }

        if (! empty($payload)) {
            if (! $complaint->received_by_user_id) {
                $payload['received_by_user_id'] = $user->id;
                $payload['received_at'] = now();
            }
            $complaint->update($payload);
        }

        $freshComplaint = $complaint->fresh()->load([
            'submittedBy:id,name,email,office_type,district_id',
            'submittedBy.staff',
            'submittedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'receivedBy:id,name,email',
            'receivedBy.staff',
            'receivedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'approverStaff:id,name,staff_id',
            'picUser:id,name',
            'appointment:id,complaint_id,start_at,end_at,status',
        ]);
        $autoBorang5EmailMeta = $this->autoSendBorang5EmailAfterMandatorySave($freshComplaint);

        $response = [
            'message' => 'Maklumat aduan dikemaskini.',
            'data' => $freshComplaint,
        ];
        if ($autoBorang5EmailMeta) {
            $response['meta'] = [
                'borang5_auto_email' => $autoBorang5EmailMeta,
            ];
        }

        return response()->json($response);
    }

    public function pickup(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        // Intake lock flow: once clicked from "baru", lock to the pegawai first.
        // Status remains "baru" until classification is saved in Tindakan Aduan.
        if ((string) $complaint->current_stage === 'baru') {
            if ($complaint->received_by_user_id && (int) $complaint->received_by_user_id !== (int) $user->id) {
                $receiverName = optional($complaint->receivedBy)->name ?: 'pegawai lain';
                return response()->json([
                    'message' => "Aduan sedang dikemaskini oleh {$receiverName}.",
                ], 409);
            }

            if ((int) $complaint->received_by_user_id === (int) $user->id) {
                return response()->json([
                    'message' => 'Aduan ini sedang dikemaskini oleh anda. Sila teruskan kemaskini klasifikasi.',
                    'data' => $complaint->load(['receivedBy:id,name,email', 'picUser:id,name']),
                ]);
            }

            $complaint->update([
                'received_by_user_id' => $user->id,
                'received_at' => now(),
            ]);

            return response()->json([
                'message' => 'Aduan dikunci kepada anda. Sila teruskan kemaskini klasifikasi.',
                'data' => $complaint->load(['receivedBy:id,name,email', 'picUser:id,name']),
            ]);
        }

        $assignment = DB::table('complaint_assignments')
            ->where('complaint_id', $complaint->id)
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->first();

        if (! $assignment) {
            return response()->json(['message' => 'Aduan ini belum ditugaskan kepada anda.'], 403);
        }

        if ($complaint->pic_user_id) {
            return response()->json(['message' => 'Aduan ini sudah diambil oleh pegawai lain.'], 409);
        }

        DB::transaction(function () use ($complaint, $user) {
            $complaint->update([
                'pic_user_id' => $user->id,
                'pic_assigned_at' => now(),
            ]);

            DB::table('complaint_assignments')
                ->where('complaint_id', $complaint->id)
                ->where('user_id', $user->id)
                ->update([
                    'status' => 'accepted',
                    'accepted_at' => now(),
                    'updated_at' => now(),
                ]);

            DB::table('complaint_assignments')
                ->where('complaint_id', $complaint->id)
                ->where('user_id', '<>', $user->id)
                ->where('status', 'active')
                ->update([
                    'status' => 'released',
                    'released_at' => now(),
                    'updated_at' => now(),
                ]);
        });

        return response()->json([
            'message' => 'Aduan berjaya diambil.',
            'data' => $complaint->load(['picUser:id,name']),
        ]);
    }

    public function releaseIntake(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ((string) $complaint->current_stage !== 'baru') {
            return response()->json([
                'message' => 'Lock aduan tidak boleh dilepaskan kerana aduan sudah bergerak ke status lain.',
            ], 422);
        }

        if ((int) $complaint->received_by_user_id !== (int) $user->id) {
            return response()->json([
                'message' => 'Aduan ini tidak sedang dikemaskini oleh anda.',
            ], 403);
        }

        $complaint->update([
            'received_by_user_id' => null,
            'received_at' => null,
        ]);

        return response()->json([
            'message' => 'Lock aduan telah dilepaskan.',
            'data' => $complaint->load(['receivedBy:id,name,email']),
        ]);
    }

    public function updateAjPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $ppaClassification = strtoupper(trim((string) ($request->payload['classification'] ?? '')));
        $allowedPpa = ['FNA', 'KIV', 'NFA', 'OP'];
        if ($ppaClassification === 'FFA') {
            $ppaClassification = 'FNA';
        }
        if (! in_array($ppaClassification, $allowedPpa, true)) {
            $ppaClassification = null;
        }

        // Auto switch KIV -> NFA after 10 days from complaint date/time.
        if ($ppaClassification === 'KIV' && $complaint->complaint_date) {
            $complaintTime = $complaint->complaint_time ?: '00:00:00';
            try {
                $complaintAt = Carbon::parse($complaint->complaint_date . ' ' . $complaintTime);
                if ($complaintAt->copy()->addDays(10)->lte(now())) {
                    $ppaClassification = 'NFA';
                }
            } catch (\Throwable $e) {
                // Keep original classification if datetime parsing fails.
            }
        }

        $payload = [
            'aj_offense_id' => $request->payload['offense_id'] ?? null,
            'aj_offense_type' => $request->payload['offense_type_id'] ?? null,
            'aj_khalwat_detail_id' => $request->payload['khalwat_detail_id'] ?? null,
            'aj_judi_detail_id' => $request->payload['judi_detail_id'] ?? null,
            'aj_notes' => $request->payload['notes'] ?? null,
            'aj_ppa_classification' => $ppaClassification,
            'aj_supervisor_staff_id' => $request->payload['supervisor_staff_id'] ?? null,
            'aj_ip_status' => $request->payload['ip_status'] ?? null,
            'aj_ip_due_date' => $request->payload['ip_due_date'] ?? null,
            'aj_kpp_due_date' => $request->payload['kpp_due_date'] ?? null,
            'aj_jpss_due_date' => $request->payload['jpss_due_date'] ?? null,
            'aj_charge_recommendations' => collect($request->payload['charge_recommendations'] ?? [])
                ->map(function ($row) {
                    return [
                        'portfolio' => trim((string) ($row['portfolio'] ?? '')),
                        'name' => trim((string) ($row['name'] ?? '')),
                        'offense_id' => ($row['offense_id'] ?? null) ? (int) $row['offense_id'] : null,
                    ];
                })
                ->filter(function ($row) {
                    return $row['portfolio'] !== '' || $row['name'] !== '' || ! empty($row['offense_id']);
                })
                ->values()
                ->all(),
            'aj_investigation_notes' => $request->payload['investigation_notes'] ?? null,
            'aj_prosecution_status' => $request->payload['prosecution_status'] ?? null,
            'aj_prosecutor_staff_id' => $request->payload['prosecutor_staff_id'] ?? null,
            'aj_mahkamah_id' => $request->payload['mahkamah_id'] ?? null,
            'aj_fine' => $request->payload['fine'] ?? null,
            'aj_prosecution_notes' => $request->payload['prosecution_notes'] ?? null,
            'aj_fir_no' => $request->payload['fir_no'] ?? null,
        ];
        if (! $complaint->received_by_user_id) {
            $payload['received_by_user_id'] = $user->id;
            $payload['received_at'] = now();
        }
        if ((string) $complaint->current_stage === 'baru' && $ppaClassification) {
            $payload = array_merge($payload, $this->stagePayload('dalam_tindakan'));
        }

        $complaint->update($payload);

        return response()->json([
            'message' => 'AJ payload updated',
            'aj_payload' => $request->payload,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id']),
        ]);
    }

    public function updateAjReport(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        // Respect the same access scope as view. (E.g. pegawai_daerah limited to their district.)
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        return response()->json([
            'message' => 'Laporan Tindakan kini disimpan melalui modul KES. Sila gunakan endpoint PUT /cases/{id}.',
        ], 410);

        $request->validate([
            'report' => 'required|array',
            'report.case_id' => 'nullable|integer|exists:cases,id',
            'report.case_register_no' => 'nullable|string|max:255',
            'report.oyds' => 'nullable|array',
            'report.seizure_items' => 'nullable|array',
            'report.police_report_status' => 'nullable|in:ada,tiada',
            'report.police_reports' => 'nullable|array',
            'report.file_no' => 'nullable|string|max:255',
            'report.op_category' => 'nullable|string|max:255',
            'report.op_case_status' => 'nullable|string|max:255',
            'report.op_notes' => 'nullable|string|max:20000',
        ]);

        $report = $request->report;
        $isNoArrest = ($report['arrest_status'] ?? null) === 'tiada';
        $isDispatchedToDistrict = (string) $complaint->current_stage === 'dihantar_ke_daerah';
        $policeReportStatus = (string) ($report['police_report_status'] ?? '');
        $incomingPoliceReports = $policeReportStatus === 'ada' ? ($report['police_reports'] ?? []) : [];

        $missingFields = [];
        if (trim((string) ($report['arrest_status'] ?? '')) === '') {
            $missingFields[] = 'Status Tangkapan';
        }
        if (trim((string) ($report['action_datetime'] ?? '')) === '') {
            $missingFields[] = 'Tarikh / Masa';
        }
        if (trim((string) ($report['arrest_staff_id'] ?? '')) === '') {
            $missingFields[] = 'Pegawai Penangkap';
        }
        $hasReportNotes = trim((string) ($report['report_notes'] ?? '')) !== '';
        if (! $hasReportNotes) {
            $missingFields[] = 'Laporan';
        }
        if (! empty($missingFields)) {
            return response()->json([
                'message' => 'Lengkapkan medan wajib dahulu sebelum Simpan: ' . implode(', ', $missingFields) . '.',
            ], 422);
        }

        $primaryCase = null;
        $submittedCaseId = (int) ($report['case_id'] ?? 0);
        $submittedCaseRegisterNo = trim((string) ($report['case_register_no'] ?? ''));
        $targetCase = null;
        if ($submittedCaseId > 0) {
            $targetCase = CaseRecord::query()->find($submittedCaseId);
            if (! $targetCase || ! $complaint->cases()->where('cases.id', $targetCase->id)->exists()) {
                return response()->json(['message' => 'Kes yang dipilih tidak dipautkan pada aduan ini.'], 422);
            }
            if (! $this->canViewCaseRecord($targetCase, $user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }
        }

        $effectiveCaseRegisterNo = trim((string) ($targetCase?->case_register_no ?? ''));
        if ($effectiveCaseRegisterNo === '') {
            $effectiveCaseRegisterNo = $submittedCaseRegisterNo;
        }
        if ($effectiveCaseRegisterNo === '') {
            $effectiveCaseRegisterNo = trim((string) ($complaint->case_register_no ?? ''));
        }
        if ($effectiveCaseRegisterNo === '') {
            $effectiveCaseRegisterNo = $this->generateCaseRegisterNo($complaint);
        }

        $duplicateCase = CaseRecord::query()
            ->where('case_register_no', $effectiveCaseRegisterNo)
            ->when($targetCase, fn ($query) => $query->where('id', '!=', $targetCase->id))
            ->first();
        if ($duplicateCase) {
            return response()->json([
                'message' => 'No. daftar kes ini sudah digunakan oleh kes lain: ' . $effectiveCaseRegisterNo,
            ], 422);
        }

        DB::transaction(function () use ($complaint, $report, $incomingPoliceReports, $isNoArrest, $hasReportNotes, $isDispatchedToDistrict, $effectiveCaseRegisterNo, $targetCase, &$primaryCase) {
            $complaint->update([
                'aj_arrest_status' => $report['arrest_status'] ?? null,
                'aj_male_count' => $isNoArrest ? null : ($report['male_count'] !== '' ? $report['male_count'] : null),
                'aj_female_count' => $isNoArrest ? null : ($report['female_count'] !== '' ? $report['female_count'] : null),
                'aj_other_count' => $isNoArrest ? null : ($report['other_count'] !== '' ? $report['other_count'] : null),
                'aj_action_datetime' => $report['action_datetime'] ?? null,
                'aj_report_offense_id' => $report['offense_id'] ?? null,
                'aj_arrest_by' => $isNoArrest ? null : ($report['arrest_by'] ?? null),
                'aj_arrest_staff_id' => $report['arrest_staff_id'] ?? null,
                'aj_statement_datetime' => $report['statement_datetime'] ?? null,
                'aj_court_date' => $report['court_date'] ?? null,
                'aj_report_notes' => $report['report_notes'] ?? null,
                'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : null,
                'aj_file_no' => $report['file_no'] ?? null,
                'aj_directive_staff_id' => $report['directive_staff_id'] ?? null,
                'aj_directive_at' => $report['directive_at'] ?? null,
                'aj_directive_notes' => $report['directive_notes'] ?? null,
                'handover_at' => $report['handover_at'] ?? null,
                'handover_notes' => $report['handover_notes'] ?? null,
                'aj_seizure_status' => $report['seizure_status'] ?? null,
                'aj_police_report_status' => $report['police_report_status'] ?? null,
            ]);

            if ($targetCase) {
                $this->setPrimaryCase($complaint, $targetCase->id);
                $primaryCase = $targetCase;
            } else {
                $primaryCase = $this->findOrCreatePrimaryCase($complaint, [
                    'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : null,
                ]);
            }

            $this->syncPrimaryCaseFromAjReport($primaryCase, $complaint, $report, $effectiveCaseRegisterNo, $isNoArrest);

            // Auto progress stage: after aduan is approved and pegawai daerah completes the report,
            // mark it as "laporan_tindakan" (Laporan Tindakan Selesai).
            if ($hasReportNotes && $isDispatchedToDistrict) {
                $complaint->update($this->stagePayload('laporan_tindakan'));
            }

            $existingOyds = ComplaintOyd::where('complaint_id', $complaint->id)
                ->get()
                ->keyBy('id');
            $incomingRows = $report['oyds'] ?? [];
            $incomingIds = collect($incomingRows)
                ->pluck('id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->all();

            foreach ($existingOyds as $existing) {
                if (! in_array((int) $existing->id, $incomingIds, true)) {
                    $existing->delete();
                }
            }

            foreach ($incomingRows as $row) {
                if (! array_filter($row ?? [])) {
                    continue;
                }

                $rowId = isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null;
                if ($rowId && $existingOyds->has($rowId)) {
                    $existingOyds->get($rowId)->update([
                        'name' => $row['name'] ?? null,
                        'id_number' => $row['id_number'] ?? null,
                        'investigator_name' => $row['investigator_name'] ?? null,
                        'file_no' => $row['file_no'] ?? null,
                    ]);
                    continue;
                }

                ComplaintOyd::create([
                    'complaint_id' => $complaint->id,
                    'name' => $row['name'] ?? null,
                    'id_number' => $row['id_number'] ?? null,
                    'investigator_name' => $row['investigator_name'] ?? null,
                    'file_no' => $row['file_no'] ?? null,
                ]);
            }

            $existingItems = ComplaintSeizureItem::where('complaint_id', $complaint->id)
                ->with('media')
                ->get()
                ->keyBy('id');
            $incomingItems = $report['seizure_items'] ?? [];
            $incomingItemIds = collect($incomingItems)
                ->pluck('id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->all();

            foreach ($existingItems as $existingItem) {
                if (! in_array((int) $existingItem->id, $incomingItemIds, true)) {
                    foreach ($existingItem->media as $media) {
                        if ($media->path) {
                            Storage::disk($media->disk ?: 'local')->delete($media->path);
                        }
                        $media->delete();
                    }
                    $existingItem->delete();
                }
            }

            foreach ($incomingItems as $row) {
                $rowId = isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null;
                $hasValue = collect([
                    $row['item_no'] ?? null,
                    $row['description'] ?? null,
                    $row['storage'] ?? null,
                ])->contains(fn ($value) => trim((string) $value) !== '');

                if ($rowId && $existingItems->has($rowId)) {
                    $existingItems->get($rowId)->update([
                        'item_no' => $row['item_no'] ?? null,
                        'description' => $row['description'] ?? null,
                        'storage' => $row['storage'] ?? null,
                    ]);
                    continue;
                }

                if (! $hasValue) {
                    continue;
                }

                ComplaintSeizureItem::create([
                    'complaint_id' => $complaint->id,
                    'item_no' => $row['item_no'] ?? null,
                    'description' => $row['description'] ?? null,
                    'storage' => $row['storage'] ?? null,
                ]);
            }

            $existingReports = ComplaintPoliceReport::where('complaint_id', $complaint->id)
                ->with('media')
                ->get()
                ->keyBy('id');
            $incomingReports = $incomingPoliceReports;
            $incomingReportIds = collect($incomingReports)
                ->pluck('id')
                ->filter()
                ->map(fn ($id) => (int) $id)
                ->all();

            foreach ($existingReports as $existingReport) {
                if (! in_array((int) $existingReport->id, $incomingReportIds, true)) {
                    foreach ($existingReport->media as $media) {
                        if ($media->path) {
                            Storage::disk($media->disk ?: 'local')->delete($media->path);
                        }
                        $media->delete();
                    }
                    $existingReport->delete();
                }
            }

            foreach ($incomingReports as $row) {
                $rowId = isset($row['id']) && $row['id'] !== '' ? (int) $row['id'] : null;
                $hasValue = collect([
                    $row['report_no'] ?? null,
                    $row['description'] ?? null,
                    $row['station'] ?? null,
                ])->contains(fn ($value) => trim((string) $value) !== '');

                if ($rowId && $existingReports->has($rowId)) {
                    $existingReports->get($rowId)->update([
                        'report_no' => $row['report_no'] ?? null,
                        'description' => $row['description'] ?? null,
                        'station' => $row['station'] ?? null,
                    ]);
                    continue;
                }

                if (! $hasValue) {
                    continue;
                }

                ComplaintPoliceReport::create([
                    'complaint_id' => $complaint->id,
                    'report_no' => $row['report_no'] ?? null,
                    'description' => $row['description'] ?? null,
                    'station' => $row['station'] ?? null,
                ]);
            }
        });

        $freshComplaint = $complaint->fresh()->load([
            'cases:id,case_type,case_register_no,file_no,complaint_year,district_id,district_name,ppa_classification,current_status,arrest_status,action_datetime,created_at',
        ]);
        $freshComplaint->setAttribute('primary_case', $this->resolvePrimaryCaseForComplaint($freshComplaint));
        $autoLaporanEmailMeta = $this->autoSendLaporanTindakanEmailAfterSave($freshComplaint);

        $response = [
            'message' => 'Laporan pemeriksaan dikemaskini.',
            'data' => $freshComplaint->load([
                'oyds:id,complaint_id,name,id_number,investigator_name,file_no',
                'oyds.media:id,complaint_oyd_id,category,file_name,mime,size,created_at',
                'seizureItems:id,complaint_id,item_no,description,storage',
                'seizureItems.media:id,complaint_seizure_item_id,category,file_name,mime,size,created_at',
                'policeReports:id,complaint_id,report_no,description,station',
                'policeReports.media:id,complaint_police_report_id,category,file_name,mime,size,created_at',
            ]),
        ];

        if ($autoLaporanEmailMeta) {
            $response['meta'] = [
                'laporan_tindakan_auto_email' => $autoLaporanEmailMeta,
            ];
        }

        return response()->json($response);
    }

    public function updateAjActionReport(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'report' => 'required|array',
            'report.directive_staff_id' => 'nullable|exists:staff,id',
            'report.handover_staff_id' => 'nullable|exists:staff,id',
            'report.directive_at' => 'nullable|date',
            'report.directive_notes' => 'nullable|string|max:20000',
            'report.handover_at' => 'nullable|date',
            'report.handover_notes' => 'nullable|string|max:20000',
            'report.current_status' => 'nullable|string|max:255',
            'report.current_status_other' => 'nullable|string|max:255',
            'report.case_register_no' => 'nullable|string|max:255',
            'report.op_category' => 'nullable|string|max:255',
            'report.op_case_status' => 'nullable|string|max:255',
            'report.op_notes' => 'nullable|string|max:20000',
            'report.file_no' => 'nullable|string|max:255',
            'report.history_entries' => 'nullable|array',
            'report.history_entries.*.classification' => 'nullable|string|max:10',
            'report.history_entries.*.action_date' => 'nullable|date',
            'report.history_entries.*.action_time' => 'nullable|string|max:10',
            'report.history_entries.*.note' => 'nullable|string|max:20000',
        ]);

        $report = $validated['report'];
        $currentStatus = trim((string) ($report['current_status'] ?? ''));
        $currentStatusOther = trim((string) ($report['current_status_other'] ?? ''));
        if ($currentStatus === 'Other' && $currentStatusOther === '') {
            return response()->json([
                'message' => 'Sila isi maklumat Status Terkini (Other).',
                'errors' => [
                    'current_status_other' => ['Sila isi maklumat Status Terkini (Other).'],
                ],
            ], 422);
        }
        $submittedCaseRegisterNo = trim((string) ($report['case_register_no'] ?? ''));
        $effectiveCaseRegisterNo = $submittedCaseRegisterNo !== ''
            ? $submittedCaseRegisterNo
            : trim((string) ($complaint->case_register_no ?? ''));
        if ($effectiveCaseRegisterNo === '') {
            $effectiveCaseRegisterNo = $this->generateCaseRegisterNo($complaint);
        }
        $historyEntries = collect($report['history_entries'] ?? [])
            ->map(function ($row, $index) {
                $classification = strtoupper(trim((string) ($row['classification'] ?? '')));
                $classification = $this->normalizePpaClassification($classification);
                if (! $classification) {
                    $classification = null;
                }

                return [
                    'sort_order' => $index + 1,
                    'classification' => $classification,
                    'action_date' => $row['action_date'] ?? null,
                    'action_time' => trim((string) ($row['action_time'] ?? '')) ?: null,
                    'note' => $row['note'] ?? null,
                ];
            })
            ->filter(function ($row) {
                return $row['classification']
                    || $row['action_date']
                    || $row['action_time']
                    || trim((string) ($row['note'] ?? '')) !== '';
            })
            ->values();

        $latestClassification = $historyEntries->last()['classification'] ?? $complaint->aj_ppa_classification;

        DB::transaction(function () use ($complaint, $report, $historyEntries, $latestClassification, $effectiveCaseRegisterNo, $currentStatus, $currentStatusOther, $submittedCaseRegisterNo) {
            $complaint->update([
                'aj_directive_staff_id' => $report['directive_staff_id'] ?? null,
                'aj_handover_staff_id' => $report['handover_staff_id'] ?? null,
                'aj_directive_at' => $report['directive_at'] ?? null,
                'aj_directive_notes' => $report['directive_notes'] ?? null,
                'handover_at' => $report['handover_at'] ?? null,
                'handover_notes' => $report['handover_notes'] ?? null,
                'aj_current_status' => $currentStatus !== '' ? $currentStatus : null,
                'aj_current_status_other' => $currentStatus === 'Other'
                    ? ($currentStatusOther !== '' ? $currentStatusOther : null)
                    : null,
                'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : null,
                'aj_op_category' => $report['op_category'] ?? null,
                'aj_op_case_status' => $report['op_case_status'] ?? null,
                'aj_op_notes' => $report['op_notes'] ?? null,
                'aj_file_no' => $report['file_no'] ?? null,
                'aj_ppa_classification' => $latestClassification,
            ]);

            $primaryCase = $this->findPrimaryCase($complaint);
            if ($primaryCase || $submittedCaseRegisterNo !== '') {
                $primaryCase = $primaryCase ?: $this->findOrCreatePrimaryCase($complaint, [
                    'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : null,
                ]);
                $this->syncPrimaryCaseFromAjActionReport(
                    $primaryCase,
                    $complaint,
                    $report,
                    $effectiveCaseRegisterNo,
                    $latestClassification,
                    $currentStatus,
                    $currentStatusOther
                );
            }

            DB::table('complaint_action_updates')->where('complaint_id', $complaint->id)->delete();

            if ($historyEntries->isNotEmpty()) {
                $now = now();
                DB::table('complaint_action_updates')->insert(
                    $historyEntries->map(fn ($row) => [
                        'complaint_id' => $complaint->id,
                        'sort_order' => $row['sort_order'],
                        'classification' => $row['classification'],
                        'action_date' => $row['action_date'],
                        'action_time' => $row['action_time'],
                        'note' => $row['note'],
                        'created_at' => $now,
                        'updated_at' => $now,
                    ])->all()
                );
            }
        });

        $freshComplaint = $complaint->fresh()->load([
            'receivedBy:id,name,email',
            'approverStaff:id,name,staff_id',
            'ajDirectiveStaff:id,name,staff_id,ic_number,phone,address,position,department',
            'actionUpdates:id,complaint_id,sort_order,classification,action_date,action_time,note,created_at',
            'cases:id,case_type,case_register_no,file_no,complaint_year,district_id,district_name,ppa_classification,current_status,arrest_status,action_datetime,created_at',
        ]);
        $freshComplaint->setAttribute('primary_case', $this->resolvePrimaryCaseForComplaint($freshComplaint));

        return response()->json([
            'message' => 'Laporan tindakan dikemaskini.',
            'data' => $freshComplaint,
        ]);
    }

    public function uploadOydMedia(Request $request, Complaint $complaint, ComplaintOyd $oyd)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'OYDS tidak sah untuk aduan ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $category = $request->input('category', 'lain_lain');
        $disk = 'local';
        $folder = "complaints/oyds/{$complaint->id}/{$oyd->id}";
        $uploaded = [];
        $scanResult = null;
        $scanMessage = null;

        $files = $request->file('files', []);
        foreach ($files as $file) {
            $storedName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($folder, $storedName, $disk);

            $media = ComplaintOydMedia::create([
                'complaint_oyd_id' => $oyd->id,
                'category' => $category,
                'file_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'path' => $path,
                'disk' => $disk,
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => $user->id,
            ]);

            $uploaded[] = [
                'id' => $media->id,
                'category' => $media->category,
                'file_name' => $media->file_name,
                'mime' => $media->mime,
                'size' => $media->size,
                'created_at' => $media->created_at,
            ];
        }

        // If category is IC, auto-scan first uploaded image and sync OYDS name / id_number.
        if ($category === 'ic') {
            $firstImage = collect($files)->first(function ($file) {
                $mime = strtolower((string) $file->getClientMimeType());
                return str_starts_with($mime, 'image/');
            });

            if ($firstImage) {
                $ocrText = $this->runTesseractOcr($firstImage->getRealPath());
                if ($ocrText) {
                    $unsupported = $this->detectUnsupportedDocumentType($ocrText);
                    if ($unsupported === 'lesen_memandu') {
                        $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR ditolak: imej dikesan sebagai lesen memandu.';
                    } else {
                        $parsed = $this->parseMyKadText($ocrText);
                        if (($parsed['name'] ?? '') !== '' || ($parsed['id_number'] ?? '') !== '') {
                            $oyd->update([
                                'name' => $parsed['name'] ?: ($oyd->name ?: null),
                                'id_number' => $parsed['id_number'] ?: ($oyd->id_number ?: null),
                            ]);
                            $scanResult = [
                                'name' => $oyd->fresh()->name,
                                'id_number' => $oyd->fresh()->id_number,
                            ];
                            $scanMessage = 'OCR IC berjaya: nama/no. K/P dikemaskini.';
                        } else {
                            $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR tidak dapat kesan nama/no. K/P.';
                        }
                    }
                } else {
                    $scanMessage = 'Lampiran IC dimuat naik, tetapi OCR gagal dijalankan.';
                }
            }
        }

        return response()->json([
            'message' => 'Lampiran OYDS berjaya dimuat naik.',
            'uploaded' => $uploaded,
            'media' => $oyd->fresh()->media()->orderByDesc('id')->get([
                'id', 'complaint_oyd_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'oyd' => $oyd->fresh(['media:id,complaint_oyd_id,category,file_name,mime,size,created_at']),
            'scan_message' => $scanMessage,
            'scan_result' => $scanResult,
        ]);
    }

    public function createOyd(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'investigator_name' => 'nullable|string|max:255',
            'file_no' => 'nullable|string|max:255',
        ]);

        $oyd = ComplaintOyd::create([
            'complaint_id' => $complaint->id,
            'name' => $data['name'] ?? null,
            'id_number' => $data['id_number'] ?? null,
            'investigator_name' => $data['investigator_name'] ?? null,
            'file_no' => $data['file_no'] ?? null,
        ]);

        return response()->json([
            'message' => 'OYDS dicipta.',
            'data' => $oyd->fresh(['media:id,complaint_oyd_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function updateOyd(Request $request, Complaint $complaint, ComplaintOyd $oyd)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'OYDS tidak sah untuk aduan ini.'], 422);
        }

        $data = $request->validate([
            'name' => 'nullable|string|max:255',
            'id_number' => 'nullable|string|max:255',
            'investigator_name' => 'nullable|string|max:255',
            'file_no' => 'nullable|string|max:255',
        ]);

        $oyd->update([
            'name' => array_key_exists('name', $data) ? $data['name'] : $oyd->name,
            'id_number' => array_key_exists('id_number', $data) ? $data['id_number'] : $oyd->id_number,
            'investigator_name' => array_key_exists('investigator_name', $data) ? $data['investigator_name'] : $oyd->investigator_name,
            'file_no' => array_key_exists('file_no', $data) ? $data['file_no'] : $oyd->file_no,
        ]);

        return response()->json([
            'message' => 'OYDS dikemaskini.',
            'data' => $oyd->fresh(['media:id,complaint_oyd_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function createSeizureItem(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'item_no' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'storage' => 'nullable|string|max:255',
        ]);

        $item = ComplaintSeizureItem::create([
            'complaint_id' => $complaint->id,
            'item_no' => $data['item_no'] ?? null,
            'description' => $data['description'] ?? null,
            'storage' => $data['storage'] ?? null,
        ]);

        return response()->json([
            'message' => 'Barang kes dicipta.',
            'data' => $item->fresh(['media:id,complaint_seizure_item_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function createPoliceReport(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $data = $request->validate([
            'report_no' => 'nullable|string|max:255',
            'description' => 'nullable|string|max:1000',
            'station' => 'nullable|string|max:255',
        ]);

        $report = ComplaintPoliceReport::create([
            'complaint_id' => $complaint->id,
            'report_no' => $data['report_no'] ?? null,
            'description' => $data['description'] ?? null,
            'station' => $data['station'] ?? null,
        ]);

        return response()->json([
            'message' => 'Report polis dicipta.',
            'data' => $report->fresh(['media:id,complaint_police_report_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function uploadPoliceReportMedia(Request $request, Complaint $complaint, ComplaintPoliceReport $report)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $report->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Report polis tidak sah untuk aduan ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $category = $request->input('category', 'lain_lain');
        $disk = 'local';
        $folder = "complaints/police-reports/{$complaint->id}/{$report->id}";
        $files = $request->file('files', []);
        foreach ($files as $file) {
            $storedName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($folder, $storedName, $disk);

            ComplaintPoliceReportMedia::create([
                'complaint_police_report_id' => $report->id,
                'category' => $category,
                'file_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'path' => $path,
                'disk' => $disk,
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Lampiran Report Polis berjaya dimuat naik.',
            'media' => $report->fresh()->media()->orderByDesc('id')->get([
                'id', 'complaint_police_report_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'report' => $report->fresh(['media:id,complaint_police_report_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function deletePoliceReportMedia(Request $request, Complaint $complaint, ComplaintPoliceReportMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = ComplaintPoliceReport::find($media->complaint_police_report_id);
        if (! $report || (int) $report->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }

        if ($media->path) {
            Storage::disk($media->disk ?: 'local')->delete($media->path);
        }
        $media->delete();

        return response()->json(['message' => 'Lampiran Report Polis dipadam.']);
    }

    public function downloadPoliceReportMedia(Request $request, Complaint $complaint, ComplaintPoliceReportMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $report = ComplaintPoliceReport::find($media->complaint_police_report_id);
        if (! $report || (int) $report->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }
        if (! $media->path) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        $disk = $media->disk ?: 'local';
        if (! Storage::disk($disk)->exists($media->path)) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        return Storage::disk($disk)->download($media->path, $media->file_name);
    }

    public function uploadSeizureItemMedia(Request $request, Complaint $complaint, ComplaintSeizureItem $item)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $item->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Barang kes tidak sah untuk aduan ini.'], 422);
        }

        $request->validate([
            'category' => 'nullable|in:ic,bukti,lain_lain',
            'files' => 'required|array|min:1',
            'files.*' => 'file|max:51200|mimes:jpg,jpeg,png,webp,pdf',
        ]);

        $category = $request->input('category', 'lain_lain');
        $disk = 'local';
        $folder = "complaints/seizure-items/{$complaint->id}/{$item->id}";
        $files = $request->file('files', []);
        foreach ($files as $file) {
            $storedName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($folder, $storedName, $disk);

            ComplaintSeizureItemMedia::create([
                'complaint_seizure_item_id' => $item->id,
                'category' => $category,
                'file_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'path' => $path,
                'disk' => $disk,
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => $user->id,
            ]);
        }

        return response()->json([
            'message' => 'Lampiran Barang Kes berjaya dimuat naik.',
            'media' => $item->fresh()->media()->orderByDesc('id')->get([
                'id', 'complaint_seizure_item_id', 'category', 'file_name', 'mime', 'size', 'created_at',
            ]),
            'item' => $item->fresh(['media:id,complaint_seizure_item_id,category,file_name,mime,size,created_at']),
        ]);
    }

    public function deleteSeizureItemMedia(Request $request, Complaint $complaint, ComplaintSeizureItemMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = ComplaintSeizureItem::find($media->complaint_seizure_item_id);
        if (! $item || (int) $item->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }

        if ($media->path) {
            Storage::disk($media->disk ?: 'local')->delete($media->path);
        }
        $media->delete();

        return response()->json(['message' => 'Lampiran Barang Kes dipadam.']);
    }

    public function downloadSeizureItemMedia(Request $request, Complaint $complaint, ComplaintSeizureItemMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $item = ComplaintSeizureItem::find($media->complaint_seizure_item_id);
        if (! $item || (int) $item->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }
        if (! $media->path) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        $disk = $media->disk ?: 'local';
        if (! Storage::disk($disk)->exists($media->path)) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        return Storage::disk($disk)->download($media->path, $media->file_name);
    }

    public function deleteOydMedia(Request $request, Complaint $complaint, ComplaintOydMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $oyd = ComplaintOyd::find($media->complaint_oyd_id);
        if (! $oyd || (int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }

        if ($media->path) {
            Storage::disk($media->disk ?: 'local')->delete($media->path);
        }
        $media->delete();

        return response()->json(['message' => 'Lampiran OYDS dipadam.']);
    }

    public function deleteOyd(Request $request, Complaint $complaint, ComplaintOyd $oyd)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'OYDS tidak sah untuk aduan ini.'], 422);
        }

        $mediaItems = $oyd->media()->get();
        foreach ($mediaItems as $media) {
            if ($media->path) {
                Storage::disk($media->disk ?: 'local')->delete($media->path);
            }
            $media->delete();
        }

        $oyd->delete();

        return response()->json(['message' => 'OYDS dipadam.']);
    }

    public function downloadOydMedia(Request $request, Complaint $complaint, ComplaintOydMedia $media)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $oyd = ComplaintOyd::find($media->complaint_oyd_id);
        if (! $oyd || (int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 422);
        }
        if (! $media->path) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        $disk = $media->disk ?: 'local';
        if (! Storage::disk($disk)->exists($media->path)) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        return Storage::disk($disk)->download($media->path, $media->file_name);
    }

    public function scanOydIc(Request $request, Complaint $complaint, ComplaintOyd $oyd)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $oyd->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'OYDS tidak sah untuk aduan ini.'], 422);
        }

        $request->validate([
            'ic_image' => 'required|file|max:10240|mimes:jpg,jpeg,png,webp',
        ]);

        $icImage = $request->file('ic_image');
        $ocrText = $this->runTesseractOcr($icImage->getRealPath());
        if (! $ocrText) {
            return response()->json([
                'message' => 'OCR gagal dijalankan. Pastikan Tesseract dipasang pada server (env TESSERACT_BIN).',
            ], 422);
        }
        $unsupported = $this->detectUnsupportedDocumentType($ocrText);
        if ($unsupported === 'lesen_memandu') {
            return response()->json([
                'message' => 'Imej yang dimuat naik bukan Kad Pengenalan (MyKad). Sila muat naik gambar MyKad.',
            ], 422);
        }

        $parsed = $this->parseMyKadText($ocrText);
        if (($parsed['name'] ?? '') !== '' || ($parsed['id_number'] ?? '') !== '') {
            $oyd->update([
                'name' => $parsed['name'] ?: ($oyd->name ?: null),
                'id_number' => $parsed['id_number'] ?: ($oyd->id_number ?: null),
            ]);
        }

        return response()->json([
            'message' => (($parsed['name'] ?? '') !== '' || ($parsed['id_number'] ?? '') !== '')
                ? 'Scan IC selesai.'
                : 'Scan IC selesai, tetapi nama/no. K/P tidak dapat dikesan.',
            'data' => [
                'name' => $oyd->fresh()->name,
                'id_number' => $oyd->fresh()->id_number,
                'raw_text' => mb_substr($ocrText, 0, 1200),
            ],
        ]);
    }

    public function scanIcTemp(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'ic_image' => 'required|file|max:10240|mimes:jpg,jpeg,png,webp',
        ]);

        $icImage = $request->file('ic_image');
        $ocrText = $this->runTesseractOcr($icImage->getRealPath());
        if (! $ocrText) {
            return response()->json([
                'message' => 'OCR gagal dijalankan. Pastikan Tesseract dipasang pada server (env TESSERACT_BIN).',
            ], 422);
        }
        $unsupported = $this->detectUnsupportedDocumentType($ocrText);
        if ($unsupported === 'lesen_memandu') {
            return response()->json([
                'message' => 'Imej yang dimuat naik bukan Kad Pengenalan (MyKad). Sila muat naik gambar MyKad.',
            ], 422);
        }

        $parsed = $this->parseMyKadText($ocrText);
        return response()->json([
            'message' => (($parsed['name'] ?? '') !== '' || ($parsed['id_number'] ?? '') !== '')
                ? 'Scan IC selesai.'
                : 'Scan IC selesai, tetapi nama/no. K/P tidak dapat dikesan.',
            'data' => [
                'name' => $parsed['name'] ?? null,
                'id_number' => $parsed['id_number'] ?? null,
                'raw_text' => mb_substr($ocrText, 0, 1200),
            ],
        ]);
    }

    public function updateAkPayload(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'payload' => 'required|array',
        ]);

        $investigatorStaffId = $request->payload['investigator_staff_id'] ?? null;
        $investigatorName = $request->payload['investigator_name'] ?? null;
        if ($investigatorStaffId) {
            $staff = Staff::find($investigatorStaffId);
            if ($staff) {
                $investigatorName = $staff->staff_id
                    ? ($staff->name . ' (' . $staff->staff_id . ')')
                    : $staff->name;
            }
        }

        $payload = [
            'ak_offense_id' => $request->payload['offense_id'] ?? null,
            'ak_offense_type' => $request->payload['offense_type_id'] ?? null,
            'ak_email_cc' => $request->payload['email_cc'] ?? [],
            'ak_investigation_datetime' => $request->payload['investigation_datetime'] ?? null,
            'ak_investigator_staff_id' => $investigatorStaffId ?: null,
            'ak_investigator_name' => $investigatorName,
            'ak_file_received_date' => $request->payload['file_received_date'] ?? null,
            'ak_ip_status' => $request->payload['ip_status'] ?? null,
            'ak_ip_due_date' => $request->payload['ip_due_date'] ?? null,
            'ak_prosecution_date' => $request->payload['prosecution_date'] ?? null,
            'ak_prosecution_status' => $request->payload['prosecution_status'] ?? null,
            'ak_prosecutor_staff_id' => $request->payload['prosecutor_staff_id'] ?? null,
            'ak_hearing_date' => $request->payload['hearing_date'] ?? null,
            'ak_mahkamah_id' => $request->payload['mahkamah_id'] ?? null,
            'ak_court_decision' => $request->payload['court_decision'] ?? null,
            'ak_prosecution_notes' => $request->payload['prosecution_notes'] ?? null,
            'ak_charge_recommendations' => collect($request->payload['charge_recommendations'] ?? [])
                ->map(function ($row) {
                    return [
                        'portfolio' => trim((string) ($row['portfolio'] ?? '')),
                        'name' => trim((string) ($row['name'] ?? '')),
                        'offense_id' => ($row['offense_id'] ?? null) ? (int) $row['offense_id'] : null,
                    ];
                })
                ->filter(function ($row) {
                    return $row['portfolio'] !== '' || $row['name'] !== '' || ! empty($row['offense_id']);
                })
                ->values()
                ->all(),
            'ak_prosecution_charges' => collect($request->payload['prosecution_charges'] ?? [])
                ->map(function ($row) {
                    return [
                        'accused_name' => trim((string) ($row['accused_name'] ?? '')),
                        'id_number' => trim((string) ($row['id_number'] ?? '')),
                        'offense_id' => ($row['offense_id'] ?? null) ? (int) $row['offense_id'] : null,
                        'case_no' => trim((string) ($row['case_no'] ?? '')),
                    ];
                })
                ->filter(function ($row) {
                    return $row['accused_name'] !== ''
                        || $row['id_number'] !== ''
                        || ! empty($row['offense_id'])
                        || $row['case_no'] !== '';
                })
                ->values()
                ->all(),
            'ak_notes' => $request->payload['notes'] ?? null,
            'ak_supervisor_staff_id' => $request->payload['supervisor_staff_id'] ?? null,
        ];
        if (! $complaint->approver_staff_id && $user->staff?->id) {
            $payload['approver_staff_id'] = $user->staff->id;
        }
        $payload['received_by_user_id'] = $user->id;
        $payload['received_at'] = now();
        if (in_array((string) $complaint->current_stage, ['baru', 'tunggu_pengesahan'], true)) {
            $payload = array_merge($payload, $this->stagePayload('disahkan'));
            if ($user->staff?->id) {
                $payload['approver_staff_id'] = $user->staff->id;
            }
            $payload['approver_confirmed_at'] = now();
        }

        $appointmentMessage = null;
        $complaint->update($payload);
        $this->assignPpaToDistrict($complaint, $user->id);
        if (($payload['current_stage'] ?? null) === 'disahkan') {
            $this->mobilePushNotificationService->sendApprovedComplaintToDistrictNotification($complaint);
        }

        if (! empty($payload['ak_investigation_datetime'])) {
            $startAt = Carbon::parse($payload['ak_investigation_datetime']);
            $endAt = (clone $startAt)->addHour();

            Appointment::updateOrCreate(
                ['complaint_id' => $complaint->id],
                [
                    'title' => $complaint->reference_no,
                    'start_at' => $startAt,
                    'end_at' => $endAt,
                    'status' => 'booked',
                    'created_by_user_id' => $user->id,
                ]
            );
            $appointmentMessage = 'Temujanji siasatan telah ditempah.';
        }

        return response()->json([
            'message' => 'AK payload updated',
            'appointment_message' => $appointmentMessage,
            'ak_payload' => $request->payload,
            'data' => $complaint->load(['receivedBy:id,name', 'approverStaff:id,name,staff_id', 'appointment:id,complaint_id,start_at,end_at,status']),
        ]);
    }

    public function destroy(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasRole('pegawai_hq')) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($complaint->current_stage !== 'baru') {
            return response()->json(['message' => 'Hanya aduan status baru boleh dipadam.'], 422);
        }

        DB::transaction(function () use ($complaint) {
            DB::table('complaint_approvals')->where('complaint_id', $complaint->id)->delete();
            DB::table('complaint_assignments')->where('complaint_id', $complaint->id)->delete();
            Appointment::where('complaint_id', $complaint->id)->delete();
            ComplaintOyd::where('complaint_id', $complaint->id)->delete();
            ComplaintSeizureItem::where('complaint_id', $complaint->id)->delete();
            $complaint->delete();
        });

        return response()->json([
            'message' => 'Aduan dipadam.',
        ]);
    }
    public function lookup(Request $request)
    {
        $request->validate([
            'search_by' => 'nullable|string|in:reference_no,informant_ic',
            'value' => 'nullable|string',
        ]);

        $searchBy = strtolower(trim((string) $request->input('search_by', 'reference_no')));
        $value = trim((string) $request->input('value', $request->input('reference_no', '')));

        if ($value === '') {
            return response()->json([
                'message' => 'Sila masukkan maklumat carian.',
            ], 422);
        }

        if ($searchBy === 'informant_ic') {
            $normalizedValue = preg_replace('/\D+/', '', $value);
            $complaints = Complaint::query()
                ->where(function ($query) use ($normalizedValue) {
                    $query->whereRaw("REPLACE(REPLACE(REPLACE(COALESCE(identification_number, ''), '-', ''), ' ', ''), '.', '') = ?", [$normalizedValue])
                        ->orWhereRaw("REPLACE(REPLACE(REPLACE(COALESCE(informant_identification_number, ''), '-', ''), ' ', ''), '.', '') = ?", [$normalizedValue]);
                })
                ->orderByDesc('id')
                ->get();
        } else {
            $complaint = Complaint::where('reference_no', $value)->first();
        }

        if ($searchBy === 'informant_ic') {
            if ($complaints->isEmpty()) {
                return response()->json([
                    'message' => 'No aduan tidak ditemui.',
                ], 404);
            }
        } elseif (! $complaint) {
            return response()->json([
                'message' => 'No aduan tidak ditemui.',
            ], 404);
        }

        if ($searchBy === 'informant_ic') {
            $payload = $complaints->map(function (Complaint $complaint) {
                return [
                    'reference_no' => $this->normalizeComplaintReferenceNo($complaint->reference_no),
                    'search_by' => 'informant_ic',
                    'case_type' => $complaint->case_type,
                    'complaint_date' => $complaint->complaint_date,
                    'complaint_time' => $complaint->complaint_time,
                    'district_name' => $complaint->district_name,
                    'current_stage' => $complaint->current_stage,
                    'received_at' => $complaint->received_at,
                    'created_at' => $complaint->created_at,
                    'updated_at' => $complaint->updated_at,
                    'summary' => $complaint->summary,
                ];
            })->values();

            return response()->json([
                'message' => 'Complaint found',
                'data' => $payload,
                'count' => $payload->count(),
            ]);
        }

        return response()->json([
            'message' => 'Complaint found',
            'data' => [
                'reference_no' => $this->normalizeComplaintReferenceNo($complaint->reference_no),
                'search_by' => $searchBy,
                'case_type' => $complaint->case_type,
                'complaint_date' => $complaint->complaint_date,
                'complaint_time' => $complaint->complaint_time,
                'district_name' => $complaint->district_name,
                'current_stage' => $complaint->current_stage,
                'received_at' => $complaint->received_at,
                'created_at' => $complaint->created_at,
                'updated_at' => $complaint->updated_at,
                'summary' => $complaint->summary,
            ],
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'complainant_name' => 'required|string|max:255',
            'identification_number' => 'required|string|max:255',
            'contact_number' => 'required|string|max:255',
            'informant_name' => 'nullable|string|max:255',
            'informant_identification_number' => 'nullable|string|max:255',
            'informant_contact_number' => 'nullable|string|max:255',
            'complainant_occupation' => 'nullable|string|max:255',
            'address' => 'required|string|max:1000',
            'district_id' => 'required|exists:districts,id',
            'case_type' => 'nullable|in:AJ,AK',
            'summary' => 'nullable|string|max:10000',
            'borang5_statement' => 'nullable|string|max:20000',
            'channel' => 'nullable|string|max:50',
            'offense_id' => 'nullable|exists:ref_offenses,id',
            'incident_date' => 'nullable|date',
            'incident_time' => 'nullable|date_format:H:i',
            'ak_subtype' => 'nullable|string|in:nikah,cerai,rujuk,poligami',
            'ak_partner_name' => 'nullable|string|max:255',
            'ak_cerai_count' => 'nullable|integer|min:1|max:99',
            'ak_cerai_talaq_count' => 'nullable|integer|min:1|max:99',
            'ak_poligami_marriage_count' => 'nullable|integer|min:1|max:99',
            'ak_poligami_wife_count' => 'nullable|integer|min:1|max:99',
            'ak_event_date' => 'nullable|date',
            'ak_event_place' => 'nullable|string|max:255',
            'ak_event_time' => 'nullable|date_format:H:i',
            'current_address' => 'nullable|string|max:1000',
            'ak_rujuk_date' => 'nullable|date',
            'consent_accepted' => 'nullable|boolean',
            'consent_text_version' => 'nullable|string|max:50',
            'attachments' => 'nullable|array|max:10',
            'attachments.*' => 'file|max:51200|mimes:pdf,jpg,jpeg,png,doc,docx',
            'attachment_titles' => 'nullable|array|max:10',
            'attachment_titles.*' => 'required_with:attachments|string|max:255',
        ]);

        $channel = (string) ($request->channel ?? 'web');
        $channelNormalized = strtolower(trim($channel));
        $isPhysicalInformantChannel = in_array(str_replace('_', '-', $channelNormalized), ['walkin', 'walk-in', 'kaunter'], true);
        // Public intake channels (no Borang 5 required).
        $isPublicChannel = in_array($channelNormalized, ['portal', 'web'], true);
        // Keep summary as string (can be empty for officer intake).
        // DB column is non-nullable in current schema, so never persist null.
        $summary = (string) ($request->summary ?? '');
        $borang5Statement = (string) ($request->borang5_statement ?? '');
        $offenseId = $request->input('offense_id');

        // Public submissions must include Ringkasan Aduan.
        if ($isPublicChannel && trim($summary) === '') {
            return response()->json([
                'message' => 'Ringkasan Aduan wajib diisi.',
                'errors' => ['summary' => ['Ringkasan Aduan wajib diisi.']],
            ], 422);
        }

        // Officer channels should include Borang 5 statement (but summary can be empty).
        if (! $isPublicChannel && trim($borang5Statement) === '') {
            return response()->json([
                'message' => 'Butiran Aduan (Borang 5) wajib diisi untuk aduan pegawai.',
                'errors' => ['borang5_statement' => ['Butiran Aduan (Borang 5) wajib diisi.']],
            ], 422);
        }

        if ($isPublicChannel && ! $request->boolean('consent_accepted')) {
            return response()->json([
                'message' => 'Sila sahkan persetujuan sebelum menghantar aduan.',
                'errors' => ['consent_accepted' => ['Sila sahkan persetujuan sebelum menghantar aduan.']],
            ], 422);
        }

        $now = now();
        $year = (int) $now->format('Y');
        $district = $request->district_id ? District::find($request->district_id) : null;

        // Store the complaint
        $caseType = strtoupper((string) ($request->case_type ?? 'AJ'));
        $user = $request->user();
        if ($user && $user->hasRole('pegawai_daerah') && $caseType === 'AJ') {
            return response()->json([
                'message' => 'Pegawai Daerah hanya dibenarkan mendaftar Aduan Keluarga (AK).',
            ], 403);
        }
        $referenceNo = $this->complaintReferenceService->generateReferenceNo($caseType, $district?->name, $now);

        $complaint = Complaint::create([
            'reference_no' => $referenceNo,
            'case_type' => $caseType,
            'complaint_year' => $year,
            'complaint_date' => $now->toDateString(),
            'complaint_time' => $now->format('H:i:s'),
            'incident_date' => $request->input('incident_date'),
            'incident_time' => $request->filled('incident_time') ? ($request->input('incident_time') . ':00') : null,
            'complainant_name' => $request->complainant_name,
            'identification_number'    => $request->identification_number,
            'contact_number'    => $request->contact_number,
            'informant_name' => $request->informant_name ?: ($isPhysicalInformantChannel ? $request->complainant_name : null),
            'informant_identification_number' => $request->informant_identification_number ?: ($isPhysicalInformantChannel ? $request->identification_number : null),
            'informant_contact_number' => $request->informant_contact_number ?: ($isPhysicalInformantChannel ? $request->contact_number : null),
            'complainant_occupation' => $request->complainant_occupation,
            'address'    => $request->address,
            'district_id' => $district?->id,
            'district_name' => $district?->name,
            'summary'    => $summary,
            'borang5_statement' => trim($borang5Statement) !== '' ? $borang5Statement : null,
            'aj_offense_id' => ($caseType === 'AJ' && $offenseId) ? (int) $offenseId : null,
            'ak_offense_id' => ($caseType === 'AK' && $offenseId) ? (int) $offenseId : null,
            'ak_subtype' => $caseType === 'AK' ? $request->input('ak_subtype') : null,
            'ak_partner_name' => $caseType === 'AK' ? $request->input('ak_partner_name') : null,
            'ak_cerai_count' => ($caseType === 'AK' && $request->filled('ak_cerai_count')) ? (int) $request->input('ak_cerai_count') : null,
            'ak_cerai_talaq_count' => ($caseType === 'AK' && $request->filled('ak_cerai_talaq_count')) ? (int) $request->input('ak_cerai_talaq_count') : null,
            'ak_poligami_marriage_count' => ($caseType === 'AK' && $request->filled('ak_poligami_marriage_count')) ? (int) $request->input('ak_poligami_marriage_count') : null,
            'ak_poligami_wife_count' => ($caseType === 'AK' && $request->filled('ak_poligami_wife_count')) ? (int) $request->input('ak_poligami_wife_count') : null,
            'ak_event_date' => $caseType === 'AK' ? $request->input('ak_event_date') : null,
            'ak_event_place' => $caseType === 'AK' ? $request->input('ak_event_place') : null,
            'ak_event_time' => ($caseType === 'AK' && $request->filled('ak_event_time')) ? ($request->input('ak_event_time') . ':00') : null,
            'current_address' => $caseType === 'AK' ? $request->input('current_address') : null,
            'ak_rujuk_date' => $caseType === 'AK' ? $request->input('ak_rujuk_date') : null,
            'channel' => $channel,
            'consent_accepted' => $isPublicChannel ? $request->boolean('consent_accepted') : false,
            'consent_accepted_at' => $isPublicChannel ? $now : null,
            'consent_text_version' => $isPublicChannel ? (string) ($request->input('consent_text_version') ?: 'v1') : null,
            'consent_ip_address' => $isPublicChannel ? $request->ip() : null,
            'consent_user_agent' => $isPublicChannel ? $request->userAgent() : null,
            // New complaints start as "baru". AK skips approver flow later, but should still
            // be received through the normal complaint intake flow before becoming "disahkan".
            'current_stage' => 'baru',
            'status_id' => $this->resolveStatusIdForStage('baru'),
            'approver_confirmed_at' => null,
            'submitted_at' => $now,
            'submitted_by_user_id' => Auth::guard('sanctum')->id(),
            'name' => $request->complainant_name,
            // For search/indexing, prefer summary; fallback to borang5 statement for officer intake.
            'contents' => trim($summary) !== '' ? $summary : $borang5Statement,
        ]);

        $attachmentTitles = $request->input('attachment_titles', []);
        foreach ($request->file('attachments', []) as $index => $file) {
            $path = $file->store("complaints/{$complaint->id}/attachments", 'local');
            ComplaintAttachment::create([
                'complaint_id' => $complaint->id,
                'category' => 'document',
                'title' => isset($attachmentTitles[$index]) ? trim((string) $attachmentTitles[$index]) : null,
                'file_name' => $file->getClientOriginalName(),
                'path' => $path,
                'disk' => 'local',
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => Auth::guard('sanctum')->id(),
            ]);
        }

        $this->mobilePushNotificationService->sendNewComplaintToHqNotification($complaint);

        return response()->json([
            'message' => 'Complaint Submitted',
            'reference_no' => $referenceNo,
            'data' => [
                'id' => $complaint->id,
                'reference_no' => $this->normalizeComplaintReferenceNo($complaint->reference_no),
            ],
        ]);
    }

    public function downloadAttachment(Request $request, Complaint $complaint, ComplaintAttachment $attachment)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        if ((int) $attachment->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah.'], 404);
        }

        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $disk = $attachment->disk ?: 'local';
        if (! Storage::disk($disk)->exists($attachment->path)) {
            return response()->json(['message' => 'Lampiran tidak ditemui.'], 404);
        }

        $originalExtension = pathinfo((string) $attachment->file_name, PATHINFO_EXTENSION);
        $downloadNameBase = trim((string) ($attachment->title ?: $attachment->file_name));
        $safeBase = preg_replace('/[\\\\\\/:"*?<>|]+/', '-', $downloadNameBase) ?: 'lampiran';
        $downloadName = $originalExtension !== ''
            ? "{$safeBase}.{$originalExtension}"
            : $safeBase;

        return Storage::disk($disk)->download($attachment->path, $downloadName);
    }

    public function uploadAttachment(Request $request, Complaint $complaint)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'files' => 'required|array|min:1|max:10',
            'files.*' => 'file|max:51200|mimes:pdf,jpg,jpeg,png,doc,docx',
            'category' => 'nullable|string|max:50',
        ]);

        $uploaded = [];
        foreach ($request->file('files', []) as $file) {
            $path = $file->store("complaints/{$complaint->id}/attachments", 'local');
            $attachment = ComplaintAttachment::create([
                'complaint_id' => $complaint->id,
                'category' => trim((string) ($validated['category'] ?? '')) ?: 'document',
                'title' => null,
                'file_name' => $file->getClientOriginalName(),
                'path' => $path,
                'disk' => 'local',
                'mime' => $file->getMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => $user->id,
            ]);

            $uploaded[] = [
                'id' => $attachment->id,
                'complaint_id' => $attachment->complaint_id,
                'category' => $attachment->category,
                'file_name' => $attachment->title ?: $attachment->file_name,
                'mime' => $attachment->mime,
                'size' => $attachment->size,
                'created_at' => optional($attachment->created_at)?->toDateTimeString(),
                'download_url' => route('complaints.attachments.download', [
                    'complaint' => $complaint->id,
                    'attachment' => $attachment->id,
                ]),
            ];
        }

        return response()->json([
            'message' => 'Lampiran berjaya dimuat naik.',
            'data' => $uploaded,
        ]);
    }

    public function deleteAttachment(Request $request, Complaint $complaint, ComplaintAttachment $attachment)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewComplaint($complaint, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if ((int) $attachment->complaint_id !== (int) $complaint->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk aduan ini.'], 404);
        }

        $disk = $attachment->disk ?: 'local';
        if ($attachment->path && Storage::disk($disk)->exists($attachment->path)) {
            Storage::disk($disk)->delete($attachment->path);
        }
        $attachment->delete();

        return response()->json([
            'message' => 'Lampiran dipadam.',
        ]);
    }

    private function findPrimaryCase(Complaint $complaint): ?CaseRecord
    {
        return $complaint->cases()
            ->with([
                'district:id,name',
                'directiveStaff:id,name,staff_id',
                'handoverStaff:id,name,staff_id',
                'arrestStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
                'arrestStaff.office:id,name,code,office_type,district_id,phone,address',
                'oyds.media:id,case_oyd_id,category,file_name,mime,size,created_at',
                'seizureItems.media:id,case_seizure_item_id,category,file_name,mime,size,created_at',
                'policeReports.media:id,case_police_report_id,category,file_name,mime,size,created_at',
            ])
            ->orderByPivot('is_primary', 'desc')
            ->orderBy('cases.id')
            ->first();
    }

    private function resolvePrimaryCaseForComplaint(Complaint $complaint): ?CaseRecord
    {
        $case = $this->findPrimaryCase($complaint);
        if (! $case) {
            return null;
        }

        return $case;
    }

    private function findOrCreatePrimaryCase(Complaint $complaint, array $overrides = []): CaseRecord
    {
        $existing = $this->findPrimaryCase($complaint);
        if ($existing) {
            return $existing;
        }

        $payload = $this->buildCasePayloadFromComplaint($complaint, false, $overrides);
        $case = CaseRecord::create($payload);
        $complaint->cases()->attach($case->id, [
            'is_primary' => true,
            'notes' => 'Linked from complaint detail flow.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (! trim((string) ($complaint->case_register_no ?? '')) && ! empty($payload['case_register_no'])) {
            $complaint->update([
                'case_register_no' => $payload['case_register_no'],
            ]);
        }

        return $case->fresh();
    }

    private function createAdditionalCaseForComplaint(Complaint $complaint, array $overrides = []): CaseRecord
    {
        $payload = $this->buildCasePayloadFromComplaint(
            $complaint,
            true,
            array_merge($this->blankAdditionalCaseFields(), $overrides)
        );
        $case = CaseRecord::create($payload);

        $complaint->cases()->attach($case->id, [
            'is_primary' => true,
            'notes' => 'Additional case created from complaint.',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $this->setPrimaryCase($complaint, $case->id);

        if (! trim((string) ($complaint->case_register_no ?? '')) && ! empty($payload['case_register_no'])) {
            $complaint->update([
                'case_register_no' => $payload['case_register_no'],
            ]);
        }

        return $case->fresh();
    }

    private function blankAdditionalCaseFields(): array
    {
        return [
            'file_no' => null,
            'supervisor_staff_id' => null,
            'directive_staff_id' => null,
            'handover_staff_id' => null,
            'arrest_staff_id' => null,
            'prosecutor_staff_id' => null,
            'report_offense_id' => null,
            'mahkamah_id' => null,
            'ppa_classification' => null,
            'ip_status' => null,
            'current_status' => null,
            'current_status_other' => null,
            'op_category' => null,
            'op_case_status' => null,
            'op_notes' => null,
            'prosecution_status' => null,
            'arrest_status' => null,
            'arrest_by' => null,
            'male_count' => null,
            'female_count' => null,
            'other_count' => null,
            'directive_at' => null,
            'handover_at' => null,
            'action_datetime' => null,
            'statement_datetime' => null,
            'court_date' => null,
            'directive_notes' => null,
            'report_notes' => null,
            'investigation_notes' => null,
            'prosecution_notes' => null,
            'seizure_status' => null,
            'police_report_status' => null,
            'fine' => null,
            'fir_no' => null,
            'charge_recommendations' => null,
        ];
    }

    private function setPrimaryCase(Complaint $complaint, int $caseId): void
    {
        DB::table('case_complaint_links')
            ->where('complaint_id', $complaint->id)
            ->update([
                'is_primary' => false,
                'updated_at' => now(),
            ]);

        DB::table('case_complaint_links')
            ->where('complaint_id', $complaint->id)
            ->where('case_id', $caseId)
            ->update([
                'is_primary' => true,
                'updated_at' => now(),
            ]);
    }

    private function buildCasePayloadFromComplaint(Complaint $complaint, bool $forceNewSequence = false, array $overrides = []): array
    {
        $caseRegisterNo = trim((string) ($overrides['case_register_no'] ?? $complaint->case_register_no ?? ''));
        if ($forceNewSequence || $caseRegisterNo === '') {
            $caseRegisterNo = $this->generateCaseRegisterNo($complaint);
        }

        return array_merge([
            'case_type' => strtoupper(trim((string) ($complaint->case_type ?? 'AJ'))),
            'case_register_no' => $caseRegisterNo,
            'file_no' => $complaint->aj_file_no,
            'complaint_year' => $complaint->complaint_year,
            'district_id' => $complaint->district_id,
            'district_name' => $complaint->district_name,
            'supervisor_staff_id' => $complaint->aj_supervisor_staff_id,
            'directive_staff_id' => $complaint->aj_directive_staff_id,
            'handover_staff_id' => $complaint->aj_handover_staff_id,
            'arrest_staff_id' => $complaint->aj_arrest_staff_id,
            'prosecutor_staff_id' => $complaint->aj_prosecutor_staff_id,
            'report_offense_id' => $complaint->aj_report_offense_id ?: $complaint->aj_offense_id,
            'mahkamah_id' => $complaint->aj_mahkamah_id,
            'ppa_classification' => $complaint->aj_ppa_classification,
            'ip_status' => $complaint->aj_ip_status,
            'current_status' => $complaint->aj_current_status,
            'current_status_other' => $complaint->aj_current_status_other,
            'op_category' => $complaint->aj_op_category,
            'op_case_status' => $complaint->aj_op_case_status,
            'op_notes' => $complaint->aj_op_notes,
            'prosecution_status' => $complaint->aj_prosecution_status,
            'arrest_status' => $complaint->aj_arrest_status,
            'arrest_by' => $complaint->aj_arrest_by,
            'male_count' => $complaint->aj_male_count,
            'female_count' => $complaint->aj_female_count,
            'other_count' => $complaint->aj_other_count,
            'directive_at' => $complaint->aj_directive_at,
            'handover_at' => $complaint->handover_at,
            'action_datetime' => $complaint->aj_action_datetime,
            'statement_datetime' => $complaint->aj_statement_datetime,
            'court_date' => $complaint->aj_court_date,
            'opened_at' => $complaint->aj_directive_at ?: $complaint->aj_action_datetime ?: $complaint->created_at,
            'directive_notes' => $complaint->aj_directive_notes,
            'report_notes' => $complaint->aj_report_notes,
            'investigation_notes' => $complaint->aj_investigation_notes,
            'prosecution_notes' => $complaint->aj_prosecution_notes,
            'seizure_status' => $complaint->aj_seizure_status,
            'police_report_status' => $complaint->aj_police_report_status,
            'fine' => $complaint->aj_fine,
            'fir_no' => $complaint->aj_fir_no,
            'charge_recommendations' => $complaint->aj_charge_recommendations,
        ], $overrides);
    }

    private function reloadComplaintWithCases(Complaint $complaint): Complaint
    {
        $freshComplaint = $complaint->fresh()->load([
            'cases:id,case_type,case_register_no,file_no,complaint_year,district_id,district_name,ppa_classification,current_status,arrest_status,action_datetime,created_at',
        ]);
        $freshComplaint->setAttribute('primary_case', $this->resolvePrimaryCaseForComplaint($freshComplaint));

        return $freshComplaint;
    }

    private function generateCaseRegisterNo(Complaint $complaint): string
    {
        $caseType = strtoupper(trim((string) ($complaint->case_type ?: 'AJ')));
        $baseDate = null;

        try {
            if (! empty($complaint->complaint_date)) {
                $dateString = trim((string) $complaint->complaint_date);
                $timeString = trim((string) ($complaint->complaint_time ?: '00:00:00'));
                $baseDate = Carbon::parse($dateString . ' ' . $timeString);
            }
        } catch (\Throwable) {
            $baseDate = null;
        }

        return $this->caseReferenceService->generateCaseRegisterNo(
            $caseType,
            $complaint->district_name,
            $baseDate
        );
    }

    private function syncPrimaryCaseFromAjReport(CaseRecord $case, Complaint $complaint, array $report, string $effectiveCaseRegisterNo, bool $isNoArrest): void
    {
        $case->update([
            'case_type' => 'AJ',
            'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : $case->case_register_no,
            'file_no' => $report['file_no'] ?? null,
            'complaint_year' => $complaint->complaint_year,
            'district_id' => $complaint->district_id,
            'district_name' => $complaint->district_name,
            'directive_staff_id' => $report['directive_staff_id'] ?? null,
            'handover_staff_id' => $report['handover_staff_id'] ?? null,
            'arrest_staff_id' => $report['arrest_staff_id'] ?? null,
            'report_offense_id' => $report['offense_id'] ?? null,
            'arrest_status' => $report['arrest_status'] ?? null,
            'arrest_by' => $isNoArrest ? null : ($report['arrest_by'] ?? null),
            'male_count' => $isNoArrest ? null : (($report['male_count'] ?? '') !== '' ? $report['male_count'] : null),
            'female_count' => $isNoArrest ? null : (($report['female_count'] ?? '') !== '' ? $report['female_count'] : null),
            'other_count' => $isNoArrest ? null : (($report['other_count'] ?? '') !== '' ? $report['other_count'] : null),
            'directive_at' => $report['directive_at'] ?? null,
            'handover_at' => $report['handover_at'] ?? null,
            'action_datetime' => $report['action_datetime'] ?? null,
            'statement_datetime' => $report['statement_datetime'] ?? null,
            'court_date' => $report['court_date'] ?? null,
            'opened_at' => $case->opened_at ?: ($report['directive_at'] ?? null) ?: ($report['action_datetime'] ?? null) ?: $complaint->created_at,
            'directive_notes' => $report['directive_notes'] ?? null,
            'report_notes' => $report['report_notes'] ?? null,
            'seizure_status' => $report['seizure_status'] ?? null,
            'police_report_status' => $report['police_report_status'] ?? null,
        ]);
    }

    private function syncPrimaryCaseFromAjActionReport(
        CaseRecord $case,
        Complaint $complaint,
        array $report,
        string $effectiveCaseRegisterNo,
        ?string $latestClassification,
        string $currentStatus,
        string $currentStatusOther
    ): void {
        $case->update([
            'case_type' => 'AJ',
            'case_register_no' => $effectiveCaseRegisterNo !== '' ? $effectiveCaseRegisterNo : $case->case_register_no,
            'file_no' => $report['file_no'] ?? null,
            'complaint_year' => $complaint->complaint_year,
            'district_id' => $complaint->district_id,
            'district_name' => $complaint->district_name,
            'directive_staff_id' => $report['directive_staff_id'] ?? null,
            'handover_staff_id' => $report['handover_staff_id'] ?? null,
            'directive_at' => $report['directive_at'] ?? null,
            'handover_at' => $report['handover_at'] ?? null,
            'directive_notes' => $report['directive_notes'] ?? null,
            'ppa_classification' => $latestClassification,
            'current_status' => $currentStatus !== '' ? $currentStatus : null,
            'current_status_other' => $currentStatus === 'Other'
                ? ($currentStatusOther !== '' ? $currentStatusOther : null)
                : null,
            'op_category' => $report['op_category'] ?? null,
            'op_case_status' => $report['op_case_status'] ?? null,
            'op_notes' => $report['op_notes'] ?? null,
            'opened_at' => $case->opened_at ?: ($report['directive_at'] ?? null) ?: $complaint->created_at,
        ]);
    }

    private function buildCaseRegisterNoFromComplaint(Complaint $complaint): string
    {
        $referenceNo = trim((string) ($complaint->reference_no ?? ''));
        $district = trim((string) ($complaint->district_name ?? ''));

        $parts = collect(explode('/', $referenceNo))
            ->map(fn ($part) => trim((string) $part))
            ->filter(fn ($part) => $part !== '')
            ->values();

        $head = (string) ($parts->get(0) ?? '');
        $year = (string) ($parts->get(1) ?? '');
        $month = (string) ($parts->get(2) ?? '');
        $runningNo = (string) ($parts->get(3) ?? '');

        if ($district === '') {
            $district = preg_replace('/^(AJ|AK)\s*-\s*/i', '', $head) ?: '';
            $district = trim((string) $district);
        }

        if ($year === '') {
            $year = trim((string) ($complaint->complaint_year ?? ''));
        }
        if ($month === '') {
            $month = trim((string) (substr((string) ($complaint->complaint_date ?? ''), 5, 2)));
        }
        if ($runningNo === '' && $referenceNo !== '') {
            if (preg_match('/(\d{4})$/', $referenceNo, $matches)) {
                $runningNo = $matches[1];
            }
        }

        $district = $district !== '' ? $district : '-';
        $year = $year !== '' ? $year : '-';
        $month = $month !== '' ? $month : '-';
        $runningNo = $runningNo !== '' ? $runningNo : '-';

        return "KES-{$district}/{$year}/{$month}/{$runningNo}";
    }

    private function buildBorang5Narrative(string $rawText, string $incidentAddress): string
    {
        $text = trim($rawText);
        $address = trim($incidentAddress);

        if ($text === '') {
            return '-';
        }

        if ($address === '') {
            return $text;
        }

        $hasLokasiPrefix = preg_match('/^\s*(LOKASI|LOKASI KEJADIAN|ALAMAT KEJADIAN|ALAMAT LOKASI KEJADIAN)\s*:/i', $text) === 1;
        if ($hasLokasiPrefix) {
            return $text;
        }

        return "LOKASI : {$address}\n{$text}";
    }

    private function resolveBorang5IncidentAddress(Complaint $complaint): string
    {
        $caseType = strtoupper(trim((string) ($complaint->case_type ?: 'AJ')));
        if ($caseType === 'AK') {
            return trim((string) ($complaint->current_address ?: ''));
        }

        return trim((string) ($complaint->address ?: ''));
    }

    private function autoSendBorang5EmailAfterMandatorySave(Complaint $complaint): ?array
    {
        if (strtoupper((string) ($complaint->case_type ?: 'AJ')) !== 'AJ') {
            return null;
        }

        if (! empty($complaint->borang5_auto_emailed_at)) {
            return [
                'sent' => false,
                'reason' => 'already_sent',
            ];
        }

        $classification = strtoupper(trim((string) ($complaint->aj_ppa_classification ?? '')));
        $classification = $this->normalizePpaClassification($classification);
        $hasMandatory = in_array($classification, ['FNA', 'KIV', 'NFA', 'OP'], true)
            && ! empty($complaint->aj_offense_id)
            && trim((string) ($complaint->borang5_statement ?? '')) !== '';
        if (! $hasMandatory) {
            return null;
        }

        $recipients = $this->resolveAutoEmailRecipients('BORANG5_AUTO_EMAIL_TO', 'BORANG5_AUTO_EMAIL_CC');
        if (empty($recipients['to']) && empty($recipients['cc'])) {
            return null;
        }

        if (empty($recipients['to'])) {
            return [
                'sent' => false,
                'reason' => 'invalid_recipient_config',
            ];
        }

        $complaint->loadMissing([
            'submittedBy:id,name,email',
            'submittedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'submittedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'receivedBy:id,name,email',
            'receivedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'receivedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'approverStaff:id,name,staff_id',
        ]);

        $channel = strtolower(trim((string) ($complaint->channel ?? '')));
        $isPhysicalInformant = in_array($channel, ['walkin', 'walk-in', 'kaunter'], true);

        $receiverStaff = $complaint->receivedBy?->staff ?: $complaint->submittedBy?->staff;
        $issuerName = $complaint->submittedBy?->staff?->name
            ?: $complaint->submittedBy?->name
            ?: $complaint->receivedBy?->name
            ?: '-';

        $officerInformantName = $receiverStaff?->name ?: $complaint->receivedBy?->name ?: $issuerName;
        $officerInformantIdNumber = $receiverStaff?->staff_id ?: $receiverStaff?->ic_number ?: '-';
        $officerInformantOccupation = $receiverStaff?->position ?: 'Pegawai Penguatkuasa Agama';
        $officerInformantContactNumber = $this->resolveBorang5OfficePhone($complaint, $receiverStaff);
        $officerInformantAddress = $this->resolveBorang5OfficeAddress($complaint, $receiverStaff);

        $effectiveInformantName = $isPhysicalInformant
            ? ($complaint->complainant_name ?: '-')
            : $officerInformantName;
        $effectiveInformantIdNumber = $isPhysicalInformant
            ? ($complaint->identification_number ?: '-')
            : $officerInformantIdNumber;
        $effectiveInformantOccupation = $isPhysicalInformant
            ? ($complaint->complainant_occupation ?: '-')
            : $officerInformantOccupation;
        $effectiveInformantContactNumber = $isPhysicalInformant
            ? ($complaint->contact_number ?: '-')
            : $officerInformantContactNumber;
        $effectiveInformantAddress = $isPhysicalInformant
            ? (
                strtoupper(trim((string) ($complaint->case_type ?: 'AJ'))) === 'AJ'
                    ? ($complaint->current_address ?: $complaint->address ?: '-')
                    : ($complaint->address ?: '-')
            )
            : $officerInformantAddress;

        $approverSignerName = trim((string) ($complaint->approverStaff?->name ?: ''));
        $effectiveOfficerSignerName = strtoupper((string) (
            $complaint->case_type === 'AK'
                ? ''
                : $approverSignerName
        ));
        $officerSignerPendingNote = (strtoupper((string) ($complaint->case_type ?: 'AJ')) === 'AJ' && $approverSignerName === '')
            ? '(Aduan belum disahkan oleh Pegawai Pengesah)'
            : '';

        $formatDateDmy = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('d-m-Y');
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $formatTime12hDot = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('g.i A');
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $reportDate = $formatDateDmy($complaint->complaint_date);
        $reportTime = $formatTime12hDot($complaint->complaint_time);
        $mainStatus = strtoupper(trim((string) ($complaint->aj_ppa_classification ?? '')));
        $reportText = $this->buildBorang5Narrative(
            (string) ($complaint->borang5_statement ?: $complaint->summary ?: ''),
            $this->resolveBorang5IncidentAddress($complaint)
        );
        $subjectReference = preg_replace('/\s*\/\s*/', '/', (string) ($complaint->reference_no ?: ('Aduan #' . $complaint->id)));
        $subject = 'ADUAN JENAYAH ' . ($classification ?: '-') . ' : ' . $subjectReference;
        $bodyPlainText = "Assalamualaikum\n\n"
            . "Aduan berstatus " . ($mainStatus !== '' ? $mainStatus : '-') . " untuk tindakan daerah "
            . (string) ($complaint->district_name ?: '-') . ".\n"
            . "Sila pastikan aduan diambil tindakan mengikut tempoh yang ditetapkan.\n\n"
            . "Muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail Aduan.\n\n"
            . "Terima kasih.";
        $statusText = $mainStatus !== '' ? $mainStatus : '-';
        $districtText = (string) ($complaint->district_name ?: '-');
        $highlightLine = "Aduan berstatus {$statusText} untuk tindakan daerah {$districtText}.";
        $escapedBody = nl2br(e($bodyPlainText));
        $escapedBody = str_replace(
            e($highlightLine),
            'Aduan berstatus <strong>' . e($statusText) . '</strong> untuk tindakan daerah <strong>' . e($districtText) . '</strong>.',
            $escapedBody
        );
        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . $escapedBody
            . '</div>';
        $pdfBinary = Pdf::loadView('pdf.complaints.borang5', [
            'referenceNo' => $subjectReference,
            'caseType' => strtoupper((string) ($complaint->case_type ?: 'AJ')),
            'reportDate' => $reportDate,
            'reportTime' => $reportTime,
            'informantName' => (string) $effectiveInformantName,
            'informantIdNumber' => (string) $effectiveInformantIdNumber,
            'informantOccupation' => (string) $effectiveInformantOccupation,
            'informantContactNumber' => (string) $effectiveInformantContactNumber,
            'informantAddress' => (string) $effectiveInformantAddress,
            'reportText' => (string) $reportText,
            'officerSignerName' => (string) $effectiveOfficerSignerName,
            'officerSignerPendingNote' => (string) $officerSignerPendingNote,
            'mainStatus' => (string) $mainStatus,
        ])
            ->setPaper('a4', 'portrait')
            ->output();
        $pdfFileName = 'BORANG 5 - FIR.pdf';

        try {
            Mail::send([], [], function ($message) use ($recipients, $subject, $html, $pdfBinary, $pdfFileName): void {
                $message->to($recipients['to'])
                    ->subject($subject)
                    ->html($html)
                    ->attachData($pdfBinary, $pdfFileName, ['mime' => 'application/pdf']);
                if (! empty($recipients['cc'])) {
                    $message->cc($recipients['cc']);
                }
            });

            $complaint->forceFill([
                'borang5_auto_emailed_at' => now(),
            ])->save();

            return [
                'sent' => true,
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
                'subject' => $subject,
            ];
        } catch (\Throwable $e) {
            Log::warning('Auto Borang 5 email failed', [
                'complaint_id' => $complaint->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'reason' => 'send_failed',
            ];
        }
    }

    private function autoSendLaporanTindakanEmailAfterSave(Complaint $complaint): ?array
    {
        if (strtoupper((string) ($complaint->case_type ?: 'AJ')) !== 'AJ') {
            return null;
        }

        if (! empty($complaint->laporan_tindakan_auto_emailed_at)) {
            return [
                'sent' => false,
                'reason' => 'already_sent',
            ];
        }

        if (trim((string) ($complaint->aj_report_notes ?? '')) === '') {
            return null;
        }

        $recipients = $this->resolveAutoEmailRecipients('LAPORAN_TINDAKAN_AUTO_EMAIL_TO', 'LAPORAN_TINDAKAN_AUTO_EMAIL_CC');
        if (empty($recipients['to']) && empty($recipients['cc'])) {
            return null;
        }

        if (empty($recipients['to'])) {
            return [
                'sent' => false,
                'reason' => 'invalid_recipient_config',
            ];
        }

        $complaint->loadMissing([
            'submittedBy:id,name',
            'submittedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'submittedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'receivedBy:id,name',
            'receivedBy.staff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'receivedBy.staff.office:id,name,code,office_type,district_id,phone,address',
            'ajDirectiveStaff:id,name',
            'ajHandoverStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'ajHandoverStaff.office:id,name,code,office_type,district_id,phone,address',
            'picUser:id,name',
            'actionUpdates:id,complaint_id,sort_order,classification,action_date,action_time,note',
        ]);

        $formatDateDmyDash = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('d-m-Y');
            } catch (\Throwable) {
                return (string) $value;
            }
        };
        $formatTime12hDot = static function ($value): string {
            if (! $value) return '-';
            try {
                $dt = Carbon::parse($value);
                return $dt->format('g.i A');
            } catch (\Throwable) {
                return (string) $value;
            }
        };
        $tarikhMasa = $complaint->aj_directive_at
            ?: $complaint->handover_at
            ?: $complaint->aj_statement_datetime
            ?: $complaint->aj_action_datetime
            ?: trim((string) (($complaint->complaint_date ?: '') . ' ' . ($complaint->complaint_time ?: '')));
        $reportDate = $formatDateDmyDash($tarikhMasa);
        $reportTime = $formatTime12hDot($tarikhMasa);

        $handoverStaff = $complaint->ajHandoverStaff;
        $fallbackStaff = $complaint->receivedBy?->staff ?: $complaint->submittedBy?->staff;
        $officerName = $handoverStaff?->name ?: $complaint->picUser?->name ?: $fallbackStaff?->name ?: '-';
        $officerIdNo = $handoverStaff?->staff_id ?: $handoverStaff?->ic_number ?: $fallbackStaff?->staff_id ?: $fallbackStaff?->ic_number ?: '-';
        $officerJob = $handoverStaff?->position ?: $fallbackStaff?->position ?: '-';
        $officerPhone = $this->resolveStaffOfficePhone($handoverStaff ?: $fallbackStaff);
        $officerAddress = $this->resolveStaffOfficeAddress($handoverStaff ?: $fallbackStaff);
        $reportParagraph = strtoupper(trim((string) ($complaint->aj_report_notes ?? '')));
        $noDaftar = trim((string) ($complaint->case_register_no ?? '')) !== ''
            ? trim((string) $complaint->case_register_no)
            : $this->buildCaseRegisterNoFromComplaint($complaint);

        $arrestStatusLabel = (($complaint->arrest_status === 'ada' || $complaint->aj_arrest_status === 'ada'))
            ? 'Ada Tangkapan'
            : 'Tiada Tangkapan';
        $subjectReference = preg_replace('/\s*\/\s*/', '/', (string) ($complaint->reference_no ?: ('Aduan #' . $complaint->id)));
        $subject = 'TINDAKAN (' . $arrestStatusLabel . ') : KES - ' . $subjectReference;
        $bodyPlainText = "Assalamualaikum\n\n"
            . "Laporan Tindakan bagi daerah " . ($complaint->district_name ?: '-') . " telah diperolehi.\n\n"
            . "Sila muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail KES.\n\n"
            . "Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan\n\n"
            . "Terima kasih.";
        $highlightLine = 'Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan';
        $escapedBody = nl2br(e($bodyPlainText));
        $escapedBody = str_replace(
            e($highlightLine),
            '<strong>' . e($highlightLine) . '</strong>',
            $escapedBody
        );
        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . $escapedBody
            . '</div>';

        $pdfBinary = Pdf::loadView('pdf.complaints.laporan-tindakan', [
            'noDaftar' => (string) ($noDaftar ?: '-'),
            'reportDate' => (string) ($reportDate ?: '-'),
            'reportTime' => (string) ($reportTime ?: '-'),
            'officerName' => (string) ($officerName ?: '-'),
            'officerIdNo' => (string) ($officerIdNo ?: '-'),
            'officerJob' => (string) ($officerJob ?: '-'),
            'officerPhone' => (string) ($officerPhone ?: '-'),
            'officerAddress' => (string) ($officerAddress ?: '-'),
            'reportParagraph' => (string) ($reportParagraph !== '' ? $reportParagraph : 'LAPORAN MASIH BELUM DIISI'),
        ])->setPaper('a4', 'portrait')->output();

        $pdfFileName = 'BORANG 5 - KES.pdf';

        try {
            Mail::send([], [], function ($message) use ($recipients, $subject, $html, $pdfBinary, $pdfFileName): void {
                $message->to($recipients['to'])
                    ->subject($subject)
                    ->html($html)
                    ->attachData($pdfBinary, $pdfFileName, ['mime' => 'application/pdf']);
                if (! empty($recipients['cc'])) {
                    $message->cc($recipients['cc']);
                }
            });

            $complaint->forceFill([
                'laporan_tindakan_auto_emailed_at' => now(),
            ])->save();

            return [
                'sent' => true,
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
                'subject' => $subject,
            ];
        } catch (\Throwable $e) {
            Log::warning('Auto Laporan Tindakan email failed', [
                'complaint_id' => $complaint->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'reason' => 'send_failed',
            ];
        }
    }

    private function autoSendLaporanTindakanEmailAfterCaseSave(CaseRecord $case): ?array
    {
        if (strtoupper((string) ($case->case_type ?: 'AJ')) !== 'AJ') {
            return null;
        }

        if (! empty($case->laporan_tindakan_auto_emailed_at)) {
            return [
                'sent' => false,
                'reason' => 'already_sent',
            ];
        }

        if (trim((string) ($case->report_notes ?? '')) === '') {
            return null;
        }

        $recipients = $this->resolveAutoEmailRecipients('LAPORAN_TINDAKAN_AUTO_EMAIL_TO', 'LAPORAN_TINDAKAN_AUTO_EMAIL_CC');
        if (empty($recipients['to'])) {
            return [
                'sent' => false,
                'reason' => 'invalid_recipient_config',
            ];
        }

        $case->loadMissing([
            'arrestStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'arrestStaff.office:id,name,code,office_type,district_id,phone,address',
            'complaints:id,reference_no,district_name,complaint_date,complaint_time,laporan_tindakan_auto_emailed_at',
        ]);

        $formatDateDmyDash = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('d-m-Y');
            } catch (\Throwable) {
                return (string) $value;
            }
        };
        $formatTime12hDot = static function ($value): string {
            if (! $value) return '-';
            try {
                return Carbon::parse($value)->format('g.i A');
            } catch (\Throwable) {
                return (string) $value;
            }
        };

        $primaryComplaint = $case->complaints->first();
        $tarikhMasa = $case->action_datetime
            ?: $case->statement_datetime
            ?: $primaryComplaint?->complaint_date;
        $reportDate = $formatDateDmyDash($tarikhMasa);
        $reportTime = $formatTime12hDot($tarikhMasa);

        $officer = $case->arrestStaff;
        $officerName = $officer?->name ?: '-';
        $officerIdNo = $officer?->staff_id ?: $officer?->ic_number ?: '-';
        $officerJob = $officer?->position ?: '-';
        $officerPhone = $this->resolveStaffOfficePhone($officer);
        $officerAddress = $this->resolveStaffOfficeAddress($officer);
        $reportParagraph = strtoupper(trim((string) ($case->report_notes ?? '')));
        $noDaftar = trim((string) ($case->case_register_no ?? '')) ?: '-';

        $arrestStatusLabel = ($case->arrest_status === 'ada') ? 'Ada Tangkapan' : 'Tiada Tangkapan';
        $subjectReference = preg_replace('/\s*\/\s*/', '/', (string) ($case->case_register_no ?: ('Kes #' . $case->id)));
        $subject = 'TINDAKAN (' . $arrestStatusLabel . ') : KES - ' . $subjectReference;
        $bodyPlainText = "Assalamualaikum\n\n"
            . "Laporan Tindakan bagi daerah " . ($case->district_name ?: '-') . " telah diperolehi.\n\n"
            . "Sila muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail KES.\n\n"
            . "Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan\n\n"
            . "Terima kasih.";
        $highlightLine = 'Pastikan Borang 5 ini ditandatangani oleh pemberi maklumat dan Seksyen Inkuiri sebelum dilampirkan di dalam Fail Siasatan';
        $escapedBody = nl2br(e($bodyPlainText));
        $escapedBody = str_replace(
            e($highlightLine),
            '<strong>' . e($highlightLine) . '</strong>',
            $escapedBody
        );
        $html = '<div style="font-family:Verdana,Arial,Helvetica,sans-serif;color:#111;font-size:14px;line-height:1.6;">'
            . $escapedBody
            . '</div>';

        $pdfBinary = Pdf::loadView('pdf.complaints.laporan-tindakan', [
            'noDaftar' => (string) ($noDaftar ?: '-'),
            'reportDate' => (string) ($reportDate ?: '-'),
            'reportTime' => (string) ($reportTime ?: '-'),
            'officerName' => (string) ($officerName ?: '-'),
            'officerIdNo' => (string) ($officerIdNo ?: '-'),
            'officerJob' => (string) ($officerJob ?: '-'),
            'officerPhone' => (string) ($officerPhone ?: '-'),
            'officerAddress' => (string) ($officerAddress ?: '-'),
            'reportParagraph' => (string) ($reportParagraph !== '' ? $reportParagraph : 'LAPORAN MASIH BELUM DIISI'),
        ])->setPaper('a4', 'portrait')->output();

        $pdfFileName = 'BORANG 5 - KES.pdf';

        try {
            Mail::send([], [], function ($message) use ($recipients, $subject, $html, $pdfBinary, $pdfFileName): void {
                $message->to($recipients['to'])
                    ->subject($subject)
                    ->html($html)
                    ->attachData($pdfBinary, $pdfFileName, ['mime' => 'application/pdf']);

                if (! empty($recipients['cc'])) {
                    $message->cc($recipients['cc']);
                }
            });

            $case->forceFill([
                'laporan_tindakan_auto_emailed_at' => now(),
            ])->save();

            $complaintIds = $case->complaints->pluck('id')->filter()->values()->all();
            if (! empty($complaintIds)) {
                Complaint::query()
                    ->whereIn('id', $complaintIds)
                    ->whereNull('laporan_tindakan_auto_emailed_at')
                    ->update(['laporan_tindakan_auto_emailed_at' => now()]);
            }

            return [
                'sent' => true,
                'to' => $recipients['to'],
                'cc' => $recipients['cc'],
                'subject' => $subject,
            ];
        } catch (\Throwable $e) {
            Log::warning('Auto Laporan Tindakan case email failed', [
                'case_id' => $case->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'sent' => false,
                'reason' => 'send_failed',
            ];
        }
    }

    private function resolveAutoEmailRecipients(string $toEnvKey, string $ccEnvKey): array
    {
        $to = $this->parseEmailEnv((string) env($toEnvKey, ''));
        $cc = $this->parseEmailEnv((string) env($ccEnvKey, ''));

        if (empty($cc) && count($to) > 1) {
            $cc = array_slice($to, 1);
            $to = array_slice($to, 0, 1);
        }

        if (! empty($cc)) {
            $toLookup = array_flip(array_map('strtolower', $to));
            $cc = array_values(array_filter($cc, fn ($email) => ! isset($toLookup[strtolower($email)])));
        }

        return [
            'to' => array_values($to),
            'cc' => array_values($cc),
        ];
    }

    private function parseEmailEnv(string $raw): array
    {
        return collect(preg_split('/[;,]+/', trim($raw)))
            ->map(fn ($email) => trim((string) $email))
            ->filter(fn ($email) => filter_var($email, FILTER_VALIDATE_EMAIL))
            ->unique(fn ($email) => strtolower($email))
            ->values()
            ->all();
    }

    private function resolveStaffOfficePhone(?Staff $staff): string
    {
        if (! $staff) {
            return '-';
        }

        $officePhone = trim((string) ($staff->office?->phone ?? ''));
        if ($officePhone !== '') {
            return $officePhone;
        }

        $fallbackPhone = trim((string) ($staff->no_tel_pejabat ?? ''));

        return $fallbackPhone !== '' ? $fallbackPhone : '-';
    }

    private function resolveBorang5OfficePhone(Complaint $complaint, ?Staff $staff): string
    {
        $office = $this->resolveBorang5ContextOffice($complaint, $staff);
        $officePhone = trim((string) ($office?->phone ?? ''));

        if ($officePhone !== '') {
            return $officePhone;
        }

        return $this->resolveStaffOfficePhone($staff);
    }

    private function resolveStaffOfficeAddress(?Staff $staff): string
    {
        if (! $staff) {
            return '-';
        }

        $officeAddress = trim((string) ($staff->office?->address ?? ''));
        if ($officeAddress !== '') {
            return $officeAddress;
        }

        foreach (['office_address', 'address', 'department'] as $field) {
            $value = trim((string) ($staff->{$field} ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '-';
    }

    private function resolveBorang5OfficeAddress(Complaint $complaint, ?Staff $staff): string
    {
        $office = $this->resolveBorang5ContextOffice($complaint, $staff);
        $officeAddress = trim((string) ($office?->address ?? ''));

        if ($officeAddress !== '') {
            return $officeAddress;
        }

        return $this->resolveStaffOfficeAddress($staff);
    }

    private function resolveBorang5ContextOffice(Complaint $complaint, ?Staff $staff): ?Office
    {
        $channel = strtolower(trim((string) ($complaint->channel ?? '')));
        $isPhysicalInformant = in_array($channel, ['walkin', 'walk-in', 'kaunter'], true);
        if ($isPhysicalInformant) {
            return null;
        }

        $staffOfficeType = strtolower(trim((string) ($staff?->office?->office_type ?? $staff?->office_type ?? '')));
        if ($staffOfficeType === 'hq') {
            return Office::query()
                ->where('code', 'HQ')
                ->where('is_active', true)
                ->first();
        }

        return $staff?->office;
    }

    private function stagePayload(string $stage): array
    {
        $payload = ['current_stage' => $stage];
        $statusId = $this->resolveStatusIdForStage($stage);
        if ($statusId) {
            $payload['status_id'] = $statusId;
        }

        return $payload;
    }

    private function resolveStatusIdForStage(string $stage): ?int
    {
        $stageCode = strtolower(trim($stage));
        if ($stageCode === '') {
            return null;
        }

        $statusId = DB::table('complaint_statuses')
            ->where('code', $stageCode)
            ->value('id');
        if ($statusId) {
            return (int) $statusId;
        }

        $fallbackCodes = match ($stageCode) {
            'menunggu_tindakan_pi' => ['disahkan', 'dalam_tindakan'],
            'dihantar_ke_daerah' => ['disahkan', 'dalam_tindakan'],
            'disahkan' => ['dalam_tindakan'],
            'laporan_tindakan' => ['selesai'],
            default => [],
        };

        foreach ($fallbackCodes as $code) {
            $fallbackId = DB::table('complaint_statuses')
                ->where('code', $code)
                ->value('id');
            if ($fallbackId) {
                return (int) $fallbackId;
            }
        }

        return null;
    }

    private function assignPpaToDistrict(Complaint $complaint, int $assignedByUserId): void
    {
        if (! $complaint->district_id) {
            return;
        }

        $ppaStaff = Staff::query()
            ->where('is_active', true)
            ->where('district_id', $complaint->district_id)
            ->where('office_type', 'daerah')
            ->where('position', 'Pegawai Penguatkuasa Agama')
            ->whereNotNull('user_id')
            ->get(['id', 'user_id']);

        foreach ($ppaStaff as $staff) {
            DB::table('complaint_assignments')->updateOrInsert(
                [
                    'complaint_id' => $complaint->id,
                    'user_id' => $staff->user_id,
                ],
                [
                    'assigned_by_user_id' => $assignedByUserId,
                    'status' => 'active',
                    'assigned_at' => now(),
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }

    private function csvRow(array $cells): string
    {
        $escaped = array_map(function ($cell) {
            $text = (string) ($cell ?? '');
            $text = str_replace('"', '""', $text);

            return '"' . $text . '"';
        }, $cells);

        return implode(',', $escaped) . "\r\n";
    }

    private function applyComplaintFilters($query, Request $request): void
    {
        $keyword = trim((string) $request->query('keyword', ''));
        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery
                    ->where('reference_no', 'like', '%' . $keyword . '%')
                    ->orWhere('complainant_name', 'like', '%' . $keyword . '%')
                    ->orWhere('district_name', 'like', '%' . $keyword . '%')
                    ->orWhere('summary', 'like', '%' . $keyword . '%')
                    ->orWhere('borang5_statement', 'like', '%' . $keyword . '%');
            });
        }

        $referenceNo = trim((string) $request->query('reference_no', ''));
        if ($referenceNo !== '') {
            $query->where('reference_no', 'like', '%' . $referenceNo . '%');
        }

        $complainantName = trim((string) $request->query('complainant_name', ''));
        if ($complainantName !== '') {
            $query->where('complainant_name', 'like', '%' . $complainantName . '%');
        }

        $summary = trim((string) $request->query('summary', ''));
        if ($summary !== '') {
            $query->where(function ($subQuery) use ($summary) {
                $subQuery
                    ->where('summary', 'like', '%' . $summary . '%')
                    ->orWhere('borang5_statement', 'like', '%' . $summary . '%');
            });
        }

        $caseRegisterNo = trim((string) $request->query('case_register_no', ''));
        if ($caseRegisterNo !== '') {
            $query->where('case_register_no', 'like', '%' . $caseRegisterNo . '%');
        }

        $offense = trim((string) $request->query('offense', ''));
        if ($offense !== '') {
            $needle = strtolower($offense);
            $query->where(function ($subQuery) use ($needle) {
                $subQuery
                    ->whereExists(function ($exists) use ($needle) {
                        $exists->select(DB::raw(1))
                            ->from('ref_offenses')
                            ->whereColumn('ref_offenses.id', 'complaints.aj_offense_id')
                            ->where(function ($offenseQuery) use ($needle) {
                                $offenseQuery
                                    ->whereRaw('LOWER(ref_offenses.name) like ?', ['%' . $needle . '%'])
                                    ->orWhereRaw('LOWER(COALESCE(ref_offenses.section, "")) like ?', ['%' . $needle . '%'])
                                    ->orWhereRaw('LOWER(ref_offenses.code) like ?', ['%' . $needle . '%']);
                            });
                    })
                    ->orWhereExists(function ($exists) use ($needle) {
                        $exists->select(DB::raw(1))
                            ->from('ref_offenses')
                            ->whereColumn('ref_offenses.id', 'complaints.ak_offense_id')
                            ->where(function ($offenseQuery) use ($needle) {
                                $offenseQuery
                                    ->whereRaw('LOWER(ref_offenses.name) like ?', ['%' . $needle . '%'])
                                    ->orWhereRaw('LOWER(COALESCE(ref_offenses.section, "")) like ?', ['%' . $needle . '%'])
                                    ->orWhereRaw('LOWER(ref_offenses.code) like ?', ['%' . $needle . '%']);
                            });
                    });
            });
        }

        $offenseId = trim((string) $request->query('offense_id', ''));
        if ($offenseId !== '') {
            $query->where(function ($subQuery) use ($offenseId) {
                $subQuery
                    ->where('aj_offense_id', (int) $offenseId)
                    ->orWhere('ak_offense_id', (int) $offenseId);
            });
        }

        $report = trim((string) $request->query('report', ''));
        if ($report !== '') {
            $query->where('aj_report_notes', 'like', '%' . $report . '%');
        }

        $oyd = trim((string) $request->query('oyd', ''));
        if ($oyd !== '') {
            $needle = strtolower($oyd);
            $query->whereHas('oyds', function ($subQuery) use ($needle) {
                $subQuery->where(function ($oydQuery) use ($needle) {
                    $oydQuery
                        ->whereRaw('LOWER(COALESCE(name, "")) like ?', ['%' . $needle . '%'])
                        ->orWhereRaw('LOWER(COALESCE(id_number, "")) like ?', ['%' . $needle . '%'])
                        ->orWhereRaw('LOWER(COALESCE(investigator_name, "")) like ?', ['%' . $needle . '%'])
                        ->orWhereRaw('LOWER(COALESCE(file_no, "")) like ?', ['%' . $needle . '%']);
                });
            });
        }

        $courtDate = trim((string) $request->query('court_date', ''));
        if ($courtDate !== '') {
            $query->whereDate('aj_court_date', '=', $courtDate);
        }

        $investigationNotes = trim((string) $request->query('investigation_notes', ''));
        if ($investigationNotes !== '') {
            $query->where('aj_investigation_notes', 'like', '%' . $investigationNotes . '%');
        }

        $mahkamah = trim((string) $request->query('mahkamah', ''));
        if ($mahkamah !== '') {
            $needle = strtolower($mahkamah);
            $query->whereExists(function ($exists) use ($needle) {
                $exists->select(DB::raw(1))
                    ->from('ref_mahkamah')
                    ->whereColumn('ref_mahkamah.id', 'complaints.aj_mahkamah_id')
                    ->whereRaw('LOWER(ref_mahkamah.nama) like ?', ['%' . $needle . '%']);
            });
        }

        $mahkamahId = trim((string) $request->query('mahkamah_id', ''));
        if ($mahkamahId !== '') {
            $query->where('aj_mahkamah_id', (int) $mahkamahId);
        }

        $modifiedDate = trim((string) $request->query('modified_date', ''));
        if ($modifiedDate !== '') {
            $query->whereDate('updated_at', '=', $modifiedDate);
        }

        $modifiedUser = trim((string) $request->query('modified_user', ''));
        if ($modifiedUser !== '') {
            $needle = strtolower($modifiedUser);
            $query->whereExists(function ($exists) use ($needle) {
                $exists->select(DB::raw(1))
                    ->from('sys_audit_logs')
                    ->join('users', 'users.id', '=', 'sys_audit_logs.user_id')
                    ->where('sys_audit_logs.auditable_type', Complaint::class)
                    ->whereColumn('sys_audit_logs.auditable_id', 'complaints.id')
                    ->whereRaw('LOWER(users.name) like ?', ['%' . $needle . '%']);
            });
        }

        $status = trim((string) $request->query('status', ''));
        if ($status !== '') {
            $statusLower = strtolower($status);
            if ($statusLower === 'disahkan') {
                $query->whereIn('current_stage', ['disahkan', 'menunggu_tindakan_pi', 'dihantar_ke_daerah']);
            } else {
                $query->whereRaw('LOWER(current_stage) = ?', [$statusLower]);
            }
        }

        $pendingApproval = $request->query('pending_approval');
        if ($pendingApproval !== null && $pendingApproval !== '') {
            $query->whereNotNull('approver_staff_id')
                ->whereNull('approver_confirmed_at');
        }

        $districtId = $request->query('district_id');
        if ($districtId !== null && $districtId !== '') {
            $query->where('district_id', (int) $districtId);
        }

        $fromDate = trim((string) $request->query('from_date', ''));
        if ($fromDate !== '') {
            $query->whereDate('complaint_date', '>=', $fromDate);
        }

        $toDate = trim((string) $request->query('to_date', ''));
        if ($toDate !== '') {
            $query->whereDate('complaint_date', '<=', $toDate);
        }

        $caseType = trim((string) $request->query('case_type', ''));
        if ($caseType !== '') {
            $query->where('case_type', strtoupper($caseType));
        }

        $ipStatus = trim((string) $request->query('ip_status', ''));
        if ($ipStatus !== '') {
            $needle = strtolower($ipStatus);
            // Support both AJ + AK in a single filter for "Senarai Aduan".
            $query->where(function ($subQuery) use ($needle) {
                $subQuery
                    ->whereRaw('LOWER(aj_ip_status) = ?', [$needle])
                    ->orWhereRaw('LOWER(ak_ip_status) = ?', [$needle]);
            });
        }

        $actionStatus = trim((string) $request->query('action_status', ''));
        if ($actionStatus !== '') {
            $query->whereRaw('LOWER(aj_current_status) = ?', [strtolower($actionStatus)]);
        }

        $prosecutionStatus = trim((string) $request->query('prosecution_status', ''));
        if ($prosecutionStatus !== '') {
            $query->whereRaw('LOWER(aj_prosecution_status) = ?', [strtolower($prosecutionStatus)]);
        }

        $classification = $this->normalizePpaClassification((string) $request->query('classification', ''));
        if ($classification) {
            $this->applyPpaClassificationFilter($query, $classification);
        }

        $receiver = trim((string) $request->query('received_by', ''));
        if ($receiver !== '') {
            $needle = strtolower($receiver);
            $query->whereHas('receivedBy', function ($subQuery) use ($needle) {
                $subQuery->whereRaw('LOWER(name) like ?', ['%' . $needle . '%']);
            });
        }

        $approver = trim((string) $request->query('approver', ''));
        if ($approver !== '') {
            $needle = strtolower($approver);
            $query->whereHas('approverStaff', function ($subQuery) use ($needle) {
                $subQuery->whereRaw('LOWER(name) like ?', ['%' . $needle . '%']);
            });
        }

        $channel = trim((string) $request->query('channel', ''));
        if ($channel !== '') {
            $query->whereRaw('LOWER(channel) = ?', [strtolower($channel)]);
        }

        $incidentFromDate = trim((string) $request->query('incident_from_date', ''));
        if ($incidentFromDate !== '') {
            $query->whereDate('incident_date', '>=', $incidentFromDate);
        }

        $incidentToDate = trim((string) $request->query('incident_to_date', ''));
        if ($incidentToDate !== '') {
            $query->whereDate('incident_date', '<=', $incidentToDate);
        }

        $isCase = $request->query('is_case');
        if ($isCase !== null && $isCase !== '') {
            $query->where('is_case', filter_var($isCase, FILTER_VALIDATE_BOOLEAN));
            // "KES" is only meaningful after sah/approve.
            if (filter_var($isCase, FILTER_VALIDATE_BOOLEAN)) {
                $query->whereNotNull('approver_confirmed_at');
            }
        }
    }

    private function buildComplaintListQuery(Request $request, $user)
    {
        $scope = trim((string) $request->query('scope', 'index'));

        switch ($scope) {
            case 'my':
                $query = Complaint::query()
                    ->where('submitted_by_user_id', $user->id)
                    ->orderByDesc('id');
                break;
            case 'pending-approval':
                if (! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
                    return null;
                }
                $query = Complaint::query()
                    ->whereNotNull('approver_staff_id')
                    ->whereNull('approver_confirmed_at')
                    ->orderByDesc('id');

                if ($user->staff) {
                    $query->where('approver_staff_id', $user->staff->id);
                } elseif ($user->name) {
                    $query->whereHas('approverStaff', function ($subQuery) use ($user) {
                        $subQuery->whereRaw('LOWER(name) = ?', [strtolower($user->name)]);
                    });
                }
                break;
            case 'pickup-queue':
                if (! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
                    return null;
                }
                $complaintIds = DB::table('complaint_assignments')
                    ->where('user_id', $user->id)
                    ->where('status', 'active')
                    ->pluck('complaint_id');

                $query = Complaint::query()
                    ->whereIn('id', $complaintIds)
                    ->whereNull('pic_user_id')
                    ->whereNotNull('approver_confirmed_at')
                    ->orderByDesc('id');
                break;
            case 'my-pic':
                if (! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
                    return null;
                }
                $query = Complaint::query()
                    ->where('pic_user_id', $user->id)
                    ->orderByDesc('id');
                break;
            case 'index':
            default:
                $query = Complaint::query()->orderByDesc('id');
                $this->applyComplaintAccessScope($query, $user);
                break;
        }

        $this->applyComplaintFilters($query, $request);

        return $query;
    }

    private function applyComplaintAccessScope($query, $user): void
    {
        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            return;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            if ($districtId) {
                $query->where('district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
            return;
        }

        if ($user->hasAnyRole(['awam', 'user'])) {
            $query->where('submitted_by_user_id', $user->id);
            return;
        }

        $query->whereRaw('1 = 0');
    }

    private function canViewComplaint(Complaint $complaint, $user): bool
    {
        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            return true;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            return $districtId && (int) $complaint->district_id === (int) $districtId;
        }

        if ($user->hasAnyRole(['awam', 'user'])) {
            return (int) $complaint->submitted_by_user_id === (int) $user->id;
        }

        return false;
    }

    private function canViewCaseRecord(CaseRecord $case, $user): bool
    {
        if ($user->hasAnyRole(['system', 'admin', 'pegawai', 'pegawai_hq'])) {
            return true;
        }

        if ($user->hasRole('pegawai_daerah')) {
            $districtId = $this->resolveUserDistrictId($user);
            return $districtId && (int) ($case->district_id ?? 0) === (int) $districtId;
        }

        return false;
    }

    private function loadCaseDetail(CaseRecord $case): CaseRecord
    {
        return $case->load([
            'district:id,name',
            'supervisorStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'supervisorStaff.office:id,name,code,office_type,district_id,phone,address',
            'directiveStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'directiveStaff.office:id,name,code,office_type,district_id,phone,address',
            'handoverStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'handoverStaff.office:id,name,code,office_type,district_id,phone,address',
            'arrestStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'arrestStaff.office:id,name,code,office_type,district_id,phone,address',
            'prosecutorStaff:id,name,staff_id,ic_number,phone,no_tel_pejabat,office_address,address,position,department,office_id',
            'prosecutorStaff.office:id,name,code,office_type,district_id,phone,address',
            'oyds.media:id,case_oyd_id,category,file_name,stored_name,path,disk,mime,size,created_at',
            'seizureItems.media:id,case_seizure_item_id,category,file_name,stored_name,path,disk,mime,size,created_at',
            'policeReports.media:id,case_police_report_id,category,file_name,stored_name,path,disk,mime,size,created_at',
            'complaints' => function ($query) {
                $query->select([
                    'complaints.id',
                    'complaints.reference_no',
                    'complaints.case_register_no',
                    'complaints.case_type',
                    'complaints.district_name',
                    'complaints.complainant_name',
                    'complaints.complaint_date',
                    'complaints.complaint_time',
                    'complaints.current_stage',
                ])->orderByDesc('case_complaint_links.is_primary')
                    ->orderByDesc('complaints.id');
            },
        ]);
    }

    private function normalizeCaseRows(array $rows, array $fields): array
    {
        return collect($rows)
            ->map(function ($row) use ($fields) {
                $next = [];
                if (! empty($row['id'])) {
                    $next['id'] = (int) $row['id'];
                }
                foreach ($fields as $field) {
                    $next[$field] = trim((string) ($row[$field] ?? ''));
                }
                return $next;
            })
            ->filter(function ($row) {
                return collect($row)
                    ->except('id')
                    ->contains(fn ($value) => trim((string) $value) !== '');
            })
            ->values()
            ->all();
    }

    private function syncCaseChildRows(CaseRecord $case, string $modelClass, string $relationName, array $rows, array $fields): void
    {
        $normalizedRows = $this->normalizeCaseRows($rows, $fields);
        $existingRows = $case->{$relationName}()
            ->with('media')
            ->get()
            ->keyBy('id');
        $incomingIds = collect($normalizedRows)
            ->pluck('id')
            ->filter()
            ->map(fn ($value) => (int) $value)
            ->all();

        foreach ($existingRows as $existingRow) {
            if (! in_array((int) $existingRow->id, $incomingIds, true)) {
                foreach ($existingRow->media as $media) {
                    if (! empty($media->path)) {
                        Storage::disk($media->disk ?: 'local')->delete($media->path);
                    }
                    $media->delete();
                }
                $existingRow->delete();
            }
        }

        foreach ($normalizedRows as $row) {
            $rowId = (int) ($row['id'] ?? 0);
            $payload = [];
            foreach ($fields as $field) {
                $payload[$field] = $this->nullableString($row[$field] ?? null);
            }

            if ($rowId > 0 && $existingRows->has($rowId)) {
                $existingRows->get($rowId)->update($payload);
                continue;
            }

            $payload['case_id'] = $case->id;
            $modelClass::create($payload);
        }
    }

    private function storeCaseMediaFiles(array $files, string $mediaClass, string $foreignKey, int $parentId, string $folder, string $category, int $uploadedByUserId): void
    {
        $disk = 'local';

        foreach ($files as $file) {
            $storedName = Str::uuid()->toString() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs($folder, $storedName, $disk);

            $mediaClass::create([
                $foreignKey => $parentId,
                'category' => $category,
                'file_name' => $file->getClientOriginalName(),
                'stored_name' => $storedName,
                'path' => $path,
                'disk' => $disk,
                'mime' => $file->getClientMimeType(),
                'size' => $file->getSize(),
                'uploaded_by_user_id' => $uploadedByUserId,
            ]);
        }
    }

    private function deleteCaseMedia(Request $request, CaseRecord $case, $media, string $parentClass, string $foreignKey, string $message)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $parent = $parentClass::find($media->{$foreignKey});
        if (! $parent || (int) $parent->case_id !== (int) $case->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk kes ini.'], 422);
        }

        if ($media->path) {
            Storage::disk($media->disk ?: 'local')->delete($media->path);
        }
        $media->delete();

        return response()->json(['message' => $message]);
    }

    private function downloadCaseMedia(Request $request, CaseRecord $case, $media, string $parentClass, string $foreignKey)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        if (! $this->canViewCaseRecord($case, $user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $parent = $parentClass::find($media->{$foreignKey});
        if (! $parent || (int) $parent->case_id !== (int) $case->id) {
            return response()->json(['message' => 'Lampiran tidak sah untuk kes ini.'], 422);
        }
        if (! $media->path) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        $disk = $media->disk ?: 'local';
        if (! Storage::disk($disk)->exists($media->path)) {
            return response()->json(['message' => 'Fail lampiran tidak ditemui.'], 404);
        }

        return Storage::disk($disk)->download($media->path, $media->file_name);
    }

    private function nullableString($value): ?string
    {
        $text = trim((string) ($value ?? ''));

        return $text === '' ? null : $text;
    }

    private function isBasicOfficerEditLockedByChannel(?string $channel): bool
    {
        $normalized = str_replace('_', '-', strtolower(trim((string) $channel)));
        return in_array($normalized, ['portal', 'web', 'whatsapp', 'whatsapp-meta', 'whatsapp-web'], true);
    }

    private function resolveUserDistrictId($user): ?int
    {
        if (! empty($user->district_id)) {
            return (int) $user->district_id;
        }

        if ($user->staff && ! empty($user->staff->district_id)) {
            return (int) $user->staff->district_id;
        }

        return null;
    }

    private function runTesseractOcr(string $imagePath): ?string
    {
        $bin = env('TESSERACT_BIN', 'tesseract');
        $lang = env('TESSERACT_LANG', 'eng');
        $isWindows = strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
        $safePath = $isWindows
            ? '"' . str_replace('"', '""', $imagePath) . '"'
            : escapeshellarg($imagePath);
        $safeLang = $isWindows
            ? '"' . str_replace('"', '""', $lang) . '"'
            : escapeshellarg($lang);

        $binCandidates = array_values(array_filter(array_unique([
            $bin,
            'tesseract',
        ])));

        foreach ($binCandidates as $candidate) {
            $safeBin = $isWindows
                ? '"' . str_replace('"', '""', $candidate) . '"'
                : escapeshellarg($candidate);

            $checkCmd = "{$safeBin} --version 2>&1";
            $checkOut = shell_exec($checkCmd);
            if (!is_string($checkOut) || stripos($checkOut, 'tesseract') === false) {
                continue;
            }

            $cmd = "{$safeBin} {$safePath} stdout -l {$safeLang} --psm 6 2>&1";
            $output = shell_exec($cmd);
            if (is_string($output) && trim($output) !== '') {
                return $output;
            }
        }

        return null;
    }

    private function parseMyKadText(string $text): array
    {
        $upperText = strtoupper((string) $text);
        $normalized = preg_replace('/\s+/', ' ', $upperText);

        // OCR often misreads O/I/L/S/B as 0/1/1/5/8 in numeric fields.
        $numericNormalized = strtr($normalized, [
            'O' => '0',
            'I' => '1',
            'L' => '1',
            'S' => '5',
            'B' => '8',
        ]);

        $idNumber = null;
        if (preg_match('/\b(\d{6})\D?(\d{2})\D?(\d{4})\b/', $numericNormalized, $m)) {
            $idNumber = "{$m[1]}-{$m[2]}-{$m[3]}";
        } elseif (preg_match('/\b(\d{12})\b/', preg_replace('/\D+/', '', $numericNormalized), $m)) {
            $raw = $m[1];
            $idNumber = substr($raw, 0, 6) . '-' . substr($raw, 6, 2) . '-' . substr($raw, 8, 4);
        }

        $blocked = [
            'MALAYSIA', 'KAD PENGENALAN', 'IDENTITY CARD', 'WARGANEGARA', 'LELAKI',
            'PEREMPUAN', 'ALAMAT', 'NEGARA', 'AGAMA', 'ISLAM', 'NO', 'NOMBOR', 'JANTINA',
        ];
        $addressMarkers = ['LOT', 'JALAN', 'TAMAN', 'BANDAR', 'KG', 'KAMPUNG', 'SEKSYEN', 'DAERAH', 'NEGERI'];

        $lines = array_values(array_filter(array_map(
            static fn($line) => trim((string) preg_replace('/\s+/', ' ', (string) $line)),
            preg_split('/\R/', $upperText) ?: []
        ), static fn($line) => $line !== ''));

        $idLineIndex = null;
        foreach ($lines as $idx => $line) {
            $numericLine = strtr($line, [
                'O' => '0',
                'I' => '1',
                'L' => '1',
                'S' => '5',
                'B' => '8',
            ]);
            if (preg_match('/\b\d{6}\D?\d{2}\D?\d{4}\b/', $numericLine)) {
                $idLineIndex = $idx;
                break;
            }
        }

        $candidates = [];
        $addCandidate = static function (string $candidate, int $scoreBoost = 0) use (&$candidates, $blocked, $addressMarkers): void {
            $candidate = trim((string) $candidate);
            if ($candidate === '') {
                return;
            }

            // Prefer explicit part after ":" when OCR returns format like ": NAMA ..."
            if (str_contains($candidate, ':')) {
                $parts = explode(':', $candidate);
                $tail = trim((string) end($parts));
                if ($tail !== '') {
                    $candidate = $tail;
                }
            }

            $candidate = preg_replace('/^.*?(NAMA|NAME)\s*[:\-]?\s*/', '', $candidate);
            $candidate = preg_replace('/\b\d{6}\D?\d{2}\D?\d{4}\b/', '', (string) $candidate);
            $candidate = preg_replace('/\b\d{12}\b/', '', (string) $candidate);
            $candidate = preg_replace('/^\W+/', '', (string) $candidate);
            $candidate = preg_replace('/\d.*$/', '', (string) $candidate);
            $candidate = preg_replace('/[^A-Z@\.\'\/\-\s]/', ' ', (string) $candidate);
            $candidate = trim((string) preg_replace('/\s+/', ' ', (string) $candidate));
            if ($candidate === '' || strlen($candidate) < 4) {
                return;
            }

            foreach ($blocked as $kw) {
                if (str_contains($candidate, $kw)) {
                    return;
                }
            }
            foreach ($addressMarkers as $kw) {
                if (str_contains($candidate, $kw)) {
                    return;
                }
            }
            if (!preg_match('/^[A-Z@\.\'\/\-\s]+$/', $candidate)) {
                return;
            }

            $tokenCount = count(array_filter(explode(' ', $candidate)));
            if ($tokenCount < 2 || $tokenCount > 10) {
                return;
            }

            // Remove OCR suffix noise like "ZZ", "|" at end while keeping main full name.
            $tokens = array_values(array_filter(explode(' ', $candidate)));
            while (count($tokens) > 2 && strlen((string) end($tokens)) <= 2) {
                array_pop($tokens);
            }
            $candidate = implode(' ', $tokens);
            if ($candidate === '') {
                return;
            }

            $longTokenCount = 0;
            foreach ($tokens as $token) {
                if (strlen($token) >= 3) {
                    $longTokenCount++;
                }
            }
            if ($longTokenCount === 0) {
                return;
            }

            $score = strlen($candidate) + $scoreBoost;
            if (preg_match('/\b(BIN|BINTI|BT|BTE|A\/L|A\/P)\b/', $candidate)) {
                $score += 30;
            }

            if (!isset($candidates[$candidate]) || $score > $candidates[$candidate]) {
                $candidates[$candidate] = $score;
            }
        };

        // Priority 1: line with explicit label NAMA/NAME.
        foreach ($lines as $i => $line) {
            if (str_contains($line, 'NAMA') || str_contains($line, 'NAME')) {
                $addCandidate($line, 50);
                if (isset($lines[$i + 1])) {
                    $addCandidate((string) $lines[$i + 1], 40);
                }
            }
        }

        // Priority 2: lines near IC number line are often the name line.
        if ($idLineIndex !== null) {
            for ($i = max(0, $idLineIndex - 3); $i <= min(count($lines) - 1, $idLineIndex + 3); $i++) {
                $boost = ($i === $idLineIndex) ? 10 : 25;
                $addCandidate((string) $lines[$i], $boost);
            }
        }

        // Fallback: scan all lines.
        foreach ($lines as $line) {
            $addCandidate((string) $line, 0);
        }

        arsort($candidates);
        $bestName = (string) (array_key_first($candidates) ?? '');

        return [
            'name' => $bestName !== '' ? ucwords(strtolower($bestName)) : null,
            'id_number' => $idNumber,
        ];
    }

    private function detectUnsupportedDocumentType(string $ocrText): ?string
    {
        $upper = strtoupper((string) $ocrText);
        $normalized = preg_replace('/\s+/', ' ', $upper);

        $licenseKeywords = [
            'LESEN MEMANDU',
            'DRIVING LICENCE',
            'DRIVING LICENSE',
            'MALAYSIAN DRIVING LICENCE',
            'MALAYSIAN DRIVING LICENSE',
            'KELAS',
            'TEMPOH',
        ];

        $hasLicenseWord = false;
        $hits = 0;
        foreach ($licenseKeywords as $keyword) {
            if (str_contains($normalized, $keyword)) {
                $hits++;
                if (str_contains($keyword, 'LESEN') || str_contains($keyword, 'DRIVING')) {
                    $hasLicenseWord = true;
                }
            }
        }

        if ($hasLicenseWord && $hits >= 1) {
            return 'lesen_memandu';
        }

        return null;
    }

    private function normalizePpaClassification(?string $value): ?string
    {
        $classification = strtoupper(trim((string) $value));
        if ($classification === '') {
            return null;
        }
        if ($classification === 'FFA') {
            $classification = 'FNA';
        }

        return in_array($classification, ['FNA', 'KIV', 'NFA', 'OP'], true)
            ? $classification
            : null;
    }

    private function applyPpaClassificationFilter($query, string $classification): void
    {
        if ($classification === 'FNA') {
            $query->where(function ($subQuery) {
                $subQuery->whereRaw('UPPER(aj_ppa_classification) = ?', ['FNA'])
                    ->orWhereRaw('UPPER(aj_ppa_classification) = ?', ['FFA']);
            });
            return;
        }

        $query->whereRaw('UPPER(aj_ppa_classification) = ?', [$classification]);
    }

    private function respondWithPagination($query, Request $request, string $message)
    {
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0 || $perPage > 500) {
            $perPage = 10;
        }

        $query->with([
            'receivedBy:id,name',
            'approverStaff:id,name,staff_id',
        ]);

        $items = $query->paginate($perPage);
        $items->getCollection()->transform(function ($item) {
            $preferredSummary = trim((string) ($item->borang5_statement ?? ''));
            $fallbackSummary = trim((string) ($item->summary ?? ''));
            $item->summary = $preferredSummary !== '' ? $preferredSummary : $fallbackSummary;
            $this->normalizeComplaintReferenceAttributes($item);
            return $item;
        });

        return response()->json([
            'message' => $message,
            'data' => $items->items(),
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    private function makeReportSpreadsheet(string $sheetTitle, array $headers, array $rows): Spreadsheet
    {
        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();
        $sheet->setTitle($sheetTitle);
        $sheet->fromArray($headers, null, 'A1');
        if ($rows) {
            $sheet->fromArray($rows, null, 'A2');
        }
        $this->styleReportSheetHeader($sheet, count($headers));
        return $spreadsheet;
    }

    private function addReportSheet(Spreadsheet $spreadsheet, string $title, array $headers)
    {
        $sheet = $spreadsheet->createSheet();
        $sheet->setTitle($title);
        $sheet->fromArray($headers, null, 'A1');
        $this->styleReportSheetHeader($sheet, count($headers));
        return $sheet;
    }

    private function styleReportSheetHeader($sheet, int $columnCount): void
    {
        $lastCol = Coordinate::stringFromColumnIndex($columnCount);
        $sheet->getStyle("A1:{$lastCol}1")->getFont()->setBold(true);
        $sheet->getStyle("A1:{$lastCol}1")->getFill()
            ->setFillType(Fill::FILL_SOLID)
            ->getStartColor()->setARGB('FFEFF6F2');
        $sheet->freezePane('A2');
    }

    private function downloadSpreadsheet(Spreadsheet $spreadsheet, string $filename)
    {
        $writer = new Xlsx($spreadsheet);
        $writer->setPreCalculateFormulas(false);

        return response()->streamDownload(function () use ($writer) {
            $writer->save('php://output');
        }, $filename, [
            'Content-Type' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        ]);
    }

    private function normalizeComplaintReferenceNo(?string $referenceNo): string
    {
        $raw = trim((string) $referenceNo);
        if ($raw === '') {
            return '';
        }

        return preg_replace('/\s*\/\s*/', '/', $raw) ?? $raw;
    }

    private function normalizeComplaintReferenceAttributes($complaint): void
    {
        if (! $complaint || ! isset($complaint->reference_no)) {
            return;
        }

        $complaint->reference_no = $this->normalizeComplaintReferenceNo($complaint->reference_no);
    }
}
