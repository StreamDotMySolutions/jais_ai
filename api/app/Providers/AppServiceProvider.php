<?php

namespace App\Providers;

use App\Models\Complaint;
use App\Models\ComplaintOyd;
use App\Models\ComplaintOydMedia;
use App\Models\ComplaintSeizureItem;
use App\Models\ComplaintSeizureItemMedia;
use App\Models\Appointment;
use App\Models\ArahanBeredar;
use App\Models\ArahanBeredarOyd;
use App\Models\ArahanBeredarOydMedia;
use App\Models\IwaranWarrant;
use App\Models\IwaranWaranAttachment;
use App\Models\IwaranCourtDocument;
use App\Observers\ComplaintObserver;
use App\Observers\ComplaintOydObserver;
use App\Observers\ComplaintOydMediaObserver;
use App\Observers\ComplaintSeizureItemObserver;
use App\Observers\ComplaintSeizureItemMediaObserver;
use App\Observers\AppointmentObserver;
use App\Observers\ArahanBeredarObserver;
use App\Observers\ArahanBeredarOydObserver;
use App\Observers\ArahanBeredarOydMediaObserver;
use App\Observers\IwaranWarrantObserver;
use App\Observers\IwaranWaranAttachmentObserver;
use App\Observers\IwaranCourtDocumentObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Audit trail: start with Aduan (Complaint). Expand to other modules later.
        Complaint::observe(ComplaintObserver::class);
        ComplaintOyd::observe(ComplaintOydObserver::class);
        ComplaintOydMedia::observe(ComplaintOydMediaObserver::class);
        ComplaintSeizureItem::observe(ComplaintSeizureItemObserver::class);
        ComplaintSeizureItemMedia::observe(ComplaintSeizureItemMediaObserver::class);
        Appointment::observe(AppointmentObserver::class);
        ArahanBeredar::observe(ArahanBeredarObserver::class);
        ArahanBeredarOyd::observe(ArahanBeredarOydObserver::class);
        ArahanBeredarOydMedia::observe(ArahanBeredarOydMediaObserver::class);
        IwaranWarrant::observe(IwaranWarrantObserver::class);
        IwaranWaranAttachment::observe(IwaranWaranAttachmentObserver::class);
        IwaranCourtDocument::observe(IwaranCourtDocumentObserver::class);
    }
}
