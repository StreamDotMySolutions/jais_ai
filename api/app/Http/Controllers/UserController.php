<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 10;
        }
        $keyword = trim((string) $request->query('keyword', ''));

        $query = User::query()
            ->with(['roles', 'district:id,name'])
            ->orderBy('name');

        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery->where('name', 'like', '%' . $keyword . '%')
                    ->orWhere('email', 'like', '%' . $keyword . '%');
            });
        }

        $users = $query->paginate($perPage);

        return response()->json([
            'message' => 'User list',
            'data' => $users->items(),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'per_page' => $users->perPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    public function store(Request $request)
    {
        $actor = $request->user();
        if (! $actor || ! $actor->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255|unique:users,email',
            'password' => 'required|string|min:6',
            'role' => ['nullable', 'string', Rule::exists(config('permission.table_names.roles'), 'name')],
            'status' => 'nullable|boolean',
            'office_type' => 'nullable|string|in:hq,daerah',
            'district_id' => 'nullable|exists:districts,id',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'status' => $validated['status'] ?? 1,
            'office_type' => $validated['office_type'] ?? null,
            'district_id' => $validated['district_id'] ?? null,
        ]);

        if (! empty($validated['role'])) {
            $user->assignRole($validated['role']);
        }

        return response()->json([
            'message' => 'User created',
            'data' => $user->load(['roles', 'district:id,name']),
        ]);
    }

    public function update(Request $request, User $user)
    {
        $actor = $request->user();
        if (! $actor || ! $actor->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:6',
            'role' => ['nullable', 'string', Rule::exists(config('permission.table_names.roles'), 'name')],
            'status' => 'nullable|boolean',
            'office_type' => 'nullable|string|in:hq,daerah',
            'district_id' => 'nullable|exists:districts,id',
        ]);

        $payload = [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'status' => $validated['status'] ?? $user->status,
            'office_type' => $validated['office_type'] ?? null,
            'district_id' => $validated['district_id'] ?? null,
        ];

        if (! empty($validated['password'])) {
            $payload['password'] = Hash::make($validated['password']);
        }

        $user->update($payload);

        if (array_key_exists('role', $validated) && ! empty($validated['role'])) {
            $user->syncRoles([$validated['role']]);
        }

        return response()->json([
            'message' => 'User updated',
            'data' => $user->load(['roles', 'district:id,name']),
        ]);
    }
}
