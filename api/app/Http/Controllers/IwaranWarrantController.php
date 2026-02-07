<?php

namespace App\Http\Controllers;

use App\Models\IwaranWarrant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class IwaranWarrantController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'jenis_waran' => ['nullable', 'in:tangkap,geledah'],
            'no_ruj_fail' => ['nullable', 'string'],
            'tarikh_masa_terima' => ['nullable', 'date'],
            'tahun' => ['nullable', 'integer'],
            'no_kes' => ['nullable', 'string'],
            'jenis_kes_mal_id' => ['nullable', 'integer'],
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

    public function show(IwaranWarrant $iwaranWarrant): JsonResponse
    {
        return response()->json([
            'message' => 'Maklumat waran',
            'data' => $iwaranWarrant->load([
                'daerah:id,name',
                'mahkamah:id,nama',
                'pendaftar:id,name',
                'pelaksana:id,name',
                'jenisKesMal:id,nama',
                'jenisKesJenayah:id,nama',
                'hasilPerlaksanaan:id,nama',
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
}
