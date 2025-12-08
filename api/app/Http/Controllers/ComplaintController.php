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
        // $request->validate([
        //     'name' => 'required|string|max:255',
        // ]);

        // Store the complaint
        $complaint = Complaint::create([        
            'name'    => $request->name,
        ]);

        return response()->json([
            'message' => 'Complaint Submitted',
        ]);
    }
}
