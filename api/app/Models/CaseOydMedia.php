<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseOydMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'case_oyd_media';
    protected $guarded = ['id'];

    public function oyd()
    {
        return $this->belongsTo(CaseOyd::class, 'case_oyd_id');
    }
}
