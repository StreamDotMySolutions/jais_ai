<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class RoleController extends Controller
{
    private array $protectedRoles = ['system', 'admin', 'pegawai', 'user', 'awam'];

    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name', 'guard_name']);

        $counts = DB::table(config('permission.table_names.model_has_roles'))
            ->select('role_id', DB::raw('count(*) as total'))
            ->groupBy('role_id')
            ->pluck('total', 'role_id');

        $roles->transform(function ($role) use ($counts) {
            $role->users_count = (int) ($counts[$role->id] ?? 0);
            return $role;
        });

        return response()->json([
            'message' => 'Role list',
            'data' => $roles,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique(config('permission.table_names.roles'), 'name'),
            ],
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => 'web',
        ]);

        return response()->json([
            'message' => 'Role created',
            'data' => $role,
        ]);
    }

    public function update(Request $request, Role $role)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($role->name, $this->protectedRoles, true)) {
            return response()->json(['message' => 'Role ini tidak boleh diubah.'], 422);
        }

        $validated = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique(config('permission.table_names.roles'), 'name')->ignore($role->id),
            ],
        ]);

        $role->update([
            'name' => $validated['name'],
        ]);

        return response()->json([
            'message' => 'Role updated',
            'data' => $role,
        ]);
    }

    public function destroy(Request $request, Role $role)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if (in_array($role->name, $this->protectedRoles, true)) {
            return response()->json(['message' => 'Role ini tidak boleh dipadam.'], 422);
        }

        $hasUsers = DB::table(config('permission.table_names.model_has_roles'))
            ->where('role_id', $role->id)
            ->exists();

        if ($hasUsers) {
            return response()->json(['message' => 'Role masih digunakan oleh pengguna.'], 422);
        }

        $role->delete();

        return response()->json([
            'message' => 'Role deleted',
        ]);
    }
}
