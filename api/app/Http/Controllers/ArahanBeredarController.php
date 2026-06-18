<?php

namespace App\Http\Controllers;

use App\Models\ArahanBeredar;
use App\Models\ArahanBeredarOyd;
use App\Models\ArahanBeredarOydMedia;
use App\Models\Staff;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use App\Services\CommonService;

class ArahanBeredarController extends Controller
{
    private function isSystemUser($user): bool
    {
        return (bool) ($user && method_exists($user, 'hasRole') && $user->hasRole('system'));
    }

    private function canViewAudit($user): bool
    {
        return (bool) ($user && method_exists($user, 'hasAnyRole') && $user->hasAnyRole(['admin', 'system']));
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        $query = ArahanBeredar::query()
            ->latest()
            ->with(['oyds.media', 'sections', 'staff:id,name']);

        $scope = trim((string) $request->query('scope', 'active'));
        if ($scope === 'deleted') {
            if (! $this->isSystemUser($user)) {
                return response()->json(['message' => 'Unauthorized'], 403);
            }

            $query->onlyTrashed();
        }

        $items = $query->paginate($request->integer('per_page', 10));

        $rows = collect($items->items())->map(function (ArahanBeredar $item) use ($user) {
            return array_merge($item->toArray(), [
                'is_deleted' => ! is_null($item->deleted_at),
                'can_restore' => ! is_null($item->deleted_at) && $this->isSystemUser($user),
            ]);
        })->values();

        return response()->json([
            'message' => 'Arahan beredar',
            'data' => $rows,
            'meta' => [
                'current_page' => $items->currentPage(),
                'last_page' => $items->lastPage(),
                'per_page' => $items->perPage(),
                'total' => $items->total(),
            ],
        ]);
    }

