<?php

use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\Auth\DeviceSessionController;
use Illuminate\Support\Facades\Route;

Route::post('/session/device', [DeviceSessionController::class, 'store']);
Route::delete('/session/device', [DeviceSessionController::class, 'destroy'])->middleware('auth');

Route::get('/{view?}', ApplicationController::class)
    ->where('view', '^(?!api|sanctum).*$');
