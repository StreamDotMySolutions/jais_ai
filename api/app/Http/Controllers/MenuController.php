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
            ->get(['id', 'label', 'path', 'icon']);

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

        $menus = Menu::query()
            ->with('roles:id,name')
            ->orderBy('sort_order')
            ->get();

        return response()->json([
            'message' => 'Menu list',
            'data' => $menus,
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
            'path' => 'required|string|max:255|unique:menus,path',
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:' . config('permission.table_names.roles') . ',id',
        ]);

        $menu = Menu::create([
            'label' => $validated['label'],
            'path' => $validated['path'],
            'icon' => $validated['icon'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
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
            'path' => 'required|string|max:255|unique:menus,path,' . $menu->id,
            'icon' => 'nullable|string|max:255',
            'sort_order' => 'nullable|integer|min:0',
            'is_active' => 'nullable|boolean',
            'role_ids' => 'nullable|array',
            'role_ids.*' => 'integer|exists:' . config('permission.table_names.roles') . ',id',
        ]);

        $menu->update([
            'label' => $validated['label'],
            'path' => $validated['path'],
            'icon' => $validated['icon'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'] ?? true,
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
            'order' => 'required|array',
            'order.*' => 'integer|exists:sys_menus,id',
        ]);

        \DB::transaction(function () use ($validated) {
            foreach ($validated['order'] as $index => $menuId) {
                Menu::where('id', $menuId)->update(['sort_order' => $index + 1]);
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
}
