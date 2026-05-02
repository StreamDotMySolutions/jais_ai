<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseOyd extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function case()
    {
        return $this->belongsTo(CaseRecord::class, 'case_id');
    }

    public function media()
    {
        return $this->hasMany(CaseOydMedia::class, 'case_oyd_id');
    }
}
