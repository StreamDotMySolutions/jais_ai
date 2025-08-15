<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// role = Guest
use App\Http\Controllers\{
    RegisterController,
    AuthController
};

// role = User
use App\Http\Controllers\User\{
    AccountController,
    ApiTokenController,
    ApiLogController,
};

// AI modules
// role = User
use App\Http\Controllers\Modules\{
    DocumentController,
};


Route::middleware('auth:sanctum')->get('/user', function (Request $request) {

    $user = $request->user(); // Get the authenticated user
    
    // Retrieve the user's role using Spatie
    $role = $user->roles->pluck('name')->first();

    $user['role'] = $role;

    return response()->json([
        'message' => 'Logged user info',
        'user' => $user,
        'role' => $role,
    ]);
});


//Route::get('/homepage/footers/{footer}', [FooterController::class, 'show']);

// Account Management ( logged in users )
Route::group(['middleware' => ['auth:sanctum']], function () {
    Route::get('/account', [AccountController::class, 'show']);
    Route::put('/account/update', [AccountController::class, 'update']);
    Route::put('/account/change_password', [AccountController::class, 'changePassword']);
});


// Auth 
Route::post('/frontend/register', [RegisterController::class, 'store']);
Route::post('/login', [AuthController::class, 'login']);
Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');

// Api Tokens
// api/tokens/index
// api/tokens/store
// api/tokens/123
Route::middleware('auth:sanctum')->prefix('tokens')->group(function () {
    Route::get('/', [ApiTokenController::class, 'index']);
    Route::post('/', [ApiTokenController::class, 'store']);
    Route::delete('/{id}', [ApiTokenController::class, 'destroy']);
});

// Api Logs
// api/logs/index
Route::middleware('auth:sanctum')->prefix('logs')->group(function () {
    Route::get('/', [ApiLogController::class, 'index']);
});


// to test valid APi and user.status == active
// http://localhost:8000/api/secure-data
// Header ~ Authorization: Bearer <api_token>
Route::middleware(['auth.apikey','auth:sanctum'])->group(function () {
    Route::get('/secure-data', fn () => ['message' => 'You are authenticated and active']);

    // user must upload image 
    Route::post('/process-document', [DocumentController::class, 'processDocument']);

    // user must upload PDF 
    Route::post('/upload-pdf', [DocumentController::class, 'upload']);
    Route::get('/jobs/{id}/result', [DocumentController::class, 'result'])->name('job.result');
});

// Open AI 
// to test valid APi and user.status == active
// http://localhost:8000/api/test-openai-key
// Header ~ Authorization: Bearer <api_token>
Route::get('/test-openai-key', [App\Http\Controllers\OpenAITestController::class, 'test'])->name('test-openai-key');

//Route::post('/process-document', [DocumentController::class, 'processDocument']);

