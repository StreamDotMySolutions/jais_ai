<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArahanBeredarOyd extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'arahan_beredar_oyds';
    protected $guarded = ['id'];

    public function media()
    {
        return $this->hasMany(ArahanBeredarOydMedia::class, 'oyds_id');
    }
}
