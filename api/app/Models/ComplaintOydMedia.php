<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplaintOydMedia extends Model
{
    use HasFactory;

    protected $table = 'complaint_oyd_media';
    protected $guarded = ['id'];

    public function oyd()
    {
        return $this->belongsTo(ComplaintOyd::class, 'complaint_oyd_id');
    }
}

