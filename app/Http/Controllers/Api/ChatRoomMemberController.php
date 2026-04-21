<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatRoomResource;
use App\Models\ChatRoom;
use App\Services\ChatRoomService;
use Illuminate\Http\JsonResponse;

class ChatRoomMemberController extends Controller
{
    public function __construct(protected ChatRoomService $chatRoomService)
    {
    }

    public function store(ChatRoom $room): ChatRoomResource
    {
        $room = $this->chatRoomService->join($room, request()->user());

        return new ChatRoomResource($room);
    }

    public function destroy(ChatRoom $room): JsonResponse
    {
        $this->chatRoomService->ensureMember($room, request()->user());
        $this->chatRoomService->leave($room, request()->user());

        return response()->json(['message' => 'Left room successfully.']);
    }
}
