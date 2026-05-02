<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseSeizureItemMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'case_seizure_item_media';
    protected $guarded = ['id'];

    public function seizureItem()
    {
        return $this->belongsTo(CaseSeizureItem::class, 'case_seizure_item_id');
    }
}
