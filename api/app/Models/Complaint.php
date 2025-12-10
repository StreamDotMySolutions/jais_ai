<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Complaint extends Model
{
    use HasFactory;
    protected $guarded = ['id'];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i:s', // Format as datetime
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];


    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
