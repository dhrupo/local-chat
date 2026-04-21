<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChatMemberResource;
use Illuminate\Http\JsonResponse;

class MeController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json([
            'data' => (new ChatMemberResource(request()->user()->fresh()))->resolve(),
        ]);
    }
}