    public function show(Request $request, ArahanBeredar $arahanBeredar): JsonResponse
    {
        $user = $request->user();
        $arahanBeredar->load([
            'oyds.media',
            'sections',
            'staff:id,name',
            'creator:id,name',
            'updatedBy:id,name',
            'deletedBy:id,name',
        ]);

        if (! $this->canViewAudit($user)) {
            $arahanBeredar->unsetRelation('creator');
            $arahanBeredar->unsetRelation('updatedBy');
            $arahanBeredar->unsetRelation('deletedBy');
            $arahanBeredar->makeHidden(['creator', 'updatedBy', 'deletedBy', 'created_by', 'updated_by', 'deleted_by']);
        }

        return response()->json([
            'message' => 'Arahan beredar',
            'data' => $arahanBeredar,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'location' => ['required', 'string'],
            'incident_date' => ['required', 'date'],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*' => ['required', 'integer', 'exists:ref_arahan_beredar_sections,id'],
            'oyds' => ['required', 'json'],
        ]);

        $user = $request->user();
        $staff = $user ? Staff::query()->where('user_id', $user->id)->first() : null;
        $oydsList = json_decode($request->input('oyds'), true) ?? [];

        DB::beginTransaction();

        try {
            $record = ArahanBeredar::create([
                'staff_id' => $staff?->id,
                'created_by_user_id' => $user?->id,
                'email' => $request->input('email') ?: ($user?->email),
                'location' => $request->input('location'),
                'incident_date' => $request->input('incident_date'),
                'other_section' => $request->input('other_section'),
                'notes' => $request->input('notes'),
                'status' => $request->input('status', 'draf'),
            ]);

            $record->sections()->sync($request->input('sections', []));

            foreach ($oydsList as $index => $oyds) {
                $oydsModel = ArahanBeredarOyd::create([
                    'arahan_beredar_id' => $record->id,
                    'name' => $oyds['name'] ?? '',
                    'ic_number' => $oyds['ic_number'] ?? null,
                    'phone' => $oyds['phone'] ?? null,
                    'address' => $oyds['address'] ?? null,
                ]);

                $files = $request->file("oyds_photos.$index", []);
                if ($files) {
                    foreach ($files as $file) {
                        $storedName = CommonService::handleStoreFile($file, 'arahan-beredar/oyds');
                        if (!$storedName) {
                            continue;
                        }
                        ArahanBeredarOydMedia::create([
                            'oyds_id' => $oydsModel->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => "arahan-beredar/oyds/{$storedName}",
                            'file_type' => $file->getClientMimeType(),
                            'file_size' => $file->getSize(),
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Rekod arahan beredar disimpan.',
                'data' => $record->load(['oyds.media', 'sections']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal menyimpan arahan beredar.',
            ], 422);
        }
    }

    public function update(Request $request, ArahanBeredar $arahanBeredar): JsonResponse
    {
        $request->validate([
            'location' => ['required', 'string'],
            'incident_date' => ['required', 'date'],
            'sections' => ['required', 'array', 'min:1'],
            'sections.*' => ['required', 'integer', 'exists:ref_arahan_beredar_sections,id'],
            'oyds' => ['required', 'json'],
        ]);

        $user = $request->user();
        $staff = $user ? Staff::query()->where('user_id', $user->id)->first() : null;
        $oydsList = json_decode($request->input('oyds'), true) ?? [];

        DB::beginTransaction();

        try {
            $arahanBeredar->update([
                'staff_id' => $arahanBeredar->staff_id ?: $staff?->id,
                'created_by_user_id' => $arahanBeredar->created_by_user_id ?: $user?->id,
                'email' => $request->input('email') ?: ($user?->email),
                'location' => $request->input('location'),
                'incident_date' => $request->input('incident_date'),
                'other_section' => $request->input('other_section'),
                'notes' => $request->input('notes'),
                'status' => $request->input('status', $arahanBeredar->status ?? 'draf'),
            ]);

            $arahanBeredar->sections()->sync($request->input('sections', []));

            $existingOyds = $arahanBeredar->oyds()->with('media')->get()->keyBy('id');
            $incomingIds = collect($oydsList)->pluck('id')->filter()->map(fn ($id) => (int) $id)->all();

            foreach ($existingOyds as $oyds) {
                if (!in_array($oyds->id, $incomingIds, true)) {
                    foreach ($oyds->media as $media) {
                        $media->delete();
                    }
                    $oyds->delete();
                }
            }

            foreach ($oydsList as $index => $oyds) {
                $oydsId = $oyds['id'] ?? null;
                if ($oydsId && $existingOyds->has((int) $oydsId)) {
                    $oydsModel = $existingOyds->get((int) $oydsId);
                    $oydsModel->update([
                        'name' => $oyds['name'] ?? '',
                        'ic_number' => $oyds['ic_number'] ?? null,
                        'phone' => $oyds['phone'] ?? null,
                        'address' => $oyds['address'] ?? null,
                    ]);
                } else {
                    $oydsModel = ArahanBeredarOyd::create([
                        'arahan_beredar_id' => $arahanBeredar->id,
                        'name' => $oyds['name'] ?? '',
                        'ic_number' => $oyds['ic_number'] ?? null,
                        'phone' => $oyds['phone'] ?? null,
                        'address' => $oyds['address'] ?? null,
                    ]);
                }

                $files = $request->file("oyds_photos.$index", []);
                if ($files) {
                    foreach ($files as $file) {
                        $storedName = CommonService::handleStoreFile($file, 'arahan-beredar/oyds');
                        if (!$storedName) {
                            continue;
                        }
                        ArahanBeredarOydMedia::create([
                            'oyds_id' => $oydsModel->id,
                            'file_name' => $file->getClientOriginalName(),
                            'file_path' => "arahan-beredar/oyds/{$storedName}",
                            'file_type' => $file->getClientMimeType(),
                            'file_size' => $file->getSize(),
                        ]);
                    }
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Rekod arahan beredar dikemaskini.',
                'data' => $arahanBeredar->load(['oyds.media', 'sections', 'staff:id,name']),
            ]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Gagal mengemaskini arahan beredar.',
            ], 422);
        }
    }

    public function downloadOydMedia(Request $request, ArahanBeredar $arahanBeredar, ArahanBeredarOydMedia $media)
    {
        $oyd = ArahanBeredarOyd::find($media->oyds_id);

        if (! $oyd || (int) $oyd->arahan_beredar_id !== (int) $arahanBeredar->id) {
            abort(404);
        }

        if (! $media->file_path) {
            abort(404, 'Fail lampiran tidak dijumpai.');
        }

        if (! Storage::disk('public')->exists($media->file_path)) {
            abort(404, 'Fail lampiran tidak ditemui pada storan.');
        }

        return Storage::disk('public')->download($media->file_path, $media->file_name);
    }

    public function restore(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (! $this->isSystemUser($user)) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $record = ArahanBeredar::withTrashed()
            ->with(['oyds' => fn ($query) => $query->withTrashed()->with(['media' => fn ($mediaQuery) => $mediaQuery->withTrashed()])])
            ->find($id);

        if (! $record || ! $record->trashed()) {
            return response()->json(['message' => 'Rekod arahan beredar dipadam tidak dijumpai.'], 404);
        }

        $record->restore();
        $record->oyds()->onlyTrashed()->restore();
        foreach ($record->oyds()->withTrashed()->get() as $oyd) {
            $oyd->media()->onlyTrashed()->restore();
        }

        $fresh = ArahanBeredar::query()
            ->with(['oyds.media', 'sections', 'staff:id,name'])
            ->findOrFail($id);

        return response()->json([
            'message' => 'Rekod arahan beredar berjaya dipulihkan.',
            'data' => array_merge($fresh->toArray(), [
                'is_deleted' => false,
                'can_restore' => false,
            ]),
        ]);
    }
}
