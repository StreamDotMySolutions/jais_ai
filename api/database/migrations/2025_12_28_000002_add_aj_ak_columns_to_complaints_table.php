<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_offense_id')) {
                $table->foreignId('aj_offense_id')->nullable()->constrained('ref_offenses')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'aj_offense_type')) {
                $table->string('aj_offense_type', 10)->nullable();
            }
            if (! Schema::hasColumn('complaints', 'aj_khalwat_detail_id')) {
                $table->foreignId('aj_khalwat_detail_id')->nullable()->constrained('ref_khalwat_details')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'aj_judi_detail_id')) {
                $table->foreignId('aj_judi_detail_id')->nullable()->constrained('ref_judi_details')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'aj_notes')) {
                $table->text('aj_notes')->nullable();
            }

            if (! Schema::hasColumn('complaints', 'ak_offense_id')) {
                $table->foreignId('ak_offense_id')->nullable()->constrained('ref_offenses')->nullOnDelete();
            }
            if (! Schema::hasColumn('complaints', 'ak_offense_type')) {
                $table->string('ak_offense_type', 10)->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_email_cc')) {
                $table->json('ak_email_cc')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_investigation_datetime')) {
                $table->dateTime('ak_investigation_datetime')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_investigator_name')) {
                $table->string('ak_investigator_name')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_file_received_date')) {
                $table->date('ak_file_received_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_ip_status')) {
                $table->string('ak_ip_status')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_ip_due_date')) {
                $table->date('ak_ip_due_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_prosecution_date')) {
                $table->date('ak_prosecution_date')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_notes')) {
                $table->text('ak_notes')->nullable();
            }
        });

        if (Schema::hasColumn('complaints', 'aj_payload')) {
            DB::statement("
                UPDATE complaints
                SET
                    aj_offense_id = CAST(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(aj_payload, '$.offense_id')), ''), 'null') AS UNSIGNED),
                    aj_offense_type = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(aj_payload, '$.offense_type_id')), ''), 'null'),
                    aj_khalwat_detail_id = CAST(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(aj_payload, '$.khalwat_detail_id')), ''), 'null') AS UNSIGNED),
                    aj_judi_detail_id = CAST(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(aj_payload, '$.judi_detail_id')), ''), 'null') AS UNSIGNED),
                    aj_notes = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(aj_payload, '$.notes')), ''), 'null')
                WHERE aj_payload IS NOT NULL
            ");
        }

        if (Schema::hasColumn('complaints', 'ak_payload')) {
            DB::statement("
                UPDATE complaints
                SET
                    ak_offense_id = CAST(NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.offense_id')), ''), 'null') AS UNSIGNED),
                    ak_offense_type = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.offense_type_id')), ''), 'null'),
                    ak_email_cc = JSON_EXTRACT(ak_payload, '$.email_cc'),
                    ak_investigation_datetime = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.investigation_datetime')), ''), 'null'),
                    ak_investigator_name = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.investigator_name')), ''), 'null'),
                    ak_file_received_date = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.file_received_date')), ''), 'null'),
                    ak_ip_status = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.ip_status')), ''), 'null'),
                    ak_ip_due_date = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.ip_due_date')), ''), 'null'),
                    ak_prosecution_date = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.prosecution_date')), ''), 'null'),
                    ak_notes = NULLIF(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(ak_payload, '$.notes')), ''), 'null')
                WHERE ak_payload IS NOT NULL
            ");
        }

        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_payload')) {
                $table->dropColumn('aj_payload');
            }
            if (Schema::hasColumn('complaints', 'ak_payload')) {
                $table->dropColumn('ak_payload');
            }
        });
    }

    public function down(): void
    {
        Schema::table('complaints', function (Blueprint $table) {
            if (! Schema::hasColumn('complaints', 'aj_payload')) {
                $table->json('aj_payload')->nullable();
            }
            if (! Schema::hasColumn('complaints', 'ak_payload')) {
                $table->json('ak_payload')->nullable();
            }
        });

        Schema::table('complaints', function (Blueprint $table) {
            if (Schema::hasColumn('complaints', 'aj_offense_id')) {
                $table->dropForeign(['aj_offense_id']);
                $table->dropColumn('aj_offense_id');
            }
            if (Schema::hasColumn('complaints', 'aj_offense_type')) {
                $table->dropColumn('aj_offense_type');
            }
            if (Schema::hasColumn('complaints', 'aj_khalwat_detail_id')) {
                $table->dropForeign(['aj_khalwat_detail_id']);
                $table->dropColumn('aj_khalwat_detail_id');
            }
            if (Schema::hasColumn('complaints', 'aj_judi_detail_id')) {
                $table->dropForeign(['aj_judi_detail_id']);
                $table->dropColumn('aj_judi_detail_id');
            }
            if (Schema::hasColumn('complaints', 'aj_notes')) {
                $table->dropColumn('aj_notes');
            }
            if (Schema::hasColumn('complaints', 'ak_offense_id')) {
                $table->dropForeign(['ak_offense_id']);
                $table->dropColumn('ak_offense_id');
            }
            if (Schema::hasColumn('complaints', 'ak_offense_type')) {
                $table->dropColumn('ak_offense_type');
            }
            if (Schema::hasColumn('complaints', 'ak_email_cc')) {
                $table->dropColumn('ak_email_cc');
            }
            if (Schema::hasColumn('complaints', 'ak_investigation_datetime')) {
                $table->dropColumn('ak_investigation_datetime');
            }
            if (Schema::hasColumn('complaints', 'ak_investigator_name')) {
                $table->dropColumn('ak_investigator_name');
            }
            if (Schema::hasColumn('complaints', 'ak_file_received_date')) {
                $table->dropColumn('ak_file_received_date');
            }
            if (Schema::hasColumn('complaints', 'ak_ip_status')) {
                $table->dropColumn('ak_ip_status');
            }
            if (Schema::hasColumn('complaints', 'ak_ip_due_date')) {
                $table->dropColumn('ak_ip_due_date');
            }
            if (Schema::hasColumn('complaints', 'ak_prosecution_date')) {
                $table->dropColumn('ak_prosecution_date');
            }
            if (Schema::hasColumn('complaints', 'ak_notes')) {
                $table->dropColumn('ak_notes');
            }
        });
    }
};
