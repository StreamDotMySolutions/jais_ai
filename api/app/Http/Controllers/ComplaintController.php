<?php

namespace App\Http\Controllers; 

use App\Http\Controllers\Controller; 
use Illuminate\Http\Request;
use App\Models\Complaint;
use App\Models\District;
use Illuminate\Support\Str;


class ComplaintController extends Controller
{

    public function store(Request $request)
    {
        $request->validate([
            'complainant_name' => 'required|string|max:255',
            'identification_number' => 'required|string|max:255',
            'contact_number' => 'required|string|max:255',
            'address' => 'required|string|max:1000',
            'district_id' => 'nullable|exists:districts,id',
            'summary' => 'required|string|max:10000',
        ]);

        $now = now();
        $year = (int) $now->format('Y');
        $district = $request->district_id ? District::find($request->district_id) : null;

        // Store the complaint
        $complaint = Complaint::create([        
            'reference_no' => $this->generateReferenceNo($year),
            'complaint_year' => $year,
            'complaint_date' => $now->toDateString(),
            'complaint_time' => $now->format('H:i:s'),
            'complainant_name' => $request->complainant_name,
            'identification_number'    => $request->identification_number,
            'contact_number'    => $request->contact_number,
            'address'    => $request->address,
            'district_id' => $district?->id,
            'district_name' => $district?->name,
            'summary'    => $request->summary,
            'channel' => $request->channel ?? 'web',
            'current_stage' => 'baru',
            'submitted_at' => $now,
        ]);

        return response()->json([
            'message' => 'Complaint Submitted',
        ]);
    }

    private function generateReferenceNo(int $year): string
    {
        $prefix = "JAIS-{$year}-";

        do {
            $referenceNo = $prefix . Str::upper(Str::random(6));
        } while (Complaint::where('reference_no', $referenceNo)->exists());

        return $referenceNo;
    }
}
