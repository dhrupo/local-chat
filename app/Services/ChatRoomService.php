<?php

namespace App\Services;

use App\Events\RoomsUpdated;
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
        $room = DB::transaction(function () use ($creator, $attributes) {
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

        $this->broadcastRoomUpdates($room->members->pluck('id')->all(), $room->id, 'created');

        return $room;
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

        $room = $room->fresh(['members', 'roomMembers', 'messages.sender']);

        $this->broadcastRoomUpdates($room->members->pluck('id')->all(), $room->id, 'joined');

        return $room;
    }

    public function leave(ChatRoom $room, User $user): void
    {
        $affectedUserIds = [];

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

        if ($room->exists) {
            $affectedUserIds = $room->members()->pluck('users.id')->push($user->id)->unique()->all();
        } else {
            $affectedUserIds = [$user->id];
        }

        $this->broadcastRoomUpdates($affectedUserIds, $room->id, 'left');
    }

    public function ensureMember(ChatRoom $room, User $user): void
    {
        abort_unless(
            $room->roomMembers()->where('user_id', $user->id)->exists(),
            403,
            'You are not a member of this room.'
        );
    }

    protected function broadcastRoomUpdates(array $userIds, ?int $roomId, string $reason): void
    {
        foreach (array_unique($userIds) as $userId) {
            broadcast(new RoomsUpdated((int) $userId, $roomId, $reason))->toOthers();
        }
    }
}
