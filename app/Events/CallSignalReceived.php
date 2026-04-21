<?php

namespace App\Events;

use App\Http\Resources\ChatMemberResource;
use App\Models\User;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class CallSignalReceived implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public User $from,
        public int $toParticipantId,
        public string $signalType,
        public ?array $payload = null,
        public ?int $roomId = null
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel("participant.{$this->toParticipantId}"),
        ];
    }

    public function broadcastAs(): string
    {
        return 'call.signal';
    }

    public function broadcastWith(): array
    {
        return [
            'from' => ChatMemberResource::make($this->from)->resolve(),
            'signal_type' => $this->signalType,
            'payload' => $this->payload,
            'room_id' => $this->roomId,
        ];
    }
}
