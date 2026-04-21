<?php

use App\Models\ChatRoom;
use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
|
| Here you may register all of the event broadcasting channels that your
| application supports. The given channel authorization callbacks are
| used to check if an authenticated user can listen to the channel.
|
*/

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('user.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('chat.room.{roomId}', function ($user, $roomId) {
    return ChatRoom::query()
        ->whereKey($roomId)
        ->whereHas('roomMembers', fn ($query) => $query->where('user_id', $user->id))
        ->exists();
});

Broadcast::channel('chat.presence.{roomId}', function ($user, $roomId) {
    $isMember = ChatRoom::query()
        ->whereKey($roomId)
        ->whereHas('roomMembers', fn ($query) => $query->where('user_id', $user->id))
        ->exists();

    if (! $isMember) {
        return false;
    }

    return [
        'id' => $user->id,
        'name' => $user->name,
        'email' => $user->email,
        'initials' => $user->initials,
    ];
});
