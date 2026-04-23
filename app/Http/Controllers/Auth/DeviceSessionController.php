<?php

namespace App\Http\Controllers\Auth;

use App\Events\ParticipantsUpdated;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\DeviceSessionRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Auth;

class DeviceSessionController extends Controller
{
    public function store(DeviceSessionRequest $request): JsonResponse
    {
        $user = User::query()->firstOrNew([
            'device_uuid' => $request->validated('device_uuid'),
        ]);

        $user->fill([
            'name' => $request->validated('display_name'),
            'avatar_color' => $request->validated('avatar_color') ?: $user->avatar_color ?: User::generateAvatarColor(),
            'last_seen_at' => now(),
        ]);

        $user->save();

        Auth::login($user, false);
        $request->session()->regenerate();
        broadcast(new ParticipantsUpdated())->toOthers();

        return response()->json([
            'user' => $user->fresh(),
        ]);
    }

    public function destroy(): JsonResponse
    {
        broadcast(new ParticipantsUpdated())->toOthers();
        Auth::guard('web')->logout();
        request()->session()->invalidate();
        request()->session()->regenerateToken();

        return response()->json([
            'message' => 'Disconnected device identity.',
        ]);
    }
}
