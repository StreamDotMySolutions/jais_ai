<?php

namespace App\Services;

use App\Models\Complaint;
use App\Models\MobilePushToken;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MobilePushNotificationService
{
    private const COMPLAINT_ALERT_CHANNEL_ID = 'complaint-alerts-v2';

    public function sendNewComplaintToHqNotification(Complaint $complaint): void
    {
        $tokens = $this->resolveHqRecipientTokens();

        if ($tokens->isEmpty()) {
            return;
        }

        $messages = $tokens->map(function (string $token) use ($complaint) {
            return [
                'to' => $token,
                'title' => 'Aduan baharu untuk semakan HQ',
                'body' => sprintf(
                    '%s - Menunggu semakan HQ (%s)',
                    $complaint->reference_no,
                    $complaint->district_name ?: 'Daerah tidak dinyatakan'
                ),
                'data' => [
                    'complaint_id' => $complaint->id,
                    'reference_no' => $complaint->reference_no,
                    'screen' => 'complaint_detail',
                ],
                'sound' => 'bpn-alert.wav',
                'channelId' => self::COMPLAINT_ALERT_CHANNEL_ID,
            ];
        })->values()->all();

        $this->sendMessages($messages);
    }

    public function sendApprovedComplaintToDistrictNotification(Complaint $complaint): void
    {
        $tokens = $this->resolveDistrictRecipientTokens($complaint);

        if ($tokens->isEmpty()) {
            return;
        }

        $messages = $tokens->map(function (string $token) use ($complaint) {
            $districtName = $complaint->district_name ?: 'daerah berkaitan';

            return [
                'to' => $token,
                'title' => 'Aduan diterima daripada HQ',
                'body' => sprintf(
                    '%s - Kes telah disahkan dan dihantar ke %s',
                    $complaint->reference_no,
                    $districtName
                ),
                'data' => [
                    'complaint_id' => $complaint->id,
                    'reference_no' => $complaint->reference_no,
                    'screen' => 'complaint_detail',
                    'type' => 'district_assigned',
                ],
                'sound' => 'bpn-alert.wav',
                'channelId' => self::COMPLAINT_ALERT_CHANNEL_ID,
            ];
        })->values()->all();

        $this->sendMessages($messages);
    }

    public function sendTestNotificationForUser(User $user): array
    {
        $tokens = MobilePushToken::query()
            ->where('user_id', $user->id)
            ->where('is_active', true)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values();

        if ($tokens->isEmpty()) {
            return [
                'ok' => false,
                'message' => 'Tiada push token aktif untuk pengguna ini.',
            ];
        }

        $messages = $tokens->map(function (string $token) use ($user) {
            return [
                'to' => $token,
                'title' => 'Ujian notifikasi JAIS Mobile',
                'body' => sprintf('Push test berjaya dihantar kepada %s.', $user->email),
                'data' => [
                    'screen' => 'notifications',
                    'type' => 'test',
                ],
                'sound' => 'bpn-alert.wav',
                'channelId' => self::COMPLAINT_ALERT_CHANNEL_ID,
            ];
        })->values()->all();

        return $this->sendMessages($messages);
    }

    private function resolveHqRecipientTokens(): Collection
    {
        $recipientIds = User::query()
            ->where('status', 1)
            ->whereHas('roles', function ($roleQuery) {
                $roleQuery->whereIn('name', ['system', 'admin', 'pegawai', 'pegawai_hq']);
            })
            ->pluck('id');

        return $this->resolveActiveTokensForUsers($recipientIds);
    }

    private function resolveDistrictRecipientTokens(Complaint $complaint): Collection
    {
        if (! $complaint->district_id) {
            return collect();
        }

        $recipientIds = User::query()
            ->where('status', 1)
            ->whereHas('roles', function ($roleQuery) {
                $roleQuery->where('name', 'pegawai_daerah');
            })
            ->where(function ($scopeQuery) use ($complaint) {
                $scopeQuery
                    ->where('district_id', $complaint->district_id)
                    ->orWhereHas('staff', function ($staffQuery) use ($complaint) {
                        $staffQuery->where('district_id', $complaint->district_id);
                    });
            })
            ->pluck('id');

        return $this->resolveActiveTokensForUsers($recipientIds);
    }

    private function resolveActiveTokensForUsers($recipientIds): Collection
    {
        return MobilePushToken::query()
            ->whereIn('user_id', $recipientIds)
            ->where('is_active', true)
            ->pluck('token')
            ->filter()
            ->unique()
            ->values();
    }

    private function sendMessages(array $messages): array
    {
        try {
            $response = Http::timeout(20)
                ->retry(3, 1000, null, false)
                ->acceptJson()
                ->post(config('services.expo_push.url'), $messages);

            if (! $response->successful()) {
                Log::warning('Expo push failed', [
                    'status' => $response->status(),
                    'body' => $response->body(),
                    'tokens' => array_column($messages, 'to'),
                ]);

                return [
                    'ok' => false,
                    'message' => 'Expo push service memulangkan ralat.',
                    'status' => $response->status(),
                    'body' => $response->json(),
                ];
            }

            return [
                'ok' => true,
                'message' => 'Push berjaya dihantar ke Expo service.',
                'body' => $response->json(),
            ];
        } catch (\Throwable $exception) {
            Log::warning('Expo push exception', [
                'message' => $exception->getMessage(),
                'tokens' => array_column($messages, 'to'),
            ]);

            return [
                'ok' => false,
                'message' => $exception->getMessage(),
            ];
        }
    }
}
