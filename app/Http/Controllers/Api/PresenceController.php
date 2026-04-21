<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

class PresenceController extends Controller
{
    public function __invoke(): JsonResponse
    {
        request()->user()->forceFill([
            'last_seen_at' => now(),
        ])->save();

        return response()->json(['ok' => true]);
    }
}
