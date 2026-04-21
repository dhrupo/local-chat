<?php

namespace Database\Seeders;

use App\Enums\RoleType;
use App\Models\User;
// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     *
     * @return void
     */
    public function run()
    {
        $users = [
            [
                'name' => 'Dhrupo Admin',
                'email' => 'admin@localchat.test',
                'role' => RoleType::ADMIN->value,
            ],
            [
                'name' => 'Aisha Khan',
                'email' => 'aisha@localchat.test',
                'role' => RoleType::USER->value,
            ],
            [
                'name' => 'Nafis Rahman',
                'email' => 'nafis@localchat.test',
                'role' => RoleType::USER->value,
            ],
            [
                'name' => 'Tania Islam',
                'email' => 'tania@localchat.test',
                'role' => RoleType::USER->value,
            ],
        ];

        foreach ($users as $user) {
            User::updateOrCreate(
                ['email' => $user['email']],
                [
                    'name' => $user['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                    'role' => $user['role'],
                    'last_seen_at' => now(),
                ]
            );
        }
    }
}
