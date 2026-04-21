<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMemberResource;
use Illuminate\Http\Resources\Json\JsonResource;

class MeController extends Controller
{
    public function __invoke(): JsonResource
    {
        return new ChatMemberResource(request()->user());
    }
}
