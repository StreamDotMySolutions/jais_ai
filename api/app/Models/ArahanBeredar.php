<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArahanBeredar extends Model
{
    use HasFactory, SoftDeletes;

    protected $guarded = ['id'];

    public function oyds(): HasMany
    {
        return $this->hasMany(ArahanBeredarOyd::class);
    }

    public function staff(): BelongsTo
    {
        return $this->belongsTo(Staff::class);
    }

    public function creator(): BelongsTo
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

    public function sections(): BelongsToMany
    {
        return $this->belongsToMany(
            RefArahanBeredarSection::class,
            'arahan_beredar_section_items',
            'arahan_beredar_id',
            'section_id'
        );
    }
}
