<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// role = Guest
use App\Http\Controllers\{
    RegisterController,
    AuthController,
    ComplaintController
};

// role = User
use App\Http\Controllers\User\{
    AccountController,

    ApiDashboardController,
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
    Route::get('/{id}', [ApiLogController::class, 'show']);
});

 
// Api Dashboard
Route::middleware('auth:sanctum')->prefix('dashboard')->group(function () {
    Route::get('/', [ApiDashboardController::class, 'index']);
});

// to test valid APi and user.status == active
// http://localhost:8000/api/secure-data
// Header ~ Authorization: Bearer <api_token>
//Route::middleware(['auth.apikey','auth:sanctum'])->group(function () {
Route::middleware(['auth.token'])->group(function () {
    Route::get('/secure-data', fn () => ['message' => 'You are authenticated and active']);

    // user must upload image 
    //Route::post('/process-document', [DocumentController::class, 'processDocument']);

    // user must upload PDF 
    Route::post('/upload', [DocumentController::class, 'upload']);
    Route::get('/jobs/{id}/result', [DocumentController::class, 'result'])->name('job.result');
});

Route::middleware(['auth.token'])->group(function () {
    Route::get('/secure-access', fn () => ['message' => 'You are authenticated and active']);
});

// Open AI 
// to test valid APi and user.status == active
// http://localhost:8000/api/test-openai-key
// Header ~ Authorization: Bearer <api_token>
Route::get('/test-openai-key', [App\Http\Controllers\OpenAITestController::class, 'test'])->name('test-openai-key');
Route::get('/test-telegram-token', [App\Http\Controllers\Telegram\WebhookController::class, 'token'])->name('test-telegram-token');
//Route::post('/process-document', [DocumentController::class, 'processDocument']);

// Complaints
Route::get('/complaints', function () {
            return response()->json([
                'message' => 'List of complaints',
                'data' => \App\Models\Complaint::orderByDesc('id')->get()
            ]);
});

Route::middleware('auth:sanctum')->get('/complaints/my', [App\Http\Controllers\ComplaintController::class, 'myComplaints']);

// Complaint submission
Route::post('/complaints', [App\Http\Controllers\ComplaintController::class, 'store']);
Route::get('/complaints/reference', [App\Http\Controllers\ComplaintController::class, 'lookup']);
Route::get('/complaints/{complaint}', [App\Http\Controllers\ComplaintController::class, 'show'])
    ->whereNumber('complaint');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/complaints/{complaint}/approve', [App\Http\Controllers\ComplaintController::class, 'approve'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/status', [App\Http\Controllers\ComplaintController::class, 'updateStatus'])
        ->whereNumber('complaint');
});

// Districts (public reference list)
Route::get('/districts', function () {
    return response()->json([
        'message' => 'District list',
        'data' => \App\Models\District::query()
            ->where('is_active', true)
            ->orderBy('name')
            ->get(['id', 'name']),
    ]);
});

// Telegram Webhook
Route::post('/telegram/webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'handleWebhook'])->name('telegram.webhook');
Route::get('/telegram/set-webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'setWebhook'])->name('telegram.set-webhook');
Route::get('/telegram/remove-webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'removeWebhook'])->name('telegram.remove-webhook');
Route::get('/telegram/webhook-info', [App\Http\Controllers\Telegram\WebhookController::class, 'webhookInfo'])->name('telegram.webhook-info');
Route::get('/telegram/send-test-message', [App\Http\Controllers\Telegram\WebhookController::class, 'sendTestMessage'])->name('telegram.send-test-message'); 
Route::get('/telegram/show-token', [App\Http\Controllers\Telegram\WebhookController::class, 'showToken'])->name('telegram.show-token');

// Whatsapp Webhook
use App\Http\Controllers\WhatsApp\WebhookController as WhatsAppWebhookController;
Route::get('/whatsapp', [WhatsAppWebhookController::class, 'verify']);
Route::post('/whatsapp', [WhatsAppWebhookController::class, 'handleWebhook']);
