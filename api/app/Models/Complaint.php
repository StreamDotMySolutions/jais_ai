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
        'received_at' => 'datetime:Y-m-d H:i',
        'approver_assigned_at' => 'datetime:Y-m-d H:i',
        'approver_confirmed_at' => 'datetime:Y-m-d H:i',
        'ak_email_cc' => 'array',
        'ak_investigation_datetime' => 'datetime:Y-m-d H:i',
        'pic_assigned_at' => 'datetime:Y-m-d H:i',
    ];


    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by_user_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function approverStaff()
    {
        return $this->belongsTo(Staff::class, 'approver_staff_id');
    }

    public function picUser()
    {
        return $this->belongsTo(User::class, 'pic_user_id');
    }

    public function oyds()
    {
        return $this->hasMany(ComplaintOyd::class);
    }

    public function seizureItems()
    {
        return $this->hasMany(ComplaintSeizureItem::class);
    }

    public function appointment()
    {
        return $this->hasOne(Appointment::class);
    }
}
