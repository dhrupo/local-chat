<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChatRoomResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $otherParticipant = $this->members
            ->firstWhere('id', '!=', $request->user()->id);

        $membership = $this->relationLoaded('roomMembers')
            ? $this->roomMembers->firstWhere('user_id', $request->user()->id)
            : null;

        $latestMessage = $this->relationLoaded('messages')
            ? $this->messages->sortByDesc('id')->first()
            : null;

        $unreadCount = 0;

        if ($membership) {
            $unreadCount = $this->messages
                ->where('id', '>', (int) ($membership->last_read_message_id ?? 0))
                ->where('user_id', '!=', $request->user()->id)
                ->count();
        }

        return [
            'id' => $this->id,
            'name' => $this->is_direct && $otherParticipant ? $otherParticipant->display_name : $this->name,
            'description' => $this->description,
            'created_by' => $this->created_by,
            'is_direct' => (bool) $this->is_direct,
            'last_message_at' => optional($this->last_message_at)->toIso8601String(),
            'joined' => (bool) $membership,
            'membership_role' => $membership?->role,
            'member_count' => $this->members->count(),
            'unread_count' => $unreadCount,
            'direct_participant' => $this->is_direct && $otherParticipant
                ? ChatMemberResource::make($otherParticipant)->resolve()
                : null,
            'latest_message' => $latestMessage ? [
                'id' => $latestMessage->id,
                'body' => $latestMessage->body,
                'sender_name' => $latestMessage->relationLoaded('sender') ? $latestMessage->sender?->display_name : null,
                'created_at' => optional($latestMessage->created_at)->toIso8601String(),
            ] : null,
            'members' => ChatMemberResource::collection($this->whenLoaded('members')),
        ];
    }
}
