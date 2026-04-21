<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMessageResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'room_id' => $this->room_id,
            'type' => $this->type,
            'body' => $this->body,
            'created_at' => $this->created_at?->toIso8601String(),
            'created_at_human' => $this->created_at?->format('M d, Y h:i A'),
            'file' => $this->type === 'file' ? [
                'name' => $this->file_name,
                'mime_type' => $this->file_mime_type,
                'size' => $this->file_size,
                'download_url' => route('api.chat.files.download', $this->id),
            ] : null,
            'sender' => new ChatMemberResource($this->whenLoaded('sender')),
        ];
    }
}
