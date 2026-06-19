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
    UserController,
    AuditTrailController,
    MobilePushTokenController
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
    Route::post('/mobile/push-tokens', [MobilePushTokenController::class, 'store']);
    Route::delete('/mobile/push-tokens', [MobilePushTokenController::class, 'destroy']);
    Route::post('/mobile/push-tokens/test', [MobilePushTokenController::class, 'test']);
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
Route::middleware('auth:sanctum')->get('/complaints/calendar', [App\Http\Controllers\ComplaintController::class, 'calendar']);

Route::middleware('auth:sanctum')->get('/complaints/my', [App\Http\Controllers\ComplaintController::class, 'myComplaints']);

// Complaint submission
Route::post('/complaints', [App\Http\Controllers\ComplaintController::class, 'store']);
Route::get('/complaints/reference', [App\Http\Controllers\ComplaintController::class, 'lookup']);
Route::middleware('auth:sanctum')->get('/complaints/{complaint}', [App\Http\Controllers\ComplaintController::class, 'show'])
    ->whereNumber('complaint');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/cases', [App\Http\Controllers\ComplaintController::class, 'caseIndex']);
    Route::post('/cases', [App\Http\Controllers\ComplaintController::class, 'storeCase']);
    Route::post('/cases/standalone', [App\Http\Controllers\ComplaintController::class, 'storeStandaloneCase']);
    Route::get('/cases/{case}', [App\Http\Controllers\ComplaintController::class, 'caseShow'])
        ->whereNumber('case');
    Route::put('/cases/{case}', [App\Http\Controllers\ComplaintController::class, 'caseUpdate'])
        ->whereNumber('case');

    Route::post('/cases/{case}/register-no', [App\Http\Controllers\ComplaintController::class, 'updateCaseRegisterNo'])
        ->whereNumber('case');

    Route::post('/cases/{id}/restore', [App\Http\Controllers\ComplaintController::class, 'restoreCase'])
        ->whereNumber('id');
    Route::post('/cases/{case}/oyds', [App\Http\Controllers\ComplaintController::class, 'createCaseOyd'])
        ->whereNumber('case');
    Route::post('/cases/{case}/inspection-forms', [App\Http\Controllers\ComplaintController::class, 'createCaseInspectionForm'])
        ->whereNumber('case');
    Route::post('/cases/{case}/seizure-items', [App\Http\Controllers\ComplaintController::class, 'createCaseSeizureItem'])
        ->whereNumber('case');
    Route::post('/cases/{case}/police-reports', [App\Http\Controllers\ComplaintController::class, 'createCasePoliceReport'])
        ->whereNumber('case');
    Route::post('/cases/{case}/oyds/{oyd}/media', [App\Http\Controllers\ComplaintController::class, 'uploadCaseOydMedia'])
        ->whereNumber('case')
        ->whereNumber('oyd');
    Route::post('/cases/{case}/inspection-forms/{inspectionForm}/media', [App\Http\Controllers\ComplaintController::class, 'uploadCaseInspectionFormMedia'])
        ->whereNumber('case')
        ->whereNumber('inspectionForm');
    Route::post('/cases/{case}/seizure-items/{item}/media', [App\Http\Controllers\ComplaintController::class, 'uploadCaseSeizureItemMedia'])
        ->whereNumber('case')
        ->whereNumber('item');
    Route::post('/cases/{case}/police-reports/{report}/media', [App\Http\Controllers\ComplaintController::class, 'uploadCasePoliceReportMedia'])
        ->whereNumber('case')
        ->whereNumber('report');
    Route::delete('/cases/{case}/oyd-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteCaseOydMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::delete('/cases/{case}/inspection-form-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteCaseInspectionFormMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::delete('/cases/{case}/seizure-item-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteCaseSeizureItemMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::delete('/cases/{case}/police-report-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteCasePoliceReportMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::get('/cases/{case}/oyd-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadCaseOydMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::get('/cases/{case}/inspection-form-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadCaseInspectionFormMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::get('/cases/{case}/seizure-item-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadCaseSeizureItemMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::get('/cases/{case}/police-report-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadCasePoliceReportMedia'])
        ->whereNumber('case')
        ->whereNumber('media');
    Route::get('/appointments', [AppointmentController::class, 'index']);
    Route::get('/appointments/check', [AppointmentController::class, 'check']);
    Route::post('/appointments/{id}/restore', [AppointmentController::class, 'restore'])->whereNumber('id');
    Route::get('/i-waran', [IwaranWarrantController::class, 'index']);
    Route::get('/i-waran/semakan-okt', [IwaranWarrantController::class, 'semakanOkt']);
    Route::post('/i-waran', [IwaranWarrantController::class, 'store']);
    Route::get('/i-waran/report/summary', [IwaranWarrantController::class, 'reportSummary']);
    Route::get('/i-waran/calendar/status', [IwaranWarrantController::class, 'calendarStatus']);
    Route::get('/i-waran/export/csv', [IwaranWarrantController::class, 'exportCsv']);
    Route::get('/i-waran/export/xlsx', [IwaranWarrantController::class, 'exportXlsx']);
    Route::get('/i-waran/report/export/csv', [IwaranWarrantController::class, 'exportReportCsv']);
    Route::get('/i-waran/report/export/xlsx', [IwaranWarrantController::class, 'exportReportXlsx']);
    Route::get('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'show'])->whereNumber('iwaranWarrant');
    Route::get('/i-waran/{iwaranWarrant}/export/xlsx', [IwaranWarrantController::class, 'exportSingleXlsx'])
        ->whereNumber('iwaranWarrant');
    Route::put('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'update'])->whereNumber('iwaranWarrant');
    Route::post('/i-waran/{iwaranWarrant}/dispatch-to-district', [IwaranWarrantController::class, 'dispatchToDistrict'])->whereNumber('iwaranWarrant');
    Route::post('/i-waran/{iwaranWarrant}/pickup', [IwaranWarrantController::class, 'pickup'])->whereNumber('iwaranWarrant');
    Route::post('/i-waran/{iwaranWarrant}/send-to-court', [IwaranWarrantController::class, 'sendToCourt'])->whereNumber('iwaranWarrant');
    Route::delete('/i-waran/{iwaranWarrant}', [IwaranWarrantController::class, 'destroy'])->whereNumber('iwaranWarrant');
    Route::post('/i-waran/{id}/restore', [IwaranWarrantController::class, 'restore'])->whereNumber('id');
    Route::post('/i-waran/{iwaranWarrant}/attachments', [IwaranWarrantController::class, 'uploadAttachments'])
        ->whereNumber('iwaranWarrant');
    Route::get('/i-waran/attachments/{attachment}/download', [IwaranWarrantController::class, 'downloadAttachment'])
        ->whereNumber('attachment')
        ->name('iwaran.attachments.download');
    Route::delete('/i-waran/attachments/{attachment}', [IwaranWarrantController::class, 'deleteAttachment'])
        ->whereNumber('attachment');
    Route::post('/i-waran/{iwaranWarrant}/court-documents', [IwaranWarrantController::class, 'uploadCourtDocuments'])
        ->whereNumber('iwaranWarrant');
    Route::get('/i-waran/court-documents/{document}/download', [IwaranWarrantController::class, 'downloadCourtDocument'])
        ->whereNumber('document')
        ->name('iwaran.court-documents.download');
    Route::delete('/i-waran/court-documents/{document}', [IwaranWarrantController::class, 'deleteCourtDocument'])
        ->whereNumber('document');
    Route::get('/arahan-beredar', [ArahanBeredarController::class, 'index']);
    Route::post('/arahan-beredar', [ArahanBeredarController::class, 'store']);
    Route::get('/arahan-beredar/{arahanBeredar}', [ArahanBeredarController::class, 'show'])
        ->whereNumber('arahanBeredar');
    Route::put('/arahan-beredar/{arahanBeredar}', [ArahanBeredarController::class, 'update'])
        ->whereNumber('arahanBeredar');
    Route::post('/arahan-beredar/{id}/restore', [ArahanBeredarController::class, 'restore'])
        ->whereNumber('id');
    Route::get('/arahan-beredar/{arahanBeredar}/oyd-media/{media}/download', [ArahanBeredarController::class, 'downloadOydMedia'])
        ->whereNumber('arahanBeredar')
        ->whereNumber('media');
    Route::post('/complaints/{complaint}/approve', [App\Http\Controllers\ComplaintController::class, 'approve'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/dispatch-to-district', [App\Http\Controllers\ComplaintController::class, 'dispatchToDistrict'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/calendar-date', [App\Http\Controllers\ComplaintController::class, 'updateCalendarDate'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/pickup', [App\Http\Controllers\ComplaintController::class, 'pickup'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/release-intake', [App\Http\Controllers\ComplaintController::class, 'releaseIntake'])
        ->whereNumber('complaint');
    Route::get('/complaints/export/xlsx', [App\Http\Controllers\ComplaintController::class, 'exportXlsx']);
    Route::get('/complaints/report/summary', [App\Http\Controllers\ComplaintController::class, 'reportSummary']);
    Route::get('/complaints/report/export/csv', [App\Http\Controllers\ComplaintController::class, 'exportReportCsv']);
    Route::get('/complaints/report/arrest-by-district', [App\Http\Controllers\ComplaintController::class, 'reportArrestByDistrict']);
    Route::get('/complaints/report/arrest-by-district/export/xlsx', [App\Http\Controllers\ComplaintController::class, 'exportArrestByDistrictXlsx']);
    Route::get('/complaints/report/arrest-by-offense', [App\Http\Controllers\ComplaintController::class, 'reportArrestByOffense']);
    Route::get('/complaints/report/arrestors', [App\Http\Controllers\ComplaintController::class, 'reportArrestors']);
    Route::get('/complaints/report/arrest-totals', [App\Http\Controllers\ComplaintController::class, 'reportArrestTotals']);
    Route::get('/complaints/report/case-prosecution', [App\Http\Controllers\ComplaintController::class, 'reportCaseProsecution']);
    Route::get('/complaints/report/oyds', [App\Http\Controllers\ComplaintController::class, 'reportOyds']);
    Route::get('/complaints/report/seizure-items', [App\Http\Controllers\ComplaintController::class, 'reportSeizureItems']);
    Route::get('/complaints/report/courts-prosecutors', [App\Http\Controllers\ComplaintController::class, 'reportCourtsAndProsecutors']);
    Route::get('/complaints/report/ip-status', [App\Http\Controllers\ComplaintController::class, 'reportIpStatus']);
    Route::get('/complaints/report/ip-status/export/xlsx', [App\Http\Controllers\ComplaintController::class, 'exportIpStatusXlsx']);
    Route::get('/complaints/report/action-status', [App\Http\Controllers\ComplaintController::class, 'reportActionStatus']);
    Route::get('/complaints/report/action-status/export/xlsx', [App\Http\Controllers\ComplaintController::class, 'exportActionStatusXlsx']);
    Route::get('/complaints/pending-approval', [App\Http\Controllers\ComplaintController::class, 'pendingApprovals']);
    Route::get('/complaints/pickup-queue', [App\Http\Controllers\ComplaintController::class, 'pickupQueue']);
    Route::get('/complaints/my-pic', [App\Http\Controllers\ComplaintController::class, 'myPicComplaints']);
    Route::post('/complaints/{complaint}/status', [App\Http\Controllers\ComplaintController::class, 'updateStatus'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/case-type', [App\Http\Controllers\ComplaintController::class, 'updateCaseType'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/assignees', [App\Http\Controllers\ComplaintController::class, 'updateAssignees'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/basic', [App\Http\Controllers\ComplaintController::class, 'updateBasic'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/receiver', [App\Http\Controllers\ComplaintController::class, 'updateComplaintReceiver'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/aj', [App\Http\Controllers\ComplaintController::class, 'updateAjPayload'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/print/borang-5/email', [App\Http\Controllers\ComplaintController::class, 'emailBorang5'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/print/tindakan-aduan/email', [App\Http\Controllers\ComplaintController::class, 'emailTindakanAduan'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/aj-action-report', [App\Http\Controllers\ComplaintController::class, 'updateAjActionReport'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/open-case', [App\Http\Controllers\ComplaintController::class, 'openCase'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/cases', [App\Http\Controllers\ComplaintController::class, 'createCase'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/cases/{case}/activate', [App\Http\Controllers\ComplaintController::class, 'activateCase'])
        ->whereNumber('complaint')
        ->whereNumber('case');
    Route::post('/complaints/{complaint}/cases/{case}/attach', [App\Http\Controllers\ComplaintController::class, 'attachCase'])
        ->whereNumber('complaint')
        ->whereNumber('case');
    Route::post('/complaints/{complaint}/aj-report', [App\Http\Controllers\ComplaintController::class, 'updateAjReport'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/oyds', [App\Http\Controllers\ComplaintController::class, 'createOyd'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/seizure-items', [App\Http\Controllers\ComplaintController::class, 'createSeizureItem'])
        ->whereNumber('complaint');
    Route::post('/complaints/{complaint}/police-reports', [App\Http\Controllers\ComplaintController::class, 'createPoliceReport'])
        ->whereNumber('complaint');
    Route::put('/complaints/{complaint}/oyds/{oyd}', [App\Http\Controllers\ComplaintController::class, 'updateOyd'])
        ->whereNumber('complaint')
        ->whereNumber('oyd');
    Route::post('/complaints/{complaint}/oyds/{oyd}/media', [App\Http\Controllers\ComplaintController::class, 'uploadOydMedia'])
        ->whereNumber('complaint')
        ->whereNumber('oyd');
    Route::delete('/complaints/{complaint}/oyds/{oyd}', [App\Http\Controllers\ComplaintController::class, 'deleteOyd'])
        ->whereNumber('complaint')
        ->whereNumber('oyd');
    Route::post('/complaints/{complaint}/oyds/{oyd}/scan-ic', [App\Http\Controllers\ComplaintController::class, 'scanOydIc'])
        ->whereNumber('complaint')
        ->whereNumber('oyd');
    Route::post('/complaints/{complaint}/scan-ic', [App\Http\Controllers\ComplaintController::class, 'scanIcTemp'])
        ->whereNumber('complaint');
    Route::delete('/complaints/{complaint}/oyd-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteOydMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::get('/complaints/{complaint}/oyd-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadOydMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::post('/complaints/{complaint}/seizure-items/{item}/media', [App\Http\Controllers\ComplaintController::class, 'uploadSeizureItemMedia'])
        ->whereNumber('complaint')
        ->whereNumber('item');
    Route::post('/complaints/{complaint}/police-reports/{report}/media', [App\Http\Controllers\ComplaintController::class, 'uploadPoliceReportMedia'])
        ->whereNumber('complaint')
        ->whereNumber('report');
    Route::post('/complaints/{complaint}/attachments', [App\Http\Controllers\ComplaintController::class, 'uploadAttachment'])
        ->whereNumber('complaint');
    Route::get('/complaints/{complaint}/attachments/{attachment}/download', [App\Http\Controllers\ComplaintController::class, 'downloadAttachment'])
        ->whereNumber('complaint')
        ->whereNumber('attachment')
        ->name('complaints.attachments.download');
    Route::delete('/complaints/{complaint}/attachments/{attachment}', [App\Http\Controllers\ComplaintController::class, 'deleteAttachment'])
        ->whereNumber('complaint')
        ->whereNumber('attachment');
    Route::delete('/complaints/{complaint}/seizure-item-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deleteSeizureItemMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::delete('/complaints/{complaint}/police-report-media/{media}', [App\Http\Controllers\ComplaintController::class, 'deletePoliceReportMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::get('/complaints/{complaint}/seizure-item-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadSeizureItemMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::get('/complaints/{complaint}/police-report-media/{media}/download', [App\Http\Controllers\ComplaintController::class, 'downloadPoliceReportMedia'])
        ->whereNumber('complaint')
        ->whereNumber('media');
    Route::post('/complaints/{complaint}/ak', [App\Http\Controllers\ComplaintController::class, 'updateAkPayload'])
        ->whereNumber('complaint');
    Route::delete('/complaints/{complaint}', [App\Http\Controllers\ComplaintController::class, 'destroy'])
        ->whereNumber('complaint');
    Route::post('/complaints/{id}/restore', [App\Http\Controllers\ComplaintController::class, 'restoreComplaint'])
        ->whereNumber('id');
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/staff', [StaffController::class, 'index']);
    Route::get('/staff/options', [StaffController::class, 'options']);
    Route::post('/staff', [StaffController::class, 'store']);
    Route::put('/staff/{staff}', [StaffController::class, 'update'])->whereNumber('staff');
    Route::post('/staff/{staff}/register-account', [StaffController::class, 'registerAccount'])->whereNumber('staff');
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
    Route::get('/audit-trail', [AuditTrailController::class, 'index']);
    Route::get('/audit-trail/export/csv', [AuditTrailController::class, 'exportCsv']);
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{user}', [UserController::class, 'update'])->whereNumber('user');
    Route::post('/references/mahkamah', [ReferenceController::class, 'storeMahkamah']);
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
Route::get('/references/offices', [ReferenceController::class, 'offices']);

// Telegram Webhook
Route::post('/telegram/webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'handleWebhook'])->name('telegram.webhook');
Route::get('/telegram/set-webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'setWebhook'])->name('telegram.set-webhook');
Route::get('/telegram/remove-webhook', [App\Http\Controllers\Telegram\WebhookController::class, 'removeWebhook'])->name('telegram.remove-webhook');
Route::get('/telegram/webhook-info', [App\Http\Controllers\Telegram\WebhookController::class, 'webhookInfo'])->name('telegram.webhook-info');
Route::get('/telegram/send-test-message', [App\Http\Controllers\Telegram\WebhookController::class, 'sendTestMessage'])->name('telegram.send-test-message'); 
Route::get('/telegram/show-token', [App\Http\Controllers\Telegram\WebhookController::class, 'showToken'])->name('telegram.show-token');

// Whatsapp Waba Webhook
use App\Http\Controllers\WhatsApp\WebhookController as WhatsAppWebhookController;
Route::get('/whatsapp', [WhatsAppWebhookController::class, 'verify']);
Route::post('/whatsapp', [WhatsAppWebhookController::class, 'handleWebhook']);

// Whatsapp Web Webhook
use App\Http\Controllers\WhatsApp\WhatsappWebController;
Route::post('/whatsappweb', [WhatsappWebController::class, 'handle']);

// Whatsapp Web internal status ingest (Node bridge -> Laravel).
// Gated by shared secret header; should only be reached over loopback in prod.
use App\Http\Controllers\Admin\WhatsappWebStatusController;
Route::post('/whatsappweb/_internal/status', [WhatsappWebStatusController::class, 'ingest'])
    ->middleware(['waweb.secret', 'throttle:120,1']);

// GitHub Webhook
use App\Http\Controllers\GitHub\WebhookController as GitHubWebhookController;
Route::post('/github-webhook', [GitHubWebhookController::class, 'handleWebhook']);
