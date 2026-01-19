<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefArahanBeredarSection extends Model
{
    use HasFactory;

    protected $table = 'ref_arahan_beredar_sections';
    protected $guarded = ['id'];
}
