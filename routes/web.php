<?php

use App\Http\Controllers\ApplicationController;
use App\Http\Controllers\Auth\SessionController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [SessionController::class, 'store'])->middleware('guest');
Route::post('/logout', [SessionController::class, 'destroy'])->middleware('auth');

Route::get('/{view?}', ApplicationController::class)
    ->where('view', '^(?!api|sanctum).*$');
