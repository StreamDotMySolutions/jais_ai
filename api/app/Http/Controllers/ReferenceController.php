<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReferenceController extends Controller
{
    public function offenseTypes(): JsonResponse
    {
        $items = DB::table('ref_offense_types')
            ->where('is_active', 1)
            ->orderBy('code')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'message' => 'Offense types',
            'data' => $items,
        ]);
    }

    public function offenses(): JsonResponse
    {
        $items = DB::table('ref_offenses')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'section', 'name']);

        return response()->json([
            'message' => 'Offenses',
            'data' => $items,
        ]);
    }

    public function khalwatDetails(): JsonResponse
    {
        $items = DB::table('ref_khalwat_details')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        return response()->json([
            'message' => 'Khalwat details',
            'data' => $items,
        ]);
    }

    public function judiDetails(): JsonResponse
    {
        $items = DB::table('ref_judi_details')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'name']);

        return response()->json([
            'message' => 'Judi details',
            'data' => $items,
        ]);
    }

    public function complaintStatuses(): JsonResponse
    {
        $items = DB::table('complaint_statuses')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'message' => 'Complaint statuses',
            'data' => $items,
        ]);
    }

    public function complaintEmailRecipients(): JsonResponse
    {
        $items = DB::table('ref_complaint_email_recipients')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'email', 'label']);

        return response()->json([
            'message' => 'Complaint email recipients',
            'data' => $items,
        ]);
    }

    public function arahanBeredarSections(): JsonResponse
    {
        $items = DB::table('ref_arahan_beredar_sections')
            ->where('is_active', 1)
            ->orderBy('sort_order')
            ->get(['id', 'code', 'name']);

        return response()->json([
            'message' => 'Arahan beredar sections',
            'data' => $items,
        ]);
    }

    public function iwaranJenisKes(): JsonResponse
    {
        $hasCodeColumn = Schema::hasColumn('ref_iwaran_jenis_kes', 'code');

        $query = DB::table('ref_iwaran_jenis_kes')
            ->where('is_active', 1);

        if ($hasCodeColumn) {
            $query->orderBy('code');
        }

        $query->orderBy('nama');

        $kategori = request()->get('kategori');
        if ($kategori) {
            $query->where('kategori', $kategori);
        }

        $data = $hasCodeColumn
            ? $query->get(['id', 'code', 'kategori', 'nama'])
            : $query->get(['id', 'kategori', 'nama'])->map(function ($item) {
                $item->code = null;
                return $item;
            });

        return response()->json([
            'message' => 'Jenis kes i-WARAN',
            'data' => $data,
        ]);
    }

    public function iwaranHasil(): JsonResponse
    {
        $items = DB::table('ref_iwaran_hasil')
            ->where('is_active', 1)
            ->orderBy('nama')
            ->get(['id', 'nama']);

        return response()->json([
            'message' => 'Hasil perlaksanaan i-WARAN',
            'data' => $items,
        ]);
    }

    public function mahkamah(): JsonResponse
    {
        $items = DB::table('ref_mahkamah')
            ->where('is_active', 1)
            ->orderBy('nama')
            ->get(['id', 'nama', 'daerah_id', 'emel']);

        return response()->json([
            'message' => 'Senarai mahkamah',
            'data' => $items,
        ]);
    }

    public function offices(): JsonResponse
    {
        $items = DB::table('offices')
            ->leftJoin('districts', 'offices.district_id', '=', 'districts.id')
            ->where('offices.is_active', 1)
            ->orderByRaw("CASE WHEN offices.office_type = 'hq' THEN 0 ELSE 1 END")
            ->orderBy('offices.name')
            ->get([
                'offices.id',
                'offices.code',
                'offices.name',
                'offices.office_type',
                'offices.district_id',
                'offices.phone',
                'offices.email',
                'offices.address',
                'offices.iwaran_address',
                'districts.name as district_name',
            ]);

        return response()->json([
            'message' => 'Senarai pejabat',
            'data' => $items,
        ]);
    }

    public function storeMahkamah(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'nama' => ['required', 'string', 'max:255', 'unique:ref_mahkamah,nama'],
            'daerah_id' => ['nullable', 'exists:districts,id'],
            'emel' => ['nullable', 'email', 'max:255'],
        ]);

        $nama = trim(preg_replace('/\s+/', ' ', (string) ($validated['nama'] ?? '')));
        if ($nama === '') {
            return response()->json(['message' => 'Nama mahkamah wajib diisi.'], 422);
        }

        $id = DB::table('ref_mahkamah')->insertGetId([
            'nama' => $nama,
            'daerah_id' => $validated['daerah_id'] ?? null,
            'emel' => $validated['emel'] ?? null,
            'is_active' => 1,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $item = DB::table('ref_mahkamah')
            ->where('id', $id)
            ->first(['id', 'nama', 'daerah_id', 'emel']);

        return response()->json([
            'message' => 'Mahkamah berjaya ditambah.',
            'data' => $item,
        ], 201);
    }
}
