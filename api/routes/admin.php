<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Admin\{
    UserController,
    ComplaintController,

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

