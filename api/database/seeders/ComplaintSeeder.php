<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Models\Complaint;
use App\Models\District;
use App\Models\User;

class ComplaintSeeder extends Seeder
{
    public function run(): void
    {
        $districts = District::where('is_active', true)->orderBy('name')->get();

        $publicUser = User::where('email', 'user@local')->first();
        $pegawaiHq = User::where('email', 'pegawai@local')->first();

        $statusId = DB::table('complaint_statuses')
            ->where('code', 'baru')
            ->value('id');

        $baseDate = now()->subDays(20);
        $counter = 0;

        foreach ($districts as $district) {
            for ($i = 1; $i <= 2; $i++) {
                $caseType = $i === 1 ? 'AJ' : 'AK';
                $date = $baseDate->copy()->addDays($counter);
                $dateCode = $date->format('ymd');
                $sequence = str_pad((string) $i, 4, '0', STR_PAD_LEFT);
                $referenceNo = sprintf(
                    'JAIS-%s-%s-%s-%s',
                    $caseType,
                    strtoupper($district->code ?? 'NA'),
                    $dateCode,
                    $sequence
                );

                $payload = [
                    'reference_no' => $referenceNo,
                    'case_type' => $caseType,
                    'complainant_name' => sprintf('Pengadu %s %d', $district->name, $i),
                    'identification_number' => sprintf('90010110%04d', $counter + $i),
                    'contact_number' => sprintf('01%08d', ($counter * 2) + $i),
                    'address' => sprintf('Alamat %s', $district->name),
                    'district_name' => $district->name,
                    'district_id' => $district->id,
                    'summary' => sprintf('Aduan contoh untuk %s.', $district->name),
                    'channel' => 'web',
                    'submitted_by_user_id' => $i === 1 ? optional($publicUser)->id : optional($pegawaiHq)->id,
                    'status_id' => $statusId,
                    'complaint_year' => (int) $date->format('Y'),
                    'complaint_date' => $date->toDateString(),
                    'complaint_time' => $date->format('H:i:s'),
                    'submitted_at' => $date,
                    'current_stage' => 'baru',
                ];

                Complaint::updateOrCreate(
                    ['reference_no' => $referenceNo],
                    $payload
                );

                $counter++;
            }
        }
    }
}
