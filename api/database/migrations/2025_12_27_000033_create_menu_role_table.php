<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sys_menu_role', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained('sys_menus')->cascadeOnDelete();
            $table->foreignId('role_id')->constrained('sys_roles')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['menu_id', 'role_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sys_menu_role');
    }
};
