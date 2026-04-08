<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ComplaintActionUpdate extends Model
{
    protected $guarded = ['id'];

    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }
}
