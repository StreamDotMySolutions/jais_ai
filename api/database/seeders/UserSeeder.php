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
        $guard = 'web';
        Role::firstOrCreate(['name' => 'system', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'pegawai', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'pegawai_hq', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'pegawai_daerah', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'user', 'guard_name' => $guard]);
        Role::firstOrCreate(['name' => 'awam', 'guard_name' => $guard]);

        // system ########################################### start
        #User::truncate();
        $user = User::updateOrCreate(
            ['email' => 'system@local'],
            [
                'name' => 'System Administrator',
                'office_type' => 'hq',
                'password' => Hash::make('password'),
            ]
        );
        $user->markEmailAsVerified();
        $user->syncRoles(['system']);
        unset($user);
        // system ########################################### end

        // admin ########################################### start
        $user = User::updateOrCreate(
            ['email' => 'admin@local'],
            [
                'name' => 'Administrator',
                'office_type' => 'hq',
                'password' => Hash::make('password'),
            ]
        );
        $user->markEmailAsVerified();
        $user->syncRoles(['admin']);
        unset($user);
        // admin ########################################### end

        // pegawai ########################################### start
        $user = User::updateOrCreate(
            ['email' => 'pegawai@local'],
            [
                'name' => 'Pegawai HQ',
                'office_type' => 'hq',
                'password' => Hash::make('password'),
            ]
        );
        $user->markEmailAsVerified();
        $user->syncRoles(['pegawai_hq']);
        unset($user);
        // pegawai ########################################### end


        // user ########################################### start
        $user = User::updateOrCreate(
            ['email' => 'user@local'],
            [
                'name' => 'User',
                'password' => Hash::make('password'),
            ]
        );
        $user->markEmailAsVerified();
        $user->syncRoles(['user']);
        unset($user);
        // user ########################################### end

    }
}
