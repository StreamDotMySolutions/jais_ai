<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ComplaintOyd extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }

    public function media()
    {
        return $this->hasMany(ComplaintOydMedia::class, 'complaint_oyd_id');
    }
}
