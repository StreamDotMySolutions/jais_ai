<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <title>Laporan Tindakan</title>
    <style>
        @page { margin: 14mm 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
        .sheet { width: 100%; }
        .meta-top-right { text-align: right; font-size: 10px; font-weight: 700; margin-bottom: 10px; }
        .title { text-align: center; font-size: 24px; font-weight: 700; text-transform: uppercase; text-decoration: underline; margin: 0 0 18px; }
        .table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
        .row td { padding: 4px 0; vertical-align: top; }
        .label { width: 175px; }
        .value { padding-left: 8px; }
        .inline-label { width: 70px; padding-left: 20px; }
        .id-block { margin-top: 4px; margin-bottom: 12px; }
        .section-title { font-weight: 700; text-transform: uppercase; margin: 14px 0 8px; }
        .paragraph { text-align: justify; line-height: 1.5; text-transform: uppercase; min-height: 120px; }
        .signature { margin-top: 20px; width: 44%; margin-left: auto; text-align: center; }
        .signature-label { font-style: italic; margin-bottom: 6px; }
        .signature-name { text-transform: uppercase; font-weight: 700; }
        .note { margin-top: 18px; line-height: 1.5; }
        .date-note { margin-top: 26px; }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="meta-top-right">REK-BPN-02</div>
        <h1 class="title">Laporan Tindakan</h1>

        <table class="table">
            <tr class="row">
                <td class="label">No. Daftar</td>
                <td class="value">{{ $noDaftar ?: '-' }}</td>
            </tr>
            <tr class="row">
                <td class="label">Tarikh</td>
                <td class="value">{{ $reportDate ?: '-' }}</td>
                <td class="inline-label">Masa</td>
                <td class="value">{{ $reportTime ?: '-' }}</td>
            </tr>
        </table>

        <table class="table id-block">
            <tr class="row">
                <td class="label">Nama</td>
                <td class="value">{{ $officerName ?: '-' }}</td>
            </tr>
            <tr class="row">
                <td class="label">No. ID / K. Pengenalan</td>
                <td class="value">{{ $officerIdNo ?: '-' }}</td>
            </tr>
            <tr class="row">
                <td class="label">Pekerjaan</td>
                <td class="value">{{ $officerJob ?: '-' }}</td>
            </tr>
            <tr class="row">
                <td class="label">No. Telefon</td>
                <td class="value">{{ $officerPhone ?: '-' }}</td>
            </tr>
            <tr class="row">
                <td class="label">Alamat</td>
                <td class="value">{{ $officerAddress ?: '-' }}</td>
            </tr>
        </table>

        <div class="section-title">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
        <div class="paragraph">{{ $reportParagraph ?: 'LAPORAN MASIH BELUM DIISI' }}</div>

        <div class="signature">
            <div class="signature-label">Tandatangan Pemberi Maklumat</div>
            <div class="signature-name">{{ $officerName ?: '-' }}</div>
        </div>

        <div class="note">
            Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada Pemberi Maklumat.
        </div>

        <div class="signature" style="margin-top: 36px;">
            <div class="signature-label">Tandatangan Pegawai Penguatkuasa Agama</div>
        </div>

        <div class="date-note">Bertarikh pada {{ $reportDate ?: '-' }}</div>
    </div>
</body>
</html>
