<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ArahanBeredarOydMedia extends Model
{
    use HasFactory;

    protected $table = 'arahan_beredar_oyds_media';
    protected $guarded = ['id'];
}
