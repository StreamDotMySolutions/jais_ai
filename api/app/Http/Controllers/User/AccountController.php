<?php
namespace App\Http\Controllers\User; 

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller; 
use App\Http\Requests\Account\UpdateRequest;
use App\Http\Requests\Account\ChangePasswordRequest;

class AccountController extends Controller
{
    public function show(Request $request)
    {
        $user = $request->user(); // Get the authenticated user
        $user->loadMissing([
            'staff:id,user_id,staff_id,name,district_id',
            'staff.district:id,name',
            'roles:id,name',
        ]);
    
        // Retrieve the user's role using Spatie
        $role = $user->roles->pluck('name')->first();
    
        return response()->json([
            'message' => 'Logged user info',
            'user' => $user,
            'role' => $role,
        ]);

    }

    public function update(UpdateRequest $request)
    {
        $user = $request->user(); // Get the authenticated user

        // Email
        if ($request->has('email')) {
            User::where('id', $user->id)->update($request->only(['email']));
        }

        // Name
        if ($request->has('name')) {
            User::where('id', $user->id)->update($request->only(['name']));
        }

        // Response
        return response()->json([
            'message' => "Account successfully updated"
        ]);
    }

    public function changePassword(ChangePasswordRequest $request)
    {
        $user = $request->user(); // Get the authenticated user

        if ($request->has('password')) {
            // If a password is provided, create a user with the provided password.
            $password = Hash::make($request->input('password'));
            User::where('id', $user->id)->update(['password' => $password]);
        } 

        // Response
        return response()->json([
            'message' => "Password successfully updated"
        ]);
    }
}
