<?php
namespace App\Http\Controllers\Admin; 

use App\Models\Complaint;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use App\Http\Controllers\Controller; 



class ComplaintController extends Controller
{
    public function index()
    {
        $complaints = Complaint::query()
                        ->orderBy('id','DESC')
                        ->paginate(100)
                        ->withQueryString();

        return response()->json([
            'message' => 'Registered complaints',
            'complaints' => $complaints
        ]);
    }

    public function show(Complaint $complaint)
    {
        return response()->json([
                'message' => "Complaint data for id {$complaint->id}",
                'complaint' => $complaint
        ]);
    }

  
}
