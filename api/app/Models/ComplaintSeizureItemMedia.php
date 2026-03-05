<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ComplaintSeizureItemMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'complaint_seizure_item_media';
    protected $guarded = ['id'];

    public function seizureItem()
    {
        return $this->belongsTo(ComplaintSeizureItem::class, 'complaint_seizure_item_id');
    }
}
