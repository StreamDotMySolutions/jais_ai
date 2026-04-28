<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Complaint extends Model
{
    use HasFactory, SoftDeletes;
    protected $guarded = ['id'];

    protected $casts = [
        'created_at' => 'datetime:d-m-Y H:i:s', // Format as datetime
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'received_at' => 'datetime:Y-m-d H:i',
        'approver_assigned_at' => 'datetime:Y-m-d H:i',
        'approver_confirmed_at' => 'datetime:Y-m-d H:i',
        'ak_email_cc' => 'array',
        'aj_charge_recommendations' => 'array',
        'ak_charge_recommendations' => 'array',
        'ak_prosecution_charges' => 'array',
        'ak_investigation_datetime' => 'datetime:Y-m-d H:i',
        'pic_assigned_at' => 'datetime:Y-m-d H:i',
        'ak_event_date' => 'date:Y-m-d',
        'ak_rujuk_date' => 'date:Y-m-d',
        'ak_hearing_date' => 'date:Y-m-d',
        'consent_accepted' => 'boolean',
        'consent_accepted_at' => 'datetime:Y-m-d H:i:s',
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

    public function policeReports()
    {
        return $this->hasMany(ComplaintPoliceReport::class)->orderBy('id');
    }

    public function appointment()
    {
        return $this->hasOne(Appointment::class);
    }

    public function actionUpdates()
    {
        return $this->hasMany(ComplaintActionUpdate::class)->orderBy('sort_order')->orderBy('id');
    }

    public function attachments()
    {
        return $this->hasMany(ComplaintAttachment::class)->orderByDesc('id');
    }

    public function cases(): BelongsToMany
    {
        return $this->belongsToMany(CaseRecord::class, 'case_complaint_links', 'complaint_id', 'case_id')
            ->withPivot(['id', 'is_primary', 'notes'])
            ->withTimestamps();
    }

    public function ajDirectiveStaff()
    {
        return $this->belongsTo(Staff::class, 'aj_directive_staff_id');
    }

    public function ajHandoverStaff()
    {
        return $this->belongsTo(Staff::class, 'aj_handover_staff_id');
    }

    public function ajArrestStaff()
    {
        return $this->belongsTo(Staff::class, 'aj_arrest_staff_id');
    }

    public function ajProsecutorStaff()
    {
        return $this->belongsTo(Staff::class, 'aj_prosecutor_staff_id');
    }
}
