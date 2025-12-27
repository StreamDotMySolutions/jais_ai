<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if (! $user || ! $user->hasAnyRole(['admin', 'system'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $roles = Role::query()
            ->orderBy('name')
            ->get(['id', 'name']);

        return response()->json([
            'message' => 'Role list',
            'data' => $roles,
        ]);
    }
}
