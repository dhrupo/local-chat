<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RoomCatalogUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public ?int $roomId = null,
        public string $reason = 'updated'
    ) {
    }

    public function broadcastOn(): array
    {
        return [
            new Channel('rooms.catalog'),
        ];
    }

    public function broadcastAs(): string
    {
        return 'rooms.catalog.updated';
    }

    public function broadcastWith(): array
    {
        return [
            'room_id' => $this->roomId,
            'reason' => $this->reason,
        ];
    }
}
