<?php

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "web" middleware group. Make something great!
|
*/

Route::get('/', function () {
    return view('welcome');
});

// Privacy URL needed by WhatsApp Business API
Route::get('/privacy', function () {
    return view('privacy');
});

// System Deployment Dashboard — only accessible by role 'system'
Route::prefix('system')->group(function () {
    Route::get('/deploy', [App\Http\Controllers\System\DeployController::class, 'index']);
    Route::post('/deploy/run/{command}', [App\Http\Controllers\System\DeployController::class, 'run'])
        ->middleware('auth:sanctum');
});
