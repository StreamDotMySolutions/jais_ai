<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseSeizureItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function case()
    {
        return $this->belongsTo(CaseRecord::class, 'case_id');
    }

    public function media()
    {
        return $this->hasMany(CaseSeizureItemMedia::class, 'case_seizure_item_id');
    }
}
