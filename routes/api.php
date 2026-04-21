<?php

use App\Http\Controllers\Api\ChatMessageController;
use App\Http\Controllers\Api\ChatRoomController;
use App\Http\Controllers\Api\ChatRoomMemberController;
use App\Http\Controllers\Api\MeController;
use App\Http\Controllers\Api\PresenceController;
use App\Http\Controllers\Api\UserDirectoryController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum', 'last.seen'])->group(function () {
    Route::get('/me', MeController::class);
    Route::get('/users', UserDirectoryController::class);
    Route::post('/presence/ping', PresenceController::class);

    Route::get('/chat/rooms', [ChatRoomController::class, 'index']);
    Route::post('/chat/rooms', [ChatRoomController::class, 'store']);
    Route::get('/chat/rooms/{room}', [ChatRoomController::class, 'show']);
    Route::post('/chat/rooms/{room}/join', [ChatRoomMemberController::class, 'store']);
    Route::delete('/chat/rooms/{room}/leave', [ChatRoomMemberController::class, 'destroy']);
    Route::get('/chat/rooms/{room}/messages', [ChatMessageController::class, 'index']);
    Route::post('/chat/rooms/{room}/messages', [ChatMessageController::class, 'store']);
    Route::post('/chat/rooms/{room}/read', [ChatMessageController::class, 'markAsRead']);
});
