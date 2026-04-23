<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ComplaintPoliceReportMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'complaint_police_report_media';
    protected $guarded = ['id'];

    public function policeReport()
    {
        return $this->belongsTo(ComplaintPoliceReport::class, 'complaint_police_report_id');
    }
}

