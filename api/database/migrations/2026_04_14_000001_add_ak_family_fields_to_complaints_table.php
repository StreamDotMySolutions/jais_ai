<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->string('ak_subtype', 50)->nullable()->after('ak_offense_id');
            $table->string('ak_partner_name')->nullable()->after('ak_subtype');
            $table->unsignedTinyInteger('ak_cerai_count')->nullable()->after('ak_partner_name');
            $table->date('ak_event_date')->nullable()->after('ak_cerai_count');
            $table->string('ak_event_place')->nullable()->after('ak_event_date');
            $table->time('ak_event_time')->nullable()->after('ak_event_place');
            $table->text('ak_event_location')->nullable()->after('ak_event_time');
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            $table->dropColumn([
                'ak_subtype',
                'ak_partner_name',
                'ak_cerai_count',
                'ak_event_date',
                'ak_event_place',
                'ak_event_time',
                'ak_event_location',
            ]);
        });
    }
};
