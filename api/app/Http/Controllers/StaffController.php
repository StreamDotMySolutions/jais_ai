<?php

namespace App\Http\Controllers;

use App\Models\Staff;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;
use Illuminate\Validation\Rule;

class StaffController extends Controller
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

        $query = Staff::query()
            ->with(['user:id,name,email', 'user.roles', 'district:id,name'])
            ->orderBy('name');

        if ($keyword !== '') {
            $query->where(function ($subQuery) use ($keyword) {
                $subQuery->where('name', 'like', '%' . $keyword . '%')
                    ->orWhere('staff_id', 'like', '%' . $keyword . '%')
                    ->orWhere('ic_number', 'like', '%' . $keyword . '%');
            });
        }

        $staff = $query->paginate($perPage);

        return response()->json([
            'message' => 'Staff list',
            'data' => $staff->items(),
            'meta' => [
                'current_page' => $staff->currentPage(),
                'last_page' => $staff->lastPage(),
                'per_page' => $staff->perPage(),
                'total' => $staff->total(),
            ],
        ]);
    }

    public function options(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $query = Staff::query()
            ->where('is_active', true)
            ->orderBy('name');

        $officeType = trim((string) $request->query('office_type', ''));
        if (in_array($officeType, ['hq', 'daerah'], true)) {
            $query->where('office_type', $officeType);
        }

        $sameDistrictOfStaffId = (int) $request->query('same_district_of_staff_id', 0);
        if ($sameDistrictOfStaffId > 0) {
            $districtId = Staff::query()->where('id', $sameDistrictOfStaffId)->value('district_id');
            if ($districtId) {
                $query->where('district_id', $districtId);
            } else {
                $query->whereRaw('1 = 0');
            }
        }

        $staff = $query->get(['id', 'name', 'staff_id', 'office_type', 'district_id']);

        return response()->json([
            'message' => 'Staff options',
            'data' => $staff,
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'ic_number' => 'nullable|string|max:255',
            'staff_id' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:2000',
            'office_address' => 'nullable|string|max:2000',
            'marital_status' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:50',
            'department' => 'nullable|string|max:255',
            'department_code' => 'nullable|string|max:100',
            'office_type' => 'nullable|string|in:hq,daerah',
            'district_id' => 'nullable|exists:districts,id',
            'email' => 'nullable|string|max:255|unique:users,email',
            'password' => 'nullable|string|min:6',
            'role' => ['nullable', 'string', Rule::exists(config('permission.table_names.roles'), 'name')],
        ]);

        if (! empty($validated['email']) && ! empty($validated['password']) && empty($validated['role'])) {
            return response()->json(['message' => 'Role diperlukan untuk akaun pengguna.'], 422);
        }

        $staff = DB::transaction(function () use ($validated) {
            $userId = null;
            if (! empty($validated['email']) && ! empty($validated['password'])) {
                $user = User::create([
                    'name' => $validated['name'],
                    'email' => $validated['email'],
                    'password' => Hash::make($validated['password']),
                ]);
                if (! empty($validated['role'])) {
                    $user->assignRole($validated['role']);
                }
                $userId = $user->id;
            }

            return Staff::create([
                'user_id' => $userId,
                'name' => $validated['name'],
                'ic_number' => $validated['ic_number'] ?? null,
                'staff_id' => $validated['staff_id'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'office_address' => $validated['office_address'] ?? null,
                'marital_status' => $validated['marital_status'] ?? null,
                'position' => $validated['position'] ?? null,
                'grade' => $validated['grade'] ?? null,
                'department' => $validated['department'] ?? null,
                'department_code' => $validated['department_code'] ?? null,
                'office_type' => $validated['office_type'] ?? null,
                'district_id' => $validated['district_id'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Staff created',
            'data' => $staff->load(['user:id,name,email', 'district:id,name']),
        ]);
    }

    public function update(Request $request, Staff $staff)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'ic_number' => 'nullable|string|max:255',
            'staff_id' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:255',
            'address' => 'nullable|string|max:2000',
            'office_address' => 'nullable|string|max:2000',
            'marital_status' => 'nullable|string|max:255',
            'position' => 'nullable|string|max:255',
            'grade' => 'nullable|string|max:50',
            'department' => 'nullable|string|max:255',
            'department_code' => 'nullable|string|max:100',
            'office_type' => 'nullable|string|in:hq,daerah',
            'district_id' => 'nullable|exists:districts,id',
            'email' => 'nullable|string|max:255|unique:users,email,' . ($staff->user_id ?? 'NULL'),
            'password' => 'nullable|string|min:6',
            'role' => ['nullable', 'string', Rule::exists(config('permission.table_names.roles'), 'name')],
        ]);

        if (! empty($validated['email']) && ! empty($validated['password']) && empty($validated['role'])) {
            return response()->json(['message' => 'Role diperlukan untuk akaun pengguna.'], 422);
        }

        DB::transaction(function () use ($staff, $validated) {
            if (! empty($validated['email'])) {
                if ($staff->user_id) {
                    $staff->user()->update([
                        'email' => $validated['email'],
                        'name' => $validated['name'],
                    ]);
                    if (! empty($validated['password'])) {
                        $staff->user()->update([
                            'password' => Hash::make($validated['password']),
                        ]);
                    }
                    if (! empty($validated['role'])) {
                        $staff->user->syncRoles([$validated['role']]);
                    }
                } elseif (! empty($validated['password'])) {
                    $user = User::create([
                        'name' => $validated['name'],
                        'email' => $validated['email'],
                        'password' => Hash::make($validated['password']),
                    ]);
                    if (! empty($validated['role'])) {
                        $user->assignRole($validated['role']);
                    }
                    $staff->user_id = $user->id;
                }
            }

            $staff->update([
                'name' => $validated['name'],
                'ic_number' => $validated['ic_number'] ?? null,
                'staff_id' => $validated['staff_id'] ?? null,
                'phone' => $validated['phone'] ?? null,
                'address' => $validated['address'] ?? null,
                'office_address' => $validated['office_address'] ?? null,
                'marital_status' => $validated['marital_status'] ?? null,
                'position' => $validated['position'] ?? null,
                'grade' => $validated['grade'] ?? null,
                'department' => $validated['department'] ?? null,
                'department_code' => $validated['department_code'] ?? null,
                'office_type' => $validated['office_type'] ?? null,
                'district_id' => $validated['district_id'] ?? null,
            ]);
        });

        return response()->json([
            'message' => 'Staff updated',
            'data' => $staff->load(['user:id,name,email', 'district:id,name']),
        ]);
    }
}
