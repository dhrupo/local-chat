<?php

namespace Tests\Feature\Auth;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class LoginTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_log_in_and_fetch_profile(): void
    {
        $user = User::factory()->create([
            'name' => 'Local Tester',
            'email' => 'tester@example.com',
            'password' => Hash::make('password'),
        ]);

        $this->get('/sanctum/csrf-cookie');

        $this->postJson('/login', [
            'login' => $user->email,
            'password' => 'password',
        ])->assertOk();

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.email', $user->email);
    }
}
