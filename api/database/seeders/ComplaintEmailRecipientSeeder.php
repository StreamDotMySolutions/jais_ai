<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplaintEmailRecipientSeeder extends Seeder
{
    public function run(): void
    {
        $recipients = [
            ['email' => 'bpn.siasatan@gmail.com', 'label' => 'BPN Siasatan', 'sort_order' => 1],
            ['email' => 'bpn.gombak@gmail.com', 'label' => 'BPN Gombak', 'sort_order' => 2],
            ['email' => 'bpn.hululangat@gmail.com', 'label' => 'BPN Hulu Langat', 'sort_order' => 3],
            ['email' => 'bpn.huluselangor@gmail.com', 'label' => 'BPN Hulu Selangor', 'sort_order' => 4],
            ['email' => 'bpn.klang@gmail.com', 'label' => 'BPN Klang', 'sort_order' => 5],
            ['email' => 'bpn.kualalangat22@gmail.com', 'label' => 'BPN Kuala Langat', 'sort_order' => 6],
            ['email' => 'bpn.kualaselangor@gmail.com', 'label' => 'BPN Kuala Selangor', 'sort_order' => 7],
            ['email' => 'bpn.sabakbernam@gmail.com', 'label' => 'BPN Sabak Bernam', 'sort_order' => 8],
            ['email' => 'jais.sepang@gmail.com', 'label' => 'JAIS Sepang', 'sort_order' => 9],
        ];

        foreach ($recipients as $recipient) {
            DB::table('ref_complaint_email_recipients')->updateOrInsert(
                ['email' => $recipient['email']],
                [
                    'label' => $recipient['label'],
                    'sort_order' => $recipient['sort_order'],
                    'is_active' => 1,
                    'updated_at' => now(),
                    'created_at' => now(),
                ]
            );
        }
    }
}
