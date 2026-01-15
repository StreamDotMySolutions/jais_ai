<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Spatie\Permission\Models\Role;

class Menu extends Model
{
    use HasFactory;

    protected $guarded = ['id'];
    protected $table = 'sys_menus';

    public function roles()
    {
        return $this->belongsToMany(Role::class, 'sys_menu_role');
    }
}
