<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreRoomRequest;
use App\Http\Resources\ChatRoomResource;
use App\Models\ChatRoom;
use App\Models\User;
use App\Services\ChatRoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ChatRoomController extends Controller
{
    public function __construct(protected ChatRoomService $chatRoomService)
    {
    }

    public function index(): AnonymousResourceCollection
    {
        return ChatRoomResource::collection(
            $this->chatRoomService->listForUser(request()->user())
        );
    }

    public function store(StoreRoomRequest $request): JsonResponse
    {
        $room = $this->chatRoomService->create($request->user(), $request->validated());

        return (new ChatRoomResource($room))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ChatRoom $room): ChatRoomResource
    {
        $this->chatRoomService->ensureMember($room, request()->user());

        $room->load(['members', 'roomMembers', 'messages.sender']);

        return new ChatRoomResource($room);
    }

    public function direct(User $participant): JsonResponse
    {
        $room = $this->chatRoomService->findOrCreateDirect(request()->user(), $participant);

        return (new ChatRoomResource($room))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
