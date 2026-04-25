<?php

namespace Tests\Feature\Auth;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeviceSessionTest extends TestCase
{
    use RefreshDatabase;

    public function test_device_can_connect_and_fetch_profile(): void
    {
        $this->get('/sanctum/csrf-cookie');

        $this->postJson('/session/device', [
            'device_uuid' => '0f0d7aa0-6d4b-47a1-b53a-497546f0ed91',
            'display_name' => 'Hallway Tablet',
            'avatar_color' => 'lagoon',
        ])->assertOk();

        $this->getJson('/api/me')
            ->assertOk()
            ->assertJsonPath('data.display_name', 'Hallway Tablet')
            ->assertJsonPath('data.avatar_color', 'lagoon');
    }

    public function test_device_cannot_use_a_display_name_taken_by_another_device(): void
    {
        User::factory()->create([
            'name' => 'Hallway Tablet',
            'device_uuid' => '11111111-1111-4111-8111-111111111111',
        ]);

        $this->get('/sanctum/csrf-cookie');

        $this->postJson('/session/device', [
            'device_uuid' => '22222222-2222-4222-8222-222222222222',
            'display_name' => 'Hallway Tablet',
            'avatar_color' => 'lagoon',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['display_name'])
            ->assertJsonPath(
                'errors.display_name.0',
                'This display name is already taken. Please choose a new one.'
            );
    }

    public function test_device_can_send_call_signal(): void
    {
        $caller = User::factory()->create();
        $recipient = User::factory()->create();
        $room = ChatRoom::query()->create([
            'name' => 'Call Room',
            'created_by' => $caller->id,
        ]);

        $room->members()->sync([
            $caller->id => [
                'role' => 'owner',
                'joined_at' => now(),
                'last_read_message_id' => null,
            ],
            $recipient->id => [
                'role' => 'member',
                'joined_at' => now(),
                'last_read_message_id' => null,
            ],
        ]);

        $this->actingAs($caller);

        $this->postJson('/api/calls/signal', [
            'to_participant_id' => $recipient->id,
            'room_id' => $room->id,
            'signal_type' => 'offer',
            'payload' => [
                'description' => [
                    'type' => 'offer',
                    'sdp' => 'v=0',
                ],
                'mode' => 'video',
            ],
        ])->assertOk()->assertJson([
            'ok' => true,
        ]);
    }

    public function test_device_cannot_send_call_signal_without_shared_room(): void
    {
        $caller = User::factory()->create();
        $recipient = User::factory()->create();

        $this->actingAs($caller);

        $this->postJson('/api/calls/signal', [
            'to_participant_id' => $recipient->id,
            'signal_type' => 'offer',
            'payload' => [
                'description' => [
                    'type' => 'offer',
                    'sdp' => 'v=0',
                ],
                'mode' => 'video',
            ],
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['room_id']);
    }
}
