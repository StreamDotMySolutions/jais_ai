<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('offices')) {
            Schema::create('offices', function (Blueprint $table) {
                $table->id();
                $table->string('code')->nullable()->unique();
                $table->string('name');
                $table->string('office_type', 20)->nullable();
                $table->foreignId('district_id')->nullable()->constrained('districts')->nullOnDelete();
                $table->string('phone')->nullable();
                $table->text('address')->nullable();
                $table->boolean('is_active')->default(true);
                $table->timestamps();
            });
        }

        Schema::table('staff', function (Blueprint $table) {
            if (! Schema::hasColumn('staff', 'office_id')) {
                $table->foreignId('office_id')->nullable()->after('district_id')->constrained('offices')->nullOnDelete();
            }
        });

        $now = now();
        $petalingDistrictId = DB::table('districts')
            ->where('code', 'PET')
            ->orWhere('name', 'Petaling')
            ->value('id');

        $hqPhone = DB::table('staff')
            ->where('office_type', 'hq')
            ->whereNotNull('no_tel_pejabat')
            ->where('no_tel_pejabat', '!=', '')
            ->value('no_tel_pejabat');

        $hqAddress = DB::table('staff')
            ->where('office_type', 'hq')
            ->whereNotNull('office_address')
            ->where('office_address', '!=', '')
            ->value('office_address');

        $hqOfficeId = DB::table('offices')
            ->where('code', 'HQ')
            ->value('id');

        if (! $hqOfficeId) {
            $hqOfficeId = DB::table('offices')->insertGetId([
                'code' => 'HQ',
                'name' => 'Ibu Pejabat JAIS',
                'office_type' => 'hq',
                'district_id' => $petalingDistrictId,
                'phone' => $hqPhone,
                'address' => $hqAddress,
                'is_active' => 1,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        } else {
            DB::table('offices')
                ->where('id', $hqOfficeId)
                ->update([
                    'district_id' => $petalingDistrictId,
                    'updated_at' => $now,
                ]);
        }

        $districts = DB::table('districts')
            ->select('id', 'code', 'name')
            ->orderBy('name')
            ->get();

        foreach ($districts as $district) {
            $districtPhone = DB::table('staff')
                ->where('office_type', 'daerah')
                ->where('district_id', $district->id)
                ->whereNotNull('no_tel_pejabat')
                ->where('no_tel_pejabat', '!=', '')
                ->value('no_tel_pejabat');

            $districtAddress = DB::table('staff')
                ->where('office_type', 'daerah')
                ->where('district_id', $district->id)
                ->whereNotNull('office_address')
                ->where('office_address', '!=', '')
                ->value('office_address');

            $existingOfficeId = DB::table('offices')
                ->where('office_type', 'daerah')
                ->where('district_id', $district->id)
                ->value('id');

            if (! $existingOfficeId) {
                DB::table('offices')->insert([
                    'code' => $district->code ?: ('DAERAH-' . $district->id),
                    'name' => 'PAID ' . $district->name,
                    'office_type' => 'daerah',
                    'district_id' => $district->id,
                    'phone' => $districtPhone,
                    'address' => $districtAddress,
                    'is_active' => 1,
                    'created_at' => $now,
                    'updated_at' => $now,
                ]);
            }
        }

        DB::table('staff')
            ->where('office_type', 'hq')
            ->whereNull('office_id')
            ->update([
                'office_id' => $hqOfficeId,
            ]);

        foreach ($districts as $district) {
            $districtOfficeId = DB::table('offices')
                ->where('office_type', 'daerah')
                ->where('district_id', $district->id)
                ->value('id');

            if (! $districtOfficeId) {
                continue;
            }

            DB::table('staff')
                ->where('office_type', 'daerah')
                ->where('district_id', $district->id)
                ->whereNull('office_id')
                ->update([
                    'office_id' => $districtOfficeId,
                ]);
        }
    }

    public function down(): void
    {
        Schema::table('staff', function (Blueprint $table) {
            if (Schema::hasColumn('staff', 'office_id')) {
                $table->dropForeign(['office_id']);
                $table->dropColumn('office_id');
            }
        });

        Schema::dropIfExists('offices');
    }
};
