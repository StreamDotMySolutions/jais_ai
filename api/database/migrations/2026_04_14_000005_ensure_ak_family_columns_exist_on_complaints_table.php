<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $missing = [];

        if (! Schema::hasColumn('complaints', 'ak_subtype')) {
            $missing[] = 'ak_subtype';
        }
        if (! Schema::hasColumn('complaints', 'ak_partner_name')) {
            $missing[] = 'ak_partner_name';
        }
        if (! Schema::hasColumn('complaints', 'ak_cerai_count')) {
            $missing[] = 'ak_cerai_count';
        }
        if (! Schema::hasColumn('complaints', 'ak_cerai_talaq_count')) {
            $missing[] = 'ak_cerai_talaq_count';
        }
        if (! Schema::hasColumn('complaints', 'ak_poligami_marriage_count')) {
            $missing[] = 'ak_poligami_marriage_count';
        }
        if (! Schema::hasColumn('complaints', 'ak_poligami_wife_count')) {
            $missing[] = 'ak_poligami_wife_count';
        }
        if (! Schema::hasColumn('complaints', 'ak_event_date')) {
            $missing[] = 'ak_event_date';
        }
        if (! Schema::hasColumn('complaints', 'ak_event_place')) {
            $missing[] = 'ak_event_place';
        }
        if (! Schema::hasColumn('complaints', 'ak_event_time')) {
            $missing[] = 'ak_event_time';
        }
        if (! Schema::hasColumn('complaints', 'ak_event_location')) {
            $missing[] = 'ak_event_location';
        }
        if (! Schema::hasColumn('complaints', 'ak_rujuk_date')) {
            $missing[] = 'ak_rujuk_date';
        }

        if ($missing === []) {
            return;
        }

        Schema::table('complaints', function (Blueprint $table) use ($missing) {
            foreach ($missing as $column) {
                switch ($column) {
                    case 'ak_subtype':
                        $table->string('ak_subtype', 50)->nullable();
                        break;
                    case 'ak_partner_name':
                        $table->string('ak_partner_name')->nullable();
                        break;
                    case 'ak_cerai_count':
                        $table->unsignedTinyInteger('ak_cerai_count')->nullable();
                        break;
                    case 'ak_cerai_talaq_count':
                        $table->unsignedTinyInteger('ak_cerai_talaq_count')->nullable();
                        break;
                    case 'ak_poligami_marriage_count':
                        $table->unsignedTinyInteger('ak_poligami_marriage_count')->nullable();
                        break;
                    case 'ak_poligami_wife_count':
                        $table->unsignedTinyInteger('ak_poligami_wife_count')->nullable();
                        break;
                    case 'ak_event_date':
                        $table->date('ak_event_date')->nullable();
                        break;
                    case 'ak_event_place':
                        $table->string('ak_event_place')->nullable();
                        break;
                    case 'ak_event_time':
                        $table->time('ak_event_time')->nullable();
                        break;
                    case 'ak_event_location':
                        $table->text('ak_event_location')->nullable();
                        break;
                    case 'ak_rujuk_date':
                        $table->date('ak_rujuk_date')->nullable();
                        break;
                }
            }
        });
    }

    public function down(): void
    {
        $existing = array_values(array_filter([
            Schema::hasColumn('complaints', 'ak_subtype') ? 'ak_subtype' : null,
            Schema::hasColumn('complaints', 'ak_partner_name') ? 'ak_partner_name' : null,
            Schema::hasColumn('complaints', 'ak_cerai_count') ? 'ak_cerai_count' : null,
            Schema::hasColumn('complaints', 'ak_cerai_talaq_count') ? 'ak_cerai_talaq_count' : null,
            Schema::hasColumn('complaints', 'ak_poligami_marriage_count') ? 'ak_poligami_marriage_count' : null,
            Schema::hasColumn('complaints', 'ak_poligami_wife_count') ? 'ak_poligami_wife_count' : null,
            Schema::hasColumn('complaints', 'ak_event_date') ? 'ak_event_date' : null,
            Schema::hasColumn('complaints', 'ak_event_place') ? 'ak_event_place' : null,
            Schema::hasColumn('complaints', 'ak_event_time') ? 'ak_event_time' : null,
            Schema::hasColumn('complaints', 'ak_event_location') ? 'ak_event_location' : null,
            Schema::hasColumn('complaints', 'ak_rujuk_date') ? 'ak_rujuk_date' : null,
        ]));

        if ($existing === []) {
            return;
        }

        Schema::table('complaints', function (Blueprint $table) use ($existing) {
            $table->dropColumn($existing);
        });
    }
};
