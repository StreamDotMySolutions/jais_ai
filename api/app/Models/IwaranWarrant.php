<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

class IwaranWarrant extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'iwaran_warans';
    protected $guarded = ['id'];

    public const STAGE_BARU = 'baru';
    public const STAGE_DIHANTAR_KE_DAERAH = 'dihantar_ke_daerah';
    public const STAGE_DITERIMA_DAERAH = 'diterima_daerah';
    public const STAGE_HANTAR_KE_MAHKAMAH = 'hantar_ke_mahkamah';

    public function pendaftar()
    {
        return $this->belongsTo(Staff::class, 'pendaftar_staff_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by_user_id');
    }

    public function deletedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'deleted_by_user_id');
    }

    public function sentToDistrictBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_to_district_by_user_id');
    }

    public function receivedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'received_by_user_id');
    }

    public function sentToCourtBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'sent_to_court_by_user_id');
    }

    public function pelaksana(): BelongsTo
    {
        return $this->belongsTo(Staff::class, 'tindakan_oleh_staff_id');
    }

    public function daerah(): BelongsTo
    {
        return $this->belongsTo(District::class, 'daerah_id');
    }

    public function mahkamah(): BelongsTo
    {
        return $this->belongsTo(RefMahkamah::class, 'mahkamah_id');
    }

    public function jenisKesMal(): BelongsTo
    {
        return $this->belongsTo(RefIwaranJenisKes::class, 'jenis_kes_mal_id');
    }

    public function jenisKesJenayah(): BelongsTo
    {
        return $this->belongsTo(RefIwaranJenisKes::class, 'jenis_kes_jenayah_id');
    }

    public function hasilPerlaksanaan(): BelongsTo
    {
        return $this->belongsTo(RefIwaranHasil::class, 'hasil_perlaksanaan_id');
    }

    public function attachments()
    {
        return $this->hasMany(IwaranWaranAttachment::class, 'iwaran_waran_id')->latest();
    }

    public function courtDocuments()
    {
        return $this->hasMany(IwaranCourtDocument::class, 'iwaran_waran_id')->latest();
    }
}
