<?php

namespace App\Http\Controllers\User; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\ComplaintModel;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{
    public function index()
    {
        
        $complaints = Complaint::query()
                            ->orderBy('id','DESC')
                            ->paginate(10)
                            ->withQueryString();

        return response()->json([
            'message' => 'Complaints',
            'complaints' => $complaints
        ]);
    }

    
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

    // public function store(Request $request)
    // {
    //     $request->validate([
    //         'name' => 'required|string|max:255',
    //         'abilities' => 'sometimes|array',
    //     ]);

    //     // Create the token
    //     $token = $request->user()->createToken(
    //         $request->name,
    //         $request->abilities ?? ['*']
    //     );

    //     // Save the plaintext token in the `api_key` column
    //     // The token object contains 'accessToken' which is the model
    //     $token->accessToken->api_key = $token->plainTextToken;
    //     $token->accessToken->save();

    //     return response()->json([
    //         'name' => $request->input('name'),
    //         'token' => $token->plainTextToken
    //     ]);
    // }

    // public function destroy(Request $request, $id)
    // {

    //     $request->validate([
    //         //'id' => 'required',
    //         'acknowledge' => 'required|accepted',
    //     ]);

    //     $token = $request->user()->tokens()->findOrFail($id);
    //     $token->delete();

    //     return response()->json(['message' => 'Token deleted.']);
    // }

    public function destroy(Request $request, $id)
    {

        $request->validate([
            //'id' => 'required',
            'acknowledge' => 'required|accepted',
        ]);

        $token = \App\Models\ApiToken::find($id);

        if (!$token) {
            return response()->json(['message' => 'Token not found'], 404);
        }

        $token->delete();

        return response()->json(['message' => 'Token revoked successfully']);
    }


}
