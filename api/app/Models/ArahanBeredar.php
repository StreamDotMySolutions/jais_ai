<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArahanBeredar extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function oyds()
    {
        return $this->hasMany(ArahanBeredarOyd::class);
    }

    public function staff()
    {
        return $this->belongsTo(Staff::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function sections()
    {
        return $this->belongsToMany(
            RefArahanBeredarSection::class,
            'arahan_beredar_section_items',
            'arahan_beredar_id',
            'section_id'
        );
    }
}
