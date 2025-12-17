<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ChatMessage extends Model
{
    use HasFactory;

    protected $table = 'chat_messages';

    protected $fillable = [
        'channel',
        'chat_id',
        'role',
        'content',
    ];

    protected $casts = [
        'chat_id' => 'string',
        'content' => 'string',
    ];
}
