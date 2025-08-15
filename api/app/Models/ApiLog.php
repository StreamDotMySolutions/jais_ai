<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiLog extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    public function documentJob()
    {

        // Class, fk dalam ApiLog , pk dalam ApiLog
        return $this->hasOne(DocumentJob::class, 'api_log_id', 'id');
    }
}
