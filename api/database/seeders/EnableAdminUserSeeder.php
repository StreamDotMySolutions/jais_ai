<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\User;

class EnableAdminUserSeeder extends Seeder
{
    public function run(): void
    {
        $user = User::where('email', 'admin@local')->first();

        if ($user) {
            $user->update(['status' => 1]);
            $this->command->info('User admin@local has been enabled.');
        } else {
            $this->command->warn('User admin@local not found.');
        }
    }
}
