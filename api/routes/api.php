<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// role = Guest
use App\Http\Controllers\{
    RegisterController,
    AuthController,
    ComplaintController,
    AppointmentController,
    ReferenceController,
    StaffController,
    RoleController,
    MenuController,
    UserController
};
use App\Http\Controllers\IwaranWarrantController;
use App\Http\Controllers\ArahanBeredarController;

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
Route::middleware('auth:sanctum')->get('/complaints', [App\Http\Controllers\ComplaintController::class, 'index']);

Route::middleware('auth:sanctum')->get('/complaints/my', [App\Http\Controllers\ComplaintController::class, 'myComplaints']);

// Complaint submission
Route::post('/complaints', [App\Http\Controllers\ComplaintController::class, 'store']);
Route::get('/complaints/reference', [App\Http\Controllers\ComplaintController::class, 'lookup']);
Route::middleware('auth:sanctum')->get('/complaints/{complaint}', [App\Http\Controllers\ComplaintController::class, 'show'])
    ->whereNumber('complaint');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/check', [AppointmentController::class, 'check']);
    Route::get('/i-waran', [IwaranWarrantController::class, 'index']);
    Route::post('/i-waran', [IwaranWarrantController::class, 'store']);
    Route::get('/i-waran/report/summary', [IwaranWarrantController::class, 'reportSummary']);
    Route::get('/i-waran/export/csv', [IwaranWarrantController::class, 'exportCsv']);
    Route::get('/i-waran/export/xlsx', [IwaranWarrantController::class, 'exportXlsx']);
    Route::get('/i-waran/report/export/csv', [IwaranWarrantController::class, 'exportReportCsv']);
    Route::get('/i-waran/report/export/xlsx', [IwaranWarrantController::class, 'exportReportXlsx']);
    Route::get('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'show'])->whereNumber('iwaranWarrant');
    Route::get('/i-waran/{iwaranWarrant}/export/xlsx', [IwaranWarrantController::class, 'exportSingleXlsx'])
        ->whereNumber('iwaranWarrant');
    Route::put('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'update'])->whereNumber('iwaranWarrant');
    Route::delete('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'destroy'])->whereNumber('iwaranWarrant');
    Route::post('/i-waran/{iwaranWarrant}/attachments', [IwaranWarrantController::class, 'uploadAttachments'])
        ->whereNumber('iwaranWarrant');
    Route::get('/i-waran/attachments/{attachment}/download', [IwaranWarrantController::class, 'downloadAttachment'])
        ->whereNumber('attachment')
        ->name('iwaran.attachments.download');
    Route::delete('/i-waran/attachments/{attachment}', [IwaranWarrantController::class, 'deleteAttachment'])
        ->whereNumber('attachment');
    Route::get('/arahan-beredar', [ArahanBeredarController::class, 'index']);
    Route::post('/arahan-beredar', [ArahanBeredarController::class, 'store']);
    Route::get('/arahan-beredar/{arahanBeredar}', [ArahanBeredarController::class, 'show'])
        ->whereNumber('arahanBeredar');
    Route::put('/arahan-beredar/{arahanBeredar}', [ArahanBeredarController::class, 'update'])
        ->whereNumber('arahanBeredar');
    Route::post('/complaints/{complaint}/approve', [App\Http\Controllers\ComplaintController::class, 'approve'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/pickup', [App\Http\Controllers\ComplaintController::class, 'pickup'])
        ->whereNumber('complaint');
    Route::get('/complaints/pending-approval', [App\Http\Controllers\ComplaintController::class, 'pendingApprovals']);
    Route::get('/complaints/pickup-queue', [App\Http\Controllers\ComplaintController::class, 'pickupQueue']);
    Route::get('/complaints/my-pic', [App\Http\Controllers\ComplaintController::class, 'myPicComplaints']);
    Route::post('/complaints/{complaint}/status', [App\Http\Controllers\ComplaintController::class, 'updateStatus'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/case-type', [App\Http\Controllers\ComplaintController::class, 'updateCaseType'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/assignees', [App\Http\Controllers\ComplaintController::class, 'updateAssignees'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/aj', [App\Http\Controllers\ComplaintController::class, 'updateAjPayload'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/aj-report', [App\Http\Controllers\ComplaintController::class, 'updateAjReport'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/ak', [App\Http\Controllers\ComplaintController::class, 'updateAkPayload'])
        ->whereNumber('complaint');
    Route::delete('/complaints/{complaint}', [App\Http\Controllers\ComplaintController::class, 'destroy'])
        ->whereNumber('complaint');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/staff/options', [StaffController::class, 'options']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::put('/staff/{staff}', [StaffController::class, 'update'])->whereNumber('staff');
    Route::get('/roles', [RoleController::class, 'index']);
    Route::post('/roles', [RoleController::class, 'store']);
    Route::put('/roles/{role}', [RoleController::class, 'update'])->whereNumber('role');
    Route::delete('/roles/{role}', [RoleController::class, 'destroy'])->whereNumber('role');
    Route::get('/menus/my', [MenuController::class, 'myMenus']);
    Route::get('/menus', [MenuController::class, 'index']);
    Route::post('/menus', [MenuController::class, 'store']);
    Route::post('/menus/reorder', [MenuController::class, 'reorder']);
    Route::post('/menus/bulk-roles', [MenuController::class, 'bulkRoles']);
    Route::put('/menus/{menu}', [MenuController::class, 'update'])->whereNumber('menu');
    Route::delete('/menus/{menu}', [MenuController::class, 'destroy'])->whereNumber('menu');
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update'])->whereNumber('user');
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

// Reference tables
Route::get('/references/offense-types', [ReferenceController::class, 'offenseTypes']);
Route::get('/references/offenses', [ReferenceController::class, 'offenses']);
Route::get('/references/khalwat-details', [ReferenceController::class, 'khalwatDetails']);
Route::get('/references/judi-details', [ReferenceController::class, 'judiDetails']);
Route::get('/references/complaint-statuses', [ReferenceController::class, 'complaintStatuses']);
Route::get('/references/complaint-email-recipients', [ReferenceController::class, 'complaintEmailRecipients']);
Route::get('/references/arahan-beredar-sections', [ReferenceController::class, 'arahanBeredarSections']);
Route::get('/references/iwaran-jenis-kes', [ReferenceController::class, 'iwaranJenisKes']);
Route::get('/references/iwaran-hasil', [ReferenceController::class, 'iwaranHasil']);
Route::get('/references/mahkamah', [ReferenceController::class, 'mahkamah']);

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
