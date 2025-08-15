<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DocumentJob extends Model
{
    protected $table = 'document_jobs';

    protected $guarded = ['id'];
    // protected $fillable = [
    //     'file_path',
    //     'status',
    //     'result'
    // ];

    public function apiLog()
    {
        // Class, fk dalam ApiLog , pk dalam ApiLog
        return $this->belongsTo(ApiLog::class, 'api_log_id', 'id');
    }
}
