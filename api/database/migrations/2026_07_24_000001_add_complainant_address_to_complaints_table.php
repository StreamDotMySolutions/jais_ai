<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The complainant's residential address, as read from their MyKad. Kept
     * separate from `address` (the incident/general address) so the two are not
     * conflated for complaints submitted via the WhatsApp MyKad flow.
     */
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->text('complainant_address')->nullable()->after('address');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn('complainant_address');
        });
    }
};
