<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

use Illuminate\Support\Facades\Hash;
use App\Models\User;

use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class UserSeeder extends Seeder
{
    public function run()
    {
        // Roles
        Role::create(['name' => 'system']);
        Role::create(['name' => 'admin']);
        Role::create(['name' => 'user']);

        // system ########################################### start
        #User::truncate();
        $user = User::create([
            'name' => 'System Administrator',
            'email' => 'system@local',
            'password' => Hash::make('password'),
        ]);
        $user->markEmailAsVerified();

        $user->assignRole('system');
        unset($user);
        // system ########################################### end

        // admin ########################################### start
        $user = User::create([
            'name' => 'Administrator',
            'email' => 'admin@local',
            'password' => Hash::make('password'),
            ]);
        $user->markEmailAsVerified();
        $user->assignRole('admin');
        unset($user);
        // admin ########################################### end


        // user ########################################### start
        $user = User::create([
            'name' => 'User',
            'email' => 'user@local',
            'password' => Hash::make('password'),
        ]);
        $user->markEmailAsVerified();

        $user->assignRole('user');
        unset($user);
        // user ########################################### end

    }
}
