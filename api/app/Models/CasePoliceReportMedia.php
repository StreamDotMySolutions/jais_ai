<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CasePoliceReportMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'case_police_report_media';
    protected $guarded = ['id'];

    public function policeReport()
    {
        return $this->belongsTo(CasePoliceReport::class, 'case_police_report_id');
    }
}
