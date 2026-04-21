<?php

namespace Tests\Feature\Chat;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class ChatRoomWorkflowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_create_room_and_send_messages(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $this->actingAs($owner);

        $roomResponse = $this->postJson('/api/chat/rooms', [
            'name' => 'Team Sync',
            'description' => 'Quick updates',
            'member_ids' => [$member->id],
        ])->assertCreated();

        $roomId = $roomResponse->json('data.id');

        $this->assertDatabaseHas('chat_room_members', [
            'room_id' => $roomId,
            'user_id' => $owner->id,
            'role' => 'owner',
        ]);

        $messageResponse = $this->postJson("/api/chat/rooms/{$roomId}/messages", [
            'body' => 'Hello from the network',
        ])->assertCreated();

        $messageId = $messageResponse->json('data.id');

        $this->assertDatabaseHas('chat_messages', [
            'id' => $messageId,
            'room_id' => $roomId,
            'user_id' => $owner->id,
        ]);

        $this->postJson("/api/chat/rooms/{$roomId}/read", [
            'last_read_message_id' => $messageId,
        ])->assertOk();

        $this->assertDatabaseHas('chat_room_members', [
            'room_id' => $roomId,
            'user_id' => $owner->id,
            'last_read_message_id' => $messageId,
        ]);
    }

    public function test_member_sees_unread_count_until_reading_room(): void
    {
        $owner = User::factory()->create();
        $member = User::factory()->create();

        $this->actingAs($owner);

        $roomId = $this->postJson('/api/chat/rooms', [
            'name' => 'Ops',
            'member_ids' => [$member->id],
        ])->json('data.id');

        $this->postJson("/api/chat/rooms/{$roomId}/messages", [
            'body' => 'Unread for member',
        ])->assertCreated();

        $this->actingAs($member);

        $this->getJson('/api/chat/rooms')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 1);

        $messages = $this->getJson("/api/chat/rooms/{$roomId}/messages")
            ->assertOk()
            ->json('data');

        $lastMessageId = collect($messages)->last()['id'];

        $this->postJson("/api/chat/rooms/{$roomId}/read", [
            'last_read_message_id' => $lastMessageId,
        ])->assertOk();

        $this->getJson('/api/chat/rooms')
            ->assertOk()
            ->assertJsonPath('data.0.unread_count', 0);
    }

    public function test_member_can_upload_and_download_room_file(): void
    {
        Storage::fake('local');

        $owner = User::factory()->create();
        $member = User::factory()->create();

        $this->actingAs($owner);

        $roomId = $this->postJson('/api/chat/rooms', [
            'name' => 'Assets',
            'member_ids' => [$member->id],
        ])->json('data.id');

        $uploadResponse = $this->post("/api/chat/rooms/{$roomId}/files", [
            'file' => UploadedFile::fake()->create('brief.pdf', 256, 'application/pdf'),
            'body' => 'Please review the attached brief',
        ]);

        $uploadResponse->assertCreated();

        $messageId = $uploadResponse->json('data.id');

        $this->assertDatabaseHas('chat_messages', [
            'id' => $messageId,
            'room_id' => $roomId,
            'type' => 'file',
            'file_name' => 'brief.pdf',
        ]);

        $this->get($uploadResponse->json('data.file.download_url'))->assertOk();
    }
}
