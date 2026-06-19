<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Desired column order (audit 6 at the end, untouched):
        // General(1-39) → Shared(40-45) → AJ(46-88) → AK(89-118) → Audit(119-124)

        // Each ALTER TABLE moves one column AFTER its predecessor in the new order.
        // All types match INFORMATION_SCHEMA exactly.

        // ========== STEP 1: Shared columns after approver_confirmed_at ==========
        DB::statement('ALTER TABLE complaints MODIFY current_address text NULL AFTER approver_confirmed_at');
        DB::statement('ALTER TABLE complaints MODIFY pic_user_id bigint unsigned NULL AFTER current_address');
        DB::statement('ALTER TABLE complaints MODIFY pic_assigned_at timestamp NULL AFTER pic_user_id');
        DB::statement('ALTER TABLE complaints MODIFY handover_at datetime NULL AFTER pic_assigned_at');
        DB::statement('ALTER TABLE complaints MODIFY handover_notes text NULL AFTER handover_at');
        DB::statement('ALTER TABLE complaints MODIFY case_register_no varchar(255) NULL AFTER handover_notes');

        // ========== STEP 2: All AJ columns after case_register_no ==========
        DB::statement('ALTER TABLE complaints MODIFY aj_offense_id bigint unsigned NULL AFTER case_register_no');
        DB::statement('ALTER TABLE complaints MODIFY aj_offense_type varchar(10) NULL AFTER aj_offense_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_khalwat_detail_id bigint unsigned NULL AFTER aj_offense_type');
        DB::statement('ALTER TABLE complaints MODIFY aj_judi_detail_id bigint unsigned NULL AFTER aj_khalwat_detail_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_notes text NULL AFTER aj_judi_detail_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_ppa_classification varchar(10) NULL AFTER aj_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_current_status varchar(255) NULL AFTER aj_ppa_classification');
        DB::statement('ALTER TABLE complaints MODIFY aj_current_status_other varchar(255) NULL AFTER aj_current_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_op_category varchar(255) NULL AFTER aj_current_status_other');
        DB::statement('ALTER TABLE complaints MODIFY aj_op_case_status varchar(255) NULL AFTER aj_op_category');
        DB::statement('ALTER TABLE complaints MODIFY aj_op_notes text NULL AFTER aj_op_case_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_file_no varchar(255) NULL AFTER aj_op_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_arrest_status varchar(20) NULL AFTER aj_file_no');
        DB::statement('ALTER TABLE complaints MODIFY aj_male_count int unsigned NULL AFTER aj_arrest_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_female_count int unsigned NULL AFTER aj_male_count');
        DB::statement('ALTER TABLE complaints MODIFY aj_other_count int unsigned NULL AFTER aj_female_count');
        DB::statement('ALTER TABLE complaints MODIFY aj_report_no varchar(255) NULL AFTER aj_other_count');
        DB::statement('ALTER TABLE complaints MODIFY aj_action_datetime datetime NULL AFTER aj_report_no');
        DB::statement('ALTER TABLE complaints MODIFY aj_report_offense_id bigint unsigned NULL AFTER aj_action_datetime');
        DB::statement('ALTER TABLE complaints MODIFY aj_arrest_by varchar(255) NULL AFTER aj_report_offense_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_arrest_staff_id bigint unsigned NULL AFTER aj_arrest_by');
        DB::statement('ALTER TABLE complaints MODIFY aj_statement_datetime datetime NULL AFTER aj_arrest_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_court_date date NULL AFTER aj_statement_datetime');
        DB::statement('ALTER TABLE complaints MODIFY aj_report_notes text NULL AFTER aj_court_date');
        DB::statement('ALTER TABLE complaints MODIFY aj_directive_staff_id bigint unsigned NULL AFTER aj_report_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_handover_staff_id bigint unsigned NULL AFTER aj_directive_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_directive_at datetime NULL AFTER aj_handover_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_directive_notes text NULL AFTER aj_directive_at');
        DB::statement('ALTER TABLE complaints MODIFY aj_seizure_status varchar(20) NULL AFTER aj_directive_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_police_report_status varchar(255) NULL AFTER aj_seizure_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_supervisor_staff_id bigint unsigned NULL AFTER aj_police_report_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_ip_status varchar(255) NULL AFTER aj_supervisor_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_ip_due_date date NULL AFTER aj_ip_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_kpp_due_date date NULL AFTER aj_ip_due_date');
        DB::statement('ALTER TABLE complaints MODIFY aj_jpss_due_date date NULL AFTER aj_kpp_due_date');
        DB::statement('ALTER TABLE complaints MODIFY aj_investigation_notes text NULL AFTER aj_jpss_due_date');
        DB::statement('ALTER TABLE complaints MODIFY aj_prosecution_status varchar(255) NULL AFTER aj_investigation_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_prosecutor_staff_id bigint unsigned NULL AFTER aj_prosecution_status');
        DB::statement('ALTER TABLE complaints MODIFY aj_mahkamah_id bigint unsigned NULL AFTER aj_prosecutor_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_fine text NULL AFTER aj_mahkamah_id');
        DB::statement('ALTER TABLE complaints MODIFY aj_prosecution_notes text NULL AFTER aj_fine');
        DB::statement('ALTER TABLE complaints MODIFY aj_fir_no varchar(255) NULL AFTER aj_prosecution_notes');
        DB::statement('ALTER TABLE complaints MODIFY aj_charge_recommendations json NULL AFTER aj_fir_no');

        // ========== STEP 3: All AK columns after aj_charge_recommendations ==========
        DB::statement('ALTER TABLE complaints MODIFY ak_offense_id bigint unsigned NULL AFTER aj_charge_recommendations');
        DB::statement('ALTER TABLE complaints MODIFY ak_subtype varchar(50) NULL AFTER ak_offense_id');
        DB::statement('ALTER TABLE complaints MODIFY ak_partner_name varchar(255) NULL AFTER ak_subtype');
        DB::statement('ALTER TABLE complaints MODIFY ak_cerai_count tinyint unsigned NULL AFTER ak_partner_name');
        DB::statement('ALTER TABLE complaints MODIFY ak_event_date date NULL AFTER ak_cerai_count');
        DB::statement('ALTER TABLE complaints MODIFY ak_event_place varchar(255) NULL AFTER ak_event_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_event_time time NULL AFTER ak_event_place');
        DB::statement('ALTER TABLE complaints MODIFY ak_offense_type varchar(10) NULL AFTER ak_event_time');
        DB::statement('ALTER TABLE complaints MODIFY ak_email_cc json NULL AFTER ak_offense_type');
        DB::statement('ALTER TABLE complaints MODIFY ak_investigation_datetime datetime NULL AFTER ak_email_cc');
        DB::statement('ALTER TABLE complaints MODIFY ak_investigator_name varchar(255) NULL AFTER ak_investigation_datetime');
        DB::statement('ALTER TABLE complaints MODIFY ak_file_received_date date NULL AFTER ak_investigator_name');
        DB::statement('ALTER TABLE complaints MODIFY ak_ip_status varchar(255) NULL AFTER ak_file_received_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_ip_due_date date NULL AFTER ak_ip_status');
        DB::statement('ALTER TABLE complaints MODIFY ak_prosecution_date date NULL AFTER ak_ip_due_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_notes text NULL AFTER ak_prosecution_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_supervisor_staff_id bigint unsigned NULL AFTER ak_notes');
        DB::statement('ALTER TABLE complaints MODIFY ak_investigator_staff_id bigint unsigned NULL AFTER ak_supervisor_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY ak_rujuk_date date NULL AFTER ak_investigator_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY ak_poligami_marriage_count tinyint unsigned NULL AFTER ak_rujuk_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_poligami_wife_count tinyint unsigned NULL AFTER ak_poligami_marriage_count');
        DB::statement('ALTER TABLE complaints MODIFY ak_cerai_talaq_count tinyint unsigned NULL AFTER ak_poligami_wife_count');
        DB::statement('ALTER TABLE complaints MODIFY ak_charge_recommendations json NULL AFTER ak_cerai_talaq_count');
        DB::statement('ALTER TABLE complaints MODIFY ak_prosecution_status varchar(255) NULL AFTER ak_charge_recommendations');
        DB::statement('ALTER TABLE complaints MODIFY ak_prosecutor_staff_id bigint unsigned NULL AFTER ak_prosecution_status');
        DB::statement('ALTER TABLE complaints MODIFY ak_hearing_date date NULL AFTER ak_prosecutor_staff_id');
        DB::statement('ALTER TABLE complaints MODIFY ak_mahkamah_id bigint unsigned NULL AFTER ak_hearing_date');
        DB::statement('ALTER TABLE complaints MODIFY ak_court_decision text NULL AFTER ak_mahkamah_id');
        DB::statement('ALTER TABLE complaints MODIFY ak_prosecution_notes text NULL AFTER ak_court_decision');
        DB::statement('ALTER TABLE complaints MODIFY ak_prosecution_charges json NULL AFTER ak_prosecution_notes');
    }

    public function down(): void
    {
        // Reversing column reorder would reset to original scattered positions.
        // Not implemented — re-running migration from scratch achieves the same.
    }
};
