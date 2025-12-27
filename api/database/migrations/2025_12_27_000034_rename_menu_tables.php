<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('menus') && ! Schema::hasTable('sys_menus')) {
            Schema::rename('menus', 'sys_menus');
        }

        if (Schema::hasTable('menu_role') && ! Schema::hasTable('sys_menu_role')) {
            Schema::rename('menu_role', 'sys_menu_role');
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('sys_menu_role') && ! Schema::hasTable('menu_role')) {
            Schema::rename('sys_menu_role', 'menu_role');
        }

        if (Schema::hasTable('sys_menus') && ! Schema::hasTable('menus')) {
            Schema::rename('sys_menus', 'menus');
        }
    }
};
