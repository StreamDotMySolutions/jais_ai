<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class IwaranWaranAttachment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'iwaran_waran_attachments';
    protected $guarded = ['id'];

    public function waran()
    {
        return $this->belongsTo(IwaranWarrant::class, 'iwaran_waran_id');
    }
}
