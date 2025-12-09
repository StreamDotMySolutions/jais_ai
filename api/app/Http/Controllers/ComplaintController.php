<?php

namespace App\Http\Controllers; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Complaint;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'occupation' => 'required|string|max:255',
            'identification_number' => 'required|string|max:255',
            'contact_number' => 'required|integer|max:255',
            'address' => 'required|string|max:1000',
            'contents' => 'required|string|max:10000',
        ]);

        // Store the complaint
        $complaint = Complaint::create([        
            'name'    => $request->name,
            'occupation'    => $request->occupation,
            'identification_number'    => $request->identification_number,
            'contact_number'    => $request->contact_number,
            'address'    => $request->address,
            'contents'    => $request->contents,
        ]);

        return response()->json([
            'message' => 'Complaint Submitted',
        ]);
    }
}
