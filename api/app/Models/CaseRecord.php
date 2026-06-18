<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class CaseRecord extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'cases';

    protected $guarded = ['id'];

    protected $casts = [
        'directive_at' => 'datetime:Y-m-d H:i',
        'handover_at' => 'datetime:Y-m-d H:i',
        'action_datetime' => 'datetime:Y-m-d H:i',
        'statement_datetime' => 'datetime:Y-m-d H:i',
        'opened_at' => 'datetime:Y-m-d H:i',
        'closed_at' => 'datetime:Y-m-d H:i',
        'laporan_tindakan_auto_emailed_at' => 'datetime:Y-m-d H:i',
        'court_date' => 'date:Y-m-d',
        'charge_recommendations' => 'array',
    ];

    protected function serializeDate(\DateTimeInterface $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }

    public function complaints(): BelongsToMany
    {
        return $this->belongsToMany(Complaint::class, 'case_complaint_links', 'case_id', 'complaint_id')
            ->withPivot(['id', 'is_primary', 'notes'])
            ->withTimestamps();
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by_user_id');
    }

    public function district(): BelongsTo
    {
        return $this->belongsTo(District::class);
    }

    public function supervisorStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'supervisor_staff_id');
    }

    public function directiveStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'directive_staff_id');
    }

    public function handoverStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'handover_staff_id');
    }

    public function arrestStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'arrest_staff_id');
    }

    public function prosecutorStaff(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'prosecutor_staff_id');
    }

    public function oyds()
    {
        return $this->hasMany(CaseOyd::class, 'case_id')->orderBy('id');
    }

    public function seizureItems()
    {
        return $this->hasMany(CaseSeizureItem::class, 'case_id')->orderBy('id');
    }

    public function policeReports()
    {
        return $this->hasMany(CasePoliceReport::class, 'case_id')->orderBy('id');
    }

    public function inspectionForms()
    {
        return $this->hasMany(CaseInspectionForm::class, 'case_id')->orderBy('id');
    }
}
