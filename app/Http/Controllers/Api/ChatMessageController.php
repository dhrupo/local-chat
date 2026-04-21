<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreMessageRequest;
use App\Http\Requests\Chat\UpdateReadStateRequest;
use App\Http\Resources\ChatMessageResource;
use App\Models\ChatRoom;
use App\Services\ChatMessageService;
use App\Services\ChatRoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ChatMessageController extends Controller
{
    public function __construct(
        protected ChatRoomService $chatRoomService,
        protected ChatMessageService $chatMessageService
    ) {
    }

    public function index(ChatRoom $room): AnonymousResourceCollection
    {
        $this->chatRoomService->ensureMember($room, request()->user());

        return ChatMessageResource::collection(
            $this->chatMessageService->listForRoom($room)
        );
    }

    public function store(StoreMessageRequest $request, ChatRoom $room): JsonResponse
    {
        $this->chatRoomService->ensureMember($room, $request->user());

        $message = $this->chatMessageService->create(
            $room,
            $request->user(),
            $request->validated('body')
        );

        return (new ChatMessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function markAsRead(UpdateReadStateRequest $request, ChatRoom $room)
    {
        $this->chatRoomService->ensureMember($room, $request->user());

        $this->chatMessageService->markAsRead(
            $room,
            $request->user(),
            (int) $request->validated('last_read_message_id')
        );

        return response()->json(['ok' => true]);
    }
}
