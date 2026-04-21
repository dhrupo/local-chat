<?php

namespace App\Http\Controllers\Api;

use App\Events\CallSignalReceived;
use App\Http\Controllers\Controller;
use App\Http\Requests\Call\SignalCallRequest;
use App\Models\ChatRoom;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CallSignalController extends Controller
{
    public function __invoke(SignalCallRequest $request): JsonResponse
    {
        $sender = $request->user();
        $validated = $request->validated();
        $recipient = User::query()->findOrFail($validated['to_participant_id']);
        $roomId = $validated['room_id'] ?? null;

        if ($roomId) {
            $room = ChatRoom::query()->findOrFail($roomId);

            abort_unless(
                $room->roomMembers()->whereIn('user_id', [$sender->id, $recipient->id])->count() === 2,
                403,
                'Both participants must belong to the same room.'
            );
        }

        broadcast(new CallSignalReceived(
            from: $sender,
            toParticipantId: (int) $recipient->id,
            signalType: $validated['signal_type'],
            payload: $validated['payload'] ?? null,
            roomId: $roomId ? (int) $roomId : null,
        ))->toOthers();

        return response()->json([
            'ok' => true,
        ]);
    }
}
