<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <title>Laporan Tindakan</title>
    <style>
        @page {
            margin: 16mm 17mm 18mm 17mm;
        }

        body {
            font-family: Verdana, Arial, Helvetica, sans-serif;
            color: #111111;
            font-size: 10px;
            margin: 0;
            padding: 0;
        }

        .sheet {
            width: 100%;
        }

        .header {
            margin-bottom: 3.1rem;
        }

        .meta {
            text-align: right;
            margin-bottom: 2.8rem;
            font-size: 0.72rem;
            font-weight: 700;
        }

        .title {
            margin: 0;
            text-align: center;
            font-size: 0.98rem;
            font-weight: 700;
            letter-spacing: 0;
            text-decoration: underline;
            text-transform: uppercase;
        }

        .table {
            width: 100%;
        }

        .table-identity {
            margin-top: 2rem;
        }

        .row {
            width: 100%;
            margin-bottom: 0.78rem;
        }

        .row-label,
        .row-value,
        .row-inline-label,
        .row-inline-value {
            display: inline-block;
            vertical-align: baseline;
            color: #111111;
            font-size: 0.82rem;
        }

        .row-label {
            width: 175px;
        }

        .row-value {
            width: calc(100% - 180px);
            font-weight: 700;
        }

        .row-inline-label {
            width: 58px;
        }

        .row-inline-value {
            font-weight: 700;
        }

        .row-inline .row-value {
            width: 180px;
            font-weight: 700;
        }

        .block-title {
            margin-top: 3rem;
            margin-bottom: 1.3rem;
            font-size: 0.82rem;
            font-weight: 700;
            text-transform: uppercase;
            text-align: left;
            letter-spacing: 0;
        }

        .paragraph {
            margin: 0;
            padding: 0;
            text-align: justify;
            line-height: 1.65;
            font-size: 0.82rem;
            text-transform: uppercase;
            word-break: break-word;
        }

        .signature {
            margin-top: 4.7rem;
            page-break-inside: avoid;
        }

        .signature-bottom {
            margin-top: 4.9rem;
        }

        .signature-col {
            width: 340px;
            margin-left: auto;
            margin-right: 0;
            text-align: center;
        }

        .signature-label {
            font-size: 0.8rem;
            font-style: italic;
            color: #111111;
            margin-bottom: 0.55rem;
        }

        .signature-name {
            text-transform: uppercase;
            letter-spacing: 0.02em;
            font-size: 0.82rem;
        }

        .footer-note {
            margin-top: 2.7rem;
            font-size: 0.8rem;
            line-height: 1.6;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div class="meta">REK-BPN-02</div>
            <h1 class="title">LAPORAN TINDAKAN</h1>
        </div>

        <div class="table">
            <div class="row">
                <span class="row-label">No. Daftar</span>
                <span class="row-value">{{ $noDaftar ?: '-' }}</span>
            </div>
            <div class="row row-inline">
                <span class="row-label">Tarikh</span>
                <span class="row-value">{{ $reportDate ?: '-' }}</span>
                <span class="row-inline-label">Masa</span>
                <span class="row-inline-value">{{ $reportTime ?: '-' }}</span>
            </div>
        </div>

        <div class="table table-identity">
            <div class="row">
                <span class="row-label">Nama</span>
                <span class="row-value">{{ $officerName ?: '-' }}</span>
            </div>
            <div class="row">
                <span class="row-label">No. ID / K. Pengenalan</span>
                <span class="row-value">{{ $officerIdNo ?: '-' }}</span>
            </div>
            <div class="row">
                <span class="row-label">Pekerjaan</span>
                <span class="row-value">{{ $officerJob ?: '-' }}</span>
            </div>
            <div class="row">
                <span class="row-label">No. Telefon</span>
                <span class="row-value">{{ $officerPhone ?: '-' }}</span>
            </div>
            <div class="row">
                <span class="row-label">Alamat</span>
                <span class="row-value">{{ $officerAddress ?: '-' }}</span>
            </div>
        </div>

        <div class="block-title">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
        <div class="paragraph">{{ $reportParagraph ?: 'LAPORAN MASIH BELUM DIISI' }}</div>

        <div class="signature">
            <div class="signature-col">
                <div class="signature-label">Tandatangan Pemberi Maklumat</div>
                <div class="signature-name">{{ $officerName ?: '-' }}</div>
            </div>
        </div>

        <div class="footer-note">
            Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada
            Pemberi Maklumat.
        </div>

        <div class="signature signature-bottom">
            <div class="signature-col">
                <div class="signature-label">Tandatangan Pegawai Penguatkuasa Agama</div>
            </div>
        </div>

        <div class="footer-note">Bertarikh pada {{ $reportDate ?: '-' }}</div>
    </div>
</body>
</html>
