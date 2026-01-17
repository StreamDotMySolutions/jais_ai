<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected $casts = [
        'start_at' => 'datetime:Y-m-d H:i',
        'end_at' => 'datetime:Y-m-d H:i',
    ];

    public function complaint()
    {
        return $this->belongsTo(Complaint::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }
}
