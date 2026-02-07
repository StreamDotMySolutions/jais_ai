<?php

namespace App\Http\Controllers;

use App\Models\IwaranWaranAttachment;
use App\Models\IwaranWarrant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class IwaranWarrantController extends Controller
{
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

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_waran' => ['nullable', 'in:tangkap,geledah'],
            'no_ruj_fail' => ['nullable', 'string'],
            'tarikh_masa_terima' => ['nullable', 'date'],
            'tahun' => ['nullable', 'integer'],
            'no_kes' => ['nullable', 'string'],
            'jenis_kes_mal_id' => ['nullable', 'integer'],
            'jenis_kes_mal_lain' => ['nullable', 'string', 'max:255'],
            'jenis_kes_jenayah_id' => ['nullable', 'integer'],
            'mahkamah_id' => ['nullable', 'integer'],
            'daerah_id' => ['nullable', 'integer'],
            'emel' => ['nullable', 'email'],
            'emel_mahkamah' => ['nullable', 'email'],
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

        $pendaftarStaffId = optional($request->user()?->staff)->id;
        if ($pendaftarStaffId) {
            $data['pendaftar_staff_id'] = $pendaftarStaffId;
        }

        $iwaranWarrant = IwaranWarrant::create($data);

        return response()->json([
            'message' => 'Waran disimpan.',
            'data' => $iwaranWarrant,
        ], 201);
    }

    public function index(Request $request): JsonResponse
    {
        $query = IwaranWarrant::query()
            ->latest()
            ->with([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
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

        $items = $query->paginate($request->integer('per_page', 10));

        return response()->json([
            'message' => 'Senarai waran',
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

    public function show(IwaranWarrant $iwaranWarrant): JsonResponse
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

        $attachments = $iwaranWarrant->attachments->map(function (IwaranWaranAttachment $attachment) {
            return [
                'id' => $attachment->id,
                'file_name' => $attachment->file_name,
                'mime' => $attachment->mime,
                'size' => $attachment->size,
                'created_at' => $attachment->created_at,
                'download_url' => route('iwaran.attachments.download', ['attachment' => $attachment->id]),
            ];
        });

        return response()->json([
            'message' => 'Maklumat waran',
            'data' => array_merge($iwaranWarrant->toArray(), [
                'attachments' => $attachments,
            ]),
        ]);
    }

    public function update(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $data = $request->validate([
            'jenis_waran' => ['nullable', 'in:tangkap,geledah'],
            'no_ruj_fail' => ['nullable', 'string'],
            'tarikh_masa_terima' => ['nullable', 'date'],
            'tahun' => ['nullable', 'integer'],
            'no_kes' => ['nullable', 'string'],
            'jenis_kes_mal_id' => ['nullable', 'integer'],
            'jenis_kes_mal_lain' => ['nullable', 'string', 'max:255'],
            'jenis_kes_jenayah_id' => ['nullable', 'integer'],
            'mahkamah_id' => ['nullable', 'integer'],
            'daerah_id' => ['nullable', 'integer'],
            'emel' => ['nullable', 'email'],
            'emel_mahkamah' => ['nullable', 'email'],
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

        $iwaranWarrant->update($data);

        return response()->json([
            'message' => 'Waran dikemaskini.',
            'data' => $iwaranWarrant->fresh(),
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
        $disk = $attachment->disk ?: 'local';
        if ($attachment->path) {
            Storage::disk($disk)->delete($attachment->path);
        }

        $attachment->delete();

        return response()->json([
            'message' => 'Fail dipadam.',
        ]);
    }

    public function destroy(Request $request, IwaranWarrant $iwaranWarrant): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! method_exists($user, 'hasAnyRole') || ! $user->hasAnyRole(['pegawai_hq', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $iwaranWarrant->load(['attachments']);

        foreach (($iwaranWarrant->attachments ?? []) as $attachment) {
            $disk = $attachment->disk ?: 'local';
            if ($attachment->path) {
                Storage::disk($disk)->delete($attachment->path);
            }
        }

        $iwaranWarrant->delete();

        return response()->json([
            'message' => 'Waran dipadam.',
        ]);
    }
}
