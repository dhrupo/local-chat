<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Chat\StoreFileMessageRequest;
use App\Http\Resources\ChatMessageResource;
use App\Models\ChatMessage;
use App\Models\ChatRoom;
use App\Services\ChatMessageService;
use App\Services\ChatRoomService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class ChatFileController extends Controller
{
    public function __construct(
        protected ChatRoomService $chatRoomService,
        protected ChatMessageService $chatMessageService
    ) {
    }

    public function store(StoreFileMessageRequest $request, ChatRoom $room): JsonResponse
    {
        $this->chatRoomService->ensureMember($room, $request->user());

        $message = $this->chatMessageService->createFile(
            $room,
            $request->user(),
            $request->file('file'),
            $request->string('body')->toString()
        );

        return (new ChatMessageResource($message))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function download(ChatMessage $message)
    {
        abort_unless($message->type === 'file', 404);

        $this->chatRoomService->ensureMember($message->room, request()->user());
        abort_unless($message->file_path, 404);

        return Storage::disk('local')->download($message->file_path, $message->file_name);
    }
}
