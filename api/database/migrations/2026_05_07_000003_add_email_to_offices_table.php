<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            if (! Schema::hasColumn('offices', 'email')) {
                $table->string('email')->nullable()->after('phone');
            }
        });

        $now = now();
        $districtOfficeEmails = [
            'GOM' => 'bpn.gombak@gmail.com',
            'HLA' => 'bpn.hululangat@gmail.com',
            'HLS' => 'bpn.huluselangor@gmail.com',
            'KLG' => 'bpn.klang@gmail.com',
            'KSE' => 'bpn.kualaselangor@gmail.com',
            'KUL' => 'bpn.kualalangat22@gmail.com',
            'SBN' => 'bpn.sabakbernam@gmail.com',
            'SEP' => 'jais.sepang@gmail.com',
        ];

        foreach ($districtOfficeEmails as $code => $email) {
            DB::table('offices')
                ->where('code', $code)
                ->update([
                    'email' => $email,
                    'updated_at' => $now,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('offices', function (Blueprint $table) {
            if (Schema::hasColumn('offices', 'email')) {
                $table->dropColumn('email');
            }
        });
    }
};
