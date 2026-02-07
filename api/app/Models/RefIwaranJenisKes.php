<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefIwaranJenisKes extends Model
{
    use HasFactory;

    protected $table = 'ref_iwaran_jenis_kes';
    protected $guarded = ['id'];
}
