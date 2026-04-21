<?php

namespace App\Services;

use App\Events\ChatMessageCreated;
use App\Events\RoomsUpdated;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

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
        $message = DB::transaction(function () use ($room, $user, $body) {
            $message = $room->messages()->create([
                'user_id' => $user->id,
                'type' => 'text',
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

        broadcast(new ChatMessageCreated($message))->toOthers();

        $room->members()->pluck('users.id')->each(function ($userId) use ($room) {
            broadcast(new RoomsUpdated((int) $userId, $room->id, 'message'))->toOthers();
        });

        return $message;
    }

    public function createFile(ChatRoom $room, User $user, UploadedFile $file, string $body = ''): ChatMessage
    {
        $message = DB::transaction(function () use ($room, $user, $file, $body) {
            $storedPath = $file->storeAs(
                "chat-files/room-{$room->id}",
                Str::uuid()->toString().'-'.$file->getClientOriginalName(),
                'local'
            );

            $message = $room->messages()->create([
                'user_id' => $user->id,
                'type' => 'file',
                'body' => trim($body),
                'file_name' => $file->getClientOriginalName(),
                'file_path' => $storedPath,
                'file_mime_type' => $file->getClientMimeType(),
                'file_size' => $file->getSize(),
            ]);

            $room->forceFill([
                'last_message_at' => $message->created_at,
            ])->save();

            $room->roomMembers()
                ->where('user_id', $user->id)
                ->update(['last_read_message_id' => $message->id]);

            return $message->load('sender');
        });

        broadcast(new ChatMessageCreated($message))->toOthers();

        $room->members()->pluck('users.id')->each(function ($userId) use ($room) {
            broadcast(new RoomsUpdated((int) $userId, $room->id, 'message'))->toOthers();
        });

        return $message;
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
