<?php

namespace App\Http\Controllers;

use App\Models\Menu;
use Illuminate\Http\Request;

class MenuController extends Controller
{
    public function myMenus(Request $request)
    {
        $user = $request->user();
        if (! $user) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $roleIds = $user->roles->pluck('id');
        $rolesTable = config('permission.table_names.roles');

        $menus = Menu::query()
            ->where('is_active', true)
            ->whereHas('roles', function ($query) use ($roleIds) {
                $rolesTable = config('permission.table_names.roles');
                $query->whereIn("{$rolesTable}.id", $roleIds);
            })
            ->orderBy('sort_order')
            ->get(['id', 'parent_id', 'label', 'path', 'icon']);

        return response()->json([
            'message' => 'Menu list',
            'data' => $menus,
        ]);
    }

    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0 || $perPage > 1000) {
            $perPage = 10;
        }
        $keyword = trim((string) $request->query('keyword', ''));

        $query = Menu::query()
            ->with('roles:id,name', 'parent:id,label')
            ->orderBy('sort_order');

        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery
                    ->where('label', 'like', '%' . $keyword . '%')
                    ->orWhere('path', 'like', '%' . $keyword . '%');
            });
        }

        $menus = $query->paginate($perPage);

        return response()->json([
            'message' => 'Menu list',
            'data' => $menus->items(),
            'meta' => [
                'current_page' => $menus->currentPage(),
                'last_page' => $menus->lastPage(),
                'per_page' => $menus->perPage(),
                'total' => $menus->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'path' => 'required|string|max:255|unique:' . config('permission.table_names.menus', 'sys_menus') . ',path',
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'parent_id' => 'nullable|integer|exists:' . config('permission.table_names.menus', 'sys_menus') . ',id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:' . config('permission.table_names.roles') . ',id',
        ]);

        $menu = Menu::create([
            'label' => $validated['label'],
            'path' => $validated['path'],
            'icon' => $validated['icon'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'parent_id' => $validated['parent_id'] ?? null,
        ]);

        if (! empty($validated['role_ids'])) {
            $menu->roles()->sync($validated['role_ids']);
        }

        return response()->json([
            'message' => 'Menu created',
            'data' => $menu->load('roles:id,name'),
        ]);
    }

    public function update(Request $request, Menu $menu)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'label' => 'required|string|max:255',
            'path' => 'required|string|max:255|unique:' . config('permission.table_names.menus', 'sys_menus') . ',path,' . $menu->id,
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'parent_id' => 'nullable|integer|exists:' . config('permission.table_names.menus', 'sys_menus') . ',id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:' . config('permission.table_names.roles') . ',id',
        ]);

        $resolvedParentId = isset($validated['parent_id']) ? (int) $validated['parent_id'] : null;
        if ($resolvedParentId === 0) {
            $resolvedParentId = null;
        }

        if ($resolvedParentId !== null && $resolvedParentId === (int) $menu->id) {
            return response()->json(['message' => 'Menu tidak boleh menjadi parent kepada dirinya sendiri.'], 422);
        }

        if ($resolvedParentId !== null) {
            $parentMap = Menu::query()->pluck('parent_id', 'id')->map(fn ($value) => $value ? (int) $value : null)->all();
            $parentMap[(int) $menu->id] = $resolvedParentId;
            if ($this->wouldCreateCycle((int) $menu->id, $parentMap)) {
                return response()->json(['message' => 'Struktur parent-child tidak sah kerana menghasilkan kitaran menu.'], 422);
            }
        }

        $menu->update([
            'label' => $validated['label'],
            'path' => $validated['path'],
            'icon' => $validated['icon'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
            'parent_id' => $resolvedParentId,
        ]);

        if (array_key_exists('role_ids', $validated)) {
            $menu->roles()->sync($validated['role_ids'] ?? []);
        }

        return response()->json([
            'message' => 'Menu updated',
            'data' => $menu->load('roles:id,name'),
        ]);
    }

    public function destroy(Request $request, Menu $menu)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $menu->delete();

        return response()->json([
            'message' => 'Menu deleted',
        ]);
    }

    public function reorder(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|integer|exists:' . config('permission.table_names.menus', 'sys_menus') . ',id',
            'items.*.parent_id' => 'nullable|integer|exists:' . config('permission.table_names.menus', 'sys_menus') . ',id',
            'items.*.sort_order' => 'required|integer|min:1',
        ]);

        $items = collect($validated['items'])
            ->map(function ($item) {
                $parentId = $item['parent_id'] ?? null;
                if ((int) $parentId === 0) {
                    $parentId = null;
                }

                return [
                    'id' => (int) $item['id'],
                    'parent_id' => $parentId !== null ? (int) $parentId : null,
                    'sort_order' => (int) $item['sort_order'],
                ];
            })
            ->values();

        $duplicateIds = $items->pluck('id')->duplicates();
        if ($duplicateIds->isNotEmpty()) {
            return response()->json(['message' => 'Payload susunan menu mengandungi item berganda.'], 422);
        }

        $parentMap = Menu::query()
            ->pluck('parent_id', 'id')
            ->map(fn ($value) => $value ? (int) $value : null)
            ->all();

        foreach ($items as $item) {
            if ($item['parent_id'] !== null && $item['parent_id'] === $item['id']) {
                return response()->json(['message' => 'Menu tidak boleh menjadi parent kepada dirinya sendiri.'], 422);
            }

            $parentMap[$item['id']] = $item['parent_id'];
        }

        foreach ($items as $item) {
            if ($this->wouldCreateCycle($item['id'], $parentMap)) {
                return response()->json(['message' => 'Struktur parent-child tidak sah kerana menghasilkan kitaran menu.'], 422);
            }
        }

        \DB::transaction(function () use ($items) {
            foreach ($items as $item) {
                Menu::where('id', $item['id'])->update([
                    'parent_id' => $item['parent_id'],
                    'sort_order' => $item['sort_order'],
                ]);
            }
        });

        return response()->json([
            'message' => 'Menu order updated',
        ]);
    }

    public function bulkRoles(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'menu_ids' => 'required|array',
            'menu_ids.*' => 'integer|exists:sys_menus,id',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:' . config('permission.table_names.roles') . ',id',
        ]);

        $menuIds = $validated['menu_ids'];
        $roleIds = $validated['role_ids'] ?? [];

        \DB::transaction(function () use ($menuIds, $roleIds) {
            Menu::whereIn('id', $menuIds)->get()->each(function ($menu) use ($roleIds) {
                $menu->roles()->sync($roleIds);
            });
        });

        return response()->json([
            'message' => 'Bulk roles updated',
        ]);
    }

    private function wouldCreateCycle(int $menuId, array $parentMap): bool
    {
        $visited = [];
        $current = $parentMap[$menuId] ?? null;

        while ($current !== null) {
            if ($current === $menuId) {
                return true;
            }

            if (isset($visited[$current])) {
                return true;
            }

            $visited[$current] = true;
            $current = $parentMap[$current] ?? null;
        }

        return false;
    }
}
