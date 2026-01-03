<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('sys_menus')
            ->where('path', '/app/staff')
            ->update(['label' => 'Kakitangan']);
    }

    public function down(): void
    {
        DB::table('sys_menus')
            ->where('path', '/app/staff')
            ->update(['label' => 'Staff']);
    }
};
