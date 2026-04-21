<?php

namespace App\Services;

use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

class ChatMessageService
{
    public function listForRoom(ChatRoom $room): Collection
    {
        return $room->messages()
            ->with('sender')
            ->latest('id')
            ->limit(50)
            ->get()
            ->reverse()
            ->values();
    }

    public function create(ChatRoom $room, User $user, string $body): ChatMessage
    {
        return DB::transaction(function () use ($room, $user, $body) {
            $message = $room->messages()->create([
                'user_id' => $user->id,
                'body' => trim($body),
            ]);

            $room->forceFill([
                'last_message_at' => $message->created_at,
            ])->save();

            $room->roomMembers()
                ->where('user_id', $user->id)
                ->update(['last_read_message_id' => $message->id]);

            return $message->load('sender');
        });
    }

    public function markAsRead(ChatRoom $room, User $user, int $messageId): void
    {
        abort_unless(
            $room->messages()->whereKey($messageId)->exists(),
            422,
            'The selected message does not belong to this room.'
        );

        $room->roomMembers()
            ->where('user_id', $user->id)
            ->update(['last_read_message_id' => $messageId]);
    }
}
