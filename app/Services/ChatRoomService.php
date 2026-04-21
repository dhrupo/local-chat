<?php

namespace App\Services;

use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

class ChatRoomService
{
    public function listForUser(User $user): Collection
    {
        return ChatRoom::query()
            ->with([
                'members' => fn ($query) => $query->orderBy('name'),
                'roomMembers',
                'messages' => fn ($query) => $query->latest()->limit(20),
                'messages.sender',
            ])
            ->orderByDesc(DB::raw('COALESCE(last_message_at, created_at)'))
            ->orderBy('name')
            ->get();
    }

    public function create(User $creator, array $attributes): ChatRoom
    {
        return DB::transaction(function () use ($creator, $attributes) {
            $room = ChatRoom::create([
                'name' => $attributes['name'],
                'description' => $attributes['description'] ?? null,
                'created_by' => $creator->id,
            ]);

            $memberIds = collect($attributes['member_ids'] ?? [])
                ->push($creator->id)
                ->unique()
                ->values();

            $syncData = $memberIds->mapWithKeys(function ($memberId) use ($creator) {
                return [
                    $memberId => [
                        'role' => $memberId === $creator->id ? 'owner' : 'member',
                        'joined_at' => now(),
                        'last_read_message_id' => null,
                    ],
                ];
            })->all();

            $room->members()->sync($syncData);

            return $room->load(['members', 'roomMembers', 'messages.sender']);
        });
    }

    public function join(ChatRoom $room, User $user): ChatRoom
    {
        $room->members()->syncWithoutDetaching([
            $user->id => [
                'role' => 'member',
                'joined_at' => now(),
                'last_read_message_id' => null,
            ],
        ]);

        return $room->fresh(['members', 'roomMembers', 'messages.sender']);
    }

    public function leave(ChatRoom $room, User $user): void
    {
        DB::transaction(function () use ($room, $user) {
            $membership = $room->roomMembers()->where('user_id', $user->id)->first();

            if (! $membership) {
                return;
            }

            $wasOwner = $membership->role === 'owner';

            $room->members()->detach($user->id);

            $remainingMembers = $room->roomMembers()->orderBy('joined_at')->get();

            if ($remainingMembers->isEmpty()) {
                $room->messages()->delete();
                $room->delete();
                return;
            }

            if ($wasOwner) {
                $remainingMembers->first()->update(['role' => 'owner']);
            }
        });
    }

    public function ensureMember(ChatRoom $room, User $user): void
    {
        abort_unless(
            $room->roomMembers()->where('user_id', $user->id)->exists(),
            403,
            'You are not a member of this room.'
        );
    }
}
