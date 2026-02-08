<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    protected $table = 'sys_audit_logs';
    protected $guarded = ['id'];

    protected $casts = [
        'changed_keys' => 'array',
        'old_values' => 'array',
        'new_values' => 'array',
    ];
}
