<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentJob extends Model
{
    protected $table = 'document_jobs';

    protected $fillable = [
        'file_path',
        'status',
        'result'
    ];
}
