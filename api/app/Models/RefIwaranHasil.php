<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RefIwaranHasil extends Model
{
    use HasFactory;

    protected $table = 'ref_iwaran_hasil';
    protected $guarded = ['id'];
}
