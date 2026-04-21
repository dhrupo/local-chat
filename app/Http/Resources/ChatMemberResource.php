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
            'name' => $this->name,
            'email' => $this->email,
            'initials' => $this->initials,
            'is_online' => $this->is_online,
            'last_seen_at' => optional($this->last_seen_at)->toIso8601String(),
            'role' => $this->role,
            'membership_role' => $this->pivot?->role,
        ];
    }
}
