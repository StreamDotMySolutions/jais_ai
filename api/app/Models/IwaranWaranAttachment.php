<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IwaranWaranAttachment extends Model
{
    use HasFactory;

    protected $table = 'iwaran_waran_attachments';
    protected $guarded = ['id'];

    public function waran()
    {
        return $this->belongsTo(IwaranWarrant::class, 'iwaran_waran_id');
    }
}

