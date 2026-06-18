<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ArahanBeredarOydMedia extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'arahan_beredar_oyds_media';
    protected $guarded = ['id'];
}
