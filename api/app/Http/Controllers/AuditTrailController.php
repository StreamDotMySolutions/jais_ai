<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\Complaint;
use App\Models\ComplaintOyd;
use App\Models\ComplaintOydMedia;
use App\Models\ComplaintSeizureItem;
use App\Models\ComplaintSeizureItemMedia;
use Illuminate\Http\Request;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Str;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AuditTrailController extends Controller
{
    public function index(Request $request)
    {
        $perPage = (int) $request->query('per_page', 10);
        if ($perPage <= 0 || $perPage > 100) {
            $perPage = 10;
        }
        $query = $this->buildFilteredQuery($request);

        $logs = $query->paginate($perPage);
        $data = $this->transformLogs(collect($logs->items()));

        return response()->json([
            'message' => 'Audit trail list',
            'data' => $data,
            'meta' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'per_page' => $logs->perPage(),
                'total' => $logs->total(),
            ],
            'filters' => $this->filterOptions(),
        ]);
    }

    public function exportCsv(Request $request): StreamedResponse
    {
        $rows = $this->buildFilteredQuery($request)->limit(5000)->get();
        $filename = 'audit-trail-' . now()->format('Ymd-His') . '.csv';

        return response()->streamDownload(function () use ($rows) {
            $handle = fopen('php://output', 'w');
            fprintf($handle, chr(0xEF) . chr(0xBB) . chr(0xBF));

            fputcsv($handle, [
                'Tarikh',
                'Modul',
                'Event',
                'Entiti',
                'Rekod ID',
                'No Aduan',
                'Pengguna',
                'Email',
                'Changed Keys',
                'Old Values',
                'New Values',
                'Method',
                'IP',
                'URL',
            ]);

            foreach ($this->transformLogs($rows) as $item) {
                fputcsv($handle, [
                    $item['created_at_human'] ?? '',
                    $item['module'] ?? '',
                    $item['event'] ?? '',
                    $item['entity'] ?? '',
                    $item['auditable_id'] ?? '',
                    $item['complaint_reference_no'] ?? '',
                    $item['user']['name'] ?? '',
                    $item['user']['email'] ?? '',
                    implode(', ', $item['changed_keys'] ?? []),
                    json_encode($item['old_values'] ?? [], JSON_UNESCAPED_UNICODE),
                    json_encode($item['new_values'] ?? [], JSON_UNESCAPED_UNICODE),
                    $item['method'] ?? '',
                    $item['ip'] ?? '',
                    $item['url'] ?? '',
                ]);
            }

            fclose($handle);
        }, $filename, [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    private function ensureAuthorized(Request $request): void
    {
        $user = $request->user();
        abort_if(! $user || $user->hasAnyRole(['awam', 'user']), 403, 'Unauthorized');
    }

    private function buildFilteredQuery(Request $request): Builder
    {
        $this->ensureAuthorized($request);

        $keyword = trim((string) $request->query('keyword', ''));
        $module = trim((string) $request->query('module', ''));
        $event = trim((string) $request->query('event', ''));
        $entity = trim((string) $request->query('entity', ''));
        $dateFrom = trim((string) $request->query('date_from', ''));
        $dateTo = trim((string) $request->query('date_to', ''));

        $query = AuditLog::query()
            ->with([
                'user:id,name,email',
                'user.staff:id,user_id,staff_id',
            ])
            ->orderByDesc('created_at');

        if ($keyword !== '') {
            $query->where(function (Builder $subQuery) use ($keyword) {
                $subQuery
                    ->where('module', 'like', '%' . $keyword . '%')
                    ->orWhere('event', 'like', '%' . $keyword . '%')
                    ->orWhere('auditable_type', 'like', '%' . $keyword . '%')
                    ->orWhereHas('user', function (Builder $userQuery) use ($keyword) {
                        $userQuery
                            ->where('name', 'like', '%' . $keyword . '%')
                            ->orWhere('email', 'like', '%' . $keyword . '%');
                    });

                if (is_numeric($keyword)) {
                    $subQuery->orWhere('auditable_id', (int) $keyword);
                }
            });
        }

        if ($module !== '') {
            $query->where('module', $module);
        }

        if ($event !== '') {
            $query->where('event', $event);
        }

        if ($entity !== '') {
            if (str_contains($entity, '\\')) {
                $query->where('auditable_type', $entity);
            } else {
                $query->whereRaw("SUBSTRING_INDEX(auditable_type, '\\\\', -1) = ?", [$entity]);
            }
        }

        if ($dateFrom !== '') {
            $query->whereDate('created_at', '>=', $dateFrom);
        }

        if ($dateTo !== '') {
            $query->whereDate('created_at', '<=', $dateTo);
        }

        return $query;
    }

    private function filterOptions(): array
    {
        $rawEntities = AuditLog::query()
            ->select('auditable_type')
            ->whereNotNull('auditable_type')
            ->where('auditable_type', '!=', '')
            ->distinct()
            ->orderBy('auditable_type')
            ->pluck('auditable_type')
            ->values();

        $entities = $rawEntities->map(fn ($type) => [
            'value' => $type,
            'label' => class_basename($type),
        ])->unique('label')->values();

        return [
            'modules' => AuditLog::query()
                ->select('module')
                ->whereNotNull('module')
                ->where('module', '!=', '')
                ->distinct()
                ->orderBy('module')
                ->pluck('module')
                ->values(),
            'events' => AuditLog::query()
                ->select('event')
                ->whereNotNull('event')
                ->where('event', '!=', '')
                ->distinct()
                ->orderBy('event')
                ->pluck('event')
                ->values(),
            'entities' => $entities,
        ];
    }

    private function transformLogs(Collection $logs): Collection
    {
        return $logs->map(function (AuditLog $log) {
            return [
                'id' => $log->id,
                'module' => $log->module ?: '-',
                'event' => $log->event,
                'auditable_type' => $log->auditable_type,
                'entity' => class_basename($log->auditable_type),
                'auditable_id' => $log->auditable_id,
                'complaint_reference_no' => $this->resolveComplaintReferenceNo($log),
                'changed_keys' => $log->changed_keys ?: [],
                'old_values' => $log->old_values ?: [],
                'new_values' => $log->new_values ?: [],
                'method' => $log->method,
                'ip' => $log->ip,
                'url' => $log->url,
                'user_agent' => $log->user_agent,
                'created_at' => optional($log->created_at)->toDateTimeString(),
                'created_at_human' => optional($log->created_at)->format('d/m/Y H:i:s'),
                'user' => $log->user ? [
                    'id' => $log->user->id,
                    'name' => $log->user->name,
                    'email' => $log->user->email,
                    'account_no' => optional($log->user->staff)->staff_id ?: (string) $log->user->id,
                ] : null,
                'changed_summary' => collect($log->changed_keys ?: [])
                    ->map(fn ($key) => Str::of((string) $key)->replace('_', ' ')->title()->value())
                    ->take(5)
                    ->values(),
            ];
        })->values();
    }

    private function resolveComplaintReferenceNo(AuditLog $log): ?string
    {
        $type = ltrim((string) $log->auditable_type, '\\');
        $id = (int) $log->auditable_id;

        if ($id <= 0) {
            return null;
        }

        if ($type === Complaint::class) {
            return Complaint::withTrashed()->whereKey($id)->value('reference_no');
        }

        if ($type === ComplaintOyd::class) {
            $complaintId = ComplaintOyd::withTrashed()->whereKey($id)->value('complaint_id');
            return $complaintId ? Complaint::withTrashed()->whereKey($complaintId)->value('reference_no') : null;
        }

        if ($type === ComplaintOydMedia::class) {
            $oydId = ComplaintOydMedia::withTrashed()->whereKey($id)->value('complaint_oyd_id');
            if (! $oydId) {
                return null;
            }
            $complaintId = ComplaintOyd::withTrashed()->whereKey($oydId)->value('complaint_id');
            return $complaintId ? Complaint::withTrashed()->whereKey($complaintId)->value('reference_no') : null;
        }

        if ($type === ComplaintSeizureItem::class) {
            $complaintId = ComplaintSeizureItem::withTrashed()->whereKey($id)->value('complaint_id');
            return $complaintId ? Complaint::withTrashed()->whereKey($complaintId)->value('reference_no') : null;
        }

        if ($type === ComplaintSeizureItemMedia::class) {
            $itemId = ComplaintSeizureItemMedia::withTrashed()->whereKey($id)->value('complaint_seizure_item_id');
            if (! $itemId) {
                return null;
            }
            $complaintId = ComplaintSeizureItem::withTrashed()->whereKey($itemId)->value('complaint_id');
            return $complaintId ? Complaint::withTrashed()->whereKey($complaintId)->value('reference_no') : null;
        }

        return null;
    }
}
