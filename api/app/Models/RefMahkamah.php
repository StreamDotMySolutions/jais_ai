<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefMahkamah extends Model
{
    use HasFactory;

    protected $table = 'ref_mahkamah';
    protected $guarded = ['id'];
}
