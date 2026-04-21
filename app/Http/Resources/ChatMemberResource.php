<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatMemberResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'display_name' => $this->display_name,
            'name' => $this->display_name,
            'initials' => $this->initials,
            'avatar_color' => $this->avatar_color,
            'is_online' => $this->is_online,
            'last_seen_at' => optional($this->last_seen_at)->toIso8601String(),
            'membership_role' => $this->pivot?->role,
        ];
    }
}
