<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMemberResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ParticipantDirectoryController extends Controller
{
    public function __invoke(): AnonymousResourceCollection
    {
        $participants = User::query()
            ->when(request('query'), function ($query, $search) {
                $query->where('name', 'like', "%{$search}%");
            })
            ->orderBy('name')
            ->get();

        return ChatMemberResource::collection($participants);
    }
}
