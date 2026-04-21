<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\{
    UserController,
    ComplaintController,
    WhatsappWebStatusController,
};

// Protect all admin routes with the 'admin' role
Route::group(['middleware' => ['auth:sanctum','role:admin']], function () {

    // User Management 
    // req /api/admin/users
    Route::get('/users', [UserController::class, 'index']);
    Route::get('/users/{user}', [UserController::class, 'show']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update']);
    Route::delete('/users/{user}', [UserController::class, 'delete']);
    Route::get('/roles', [UserController::class, 'roles']);

    // Complaint Management
    // req /api/admin/complaints
    Route::get('/complaints', [ComplaintController::class, 'index']);
    Route::get('/complaints/{complaint}', [ComplaintController::class, 'show']);

});

// WhatsApp Web bridge status (read) + logout (write) — allow both admin and system roles
Route::middleware(['auth:sanctum', 'role:admin|system'])->group(function () {
    Route::get('/whatsappweb/status', [WhatsappWebStatusController::class, 'show']);
    Route::post('/whatsappweb/logout', [WhatsappWebStatusController::class, 'logout']);
});

