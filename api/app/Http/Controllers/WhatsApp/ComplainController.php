<?php

namespace App\Http\Controllers\User; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ComplaintModel;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        // Create the token
        $token = Str::random(60);

        $apiToken = ApiToken::create([
            'user_id' => auth()->id(),
            'name'    => $request->name,
            'key'     => $token,
        ]);

        return response()->json([
            'name' => $request->input('name'),
            'token' => $token
        ]);
    }

   

}
