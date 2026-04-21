<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\User>
 */
class UserFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition()
    {
        return [
            'name' => fake()->name(),
            'device_uuid' => (string) Str::uuid(),
            'avatar_color' => fake()->randomElement(['sunset', 'lagoon', 'forest', 'ember', 'violet', 'sand']),
            'last_seen_at' => now(),
        ];
    }
}
