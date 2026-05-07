<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseInspectionFormMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'case_inspection_form_media';

    protected $guarded = ['id'];

    public function inspectionForm()
    {
        return $this->belongsTo(CaseInspectionForm::class, 'case_inspection_form_id');
    }
}
