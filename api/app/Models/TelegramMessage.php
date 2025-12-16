<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TelegramMessage extends Model
{
    use HasFactory;

    protected $table = 'telegram_messages';

    protected $fillable = [
        'chatid',
        'messages',
    ];

    protected $casts = [
        'chatid' => 'string',
        'messages' => 'string',
    ];
}
