<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IwaranWarrant extends Model
{
    use HasFactory;

    protected $table = 'iwaran_warans';
    protected $guarded = ['id'];

    public function pendaftar()
    {
        return $this->belongsTo(Staff::class, 'pendaftar_staff_id');
    }

    public function pelaksana()
    {
        return $this->belongsTo(Staff::class, 'tindakan_oleh_staff_id');
    }

    public function daerah()
    {
        return $this->belongsTo(District::class, 'daerah_id');
    }

    public function mahkamah()
    {
        return $this->belongsTo(RefMahkamah::class, 'mahkamah_id');
    }

    public function jenisKesMal()
    {
        return $this->belongsTo(RefIwaranJenisKes::class, 'jenis_kes_mal_id');
    }

    public function jenisKesJenayah()
    {
        return $this->belongsTo(RefIwaranJenisKes::class, 'jenis_kes_jenayah_id');
    }

    public function hasilPerlaksanaan()
    {
        return $this->belongsTo(RefIwaranHasil::class, 'hasil_perlaksanaan_id');
    }

    public function attachments()
    {
        return $this->hasMany(IwaranWaranAttachment::class, 'iwaran_waran_id')->latest();
    }
}
