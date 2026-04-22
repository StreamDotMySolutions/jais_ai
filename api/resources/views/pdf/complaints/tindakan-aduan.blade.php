<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <title>Tindakan Aduan</title>
    <style>
        @page { margin: 14mm 14mm; }
        body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11px; margin: 0; }
        .banner { background: #121715; color: #fff; text-align: center; padding: 10px; font-size: 18px; font-weight: 700; text-transform: uppercase; }
        .subtitle { text-align: center; font-size: 10px; font-weight: 700; margin-top: 4px; }
        .block-title { margin: 16px 0 10px; background: #e3e3e3; text-align: center; padding: 6px; font-weight: 700; text-transform: uppercase; }
        .grid-3, .grid-2 { display: table; width: 100%; border-spacing: 8px 8px; margin: 0 -8px; }
        .grid-3 > .cell { display: table-cell; width: 33.33%; border: 1px solid #1f1f1f; padding: 8px; text-align: center; }
        .grid-2 > .cell { display: table-cell; width: 50%; border: 1px solid #1f1f1f; padding: 8px; text-align: center; }
        .cell .label { text-transform: uppercase; font-size: 9px; margin-bottom: 6px; color: #2d2d2d; }
        .cell .value { font-size: 12px; font-weight: 700; }
        .notes-label { text-transform: uppercase; font-size: 9px; margin-top: 8px; margin-bottom: 6px; color: #2d2d2d; }
        .notes-box { border: 1px solid #1f1f1f; min-height: 90px; padding: 10px; line-height: 1.5; white-space: pre-wrap; }
        .table { margin-top: 16px; border: 1px solid #1f1f1f; width: 100%; border-collapse: collapse; }
        .table th, .table td { border: 1px solid #1f1f1f; padding: 8px; font-size: 11px; }
        .table th { background: #f1f1f1; text-transform: uppercase; font-size: 10px; }
        .footer-note { margin-top: 12px; font-size: 11px; text-align: center; }
    </style>
</head>
<body>
    <div class="banner">Tindakan Aduan</div>
    <div class="subtitle">HOTLINE 24 JAM</div>
    <div class="subtitle">BAHAGIAN PENGURUSAN PENGUATKUASAAN JABATAN AGAMA ISLAM SELANGOR</div>

    <div class="block-title">Butiran Aduan</div>
    <div class="grid-3">
        <div class="cell"><div class="label">Nombor Aduan :</div><div class="value">{{ $referenceNo ?: '-' }}</div></div>
        <div class="cell"><div class="label">Tarikh Penerimaan Aduan :</div><div class="value">{{ $complaintDate ?: '-' }}</div></div>
        <div class="cell"><div class="label">Masa Penerimaan Aduan :</div><div class="value">{{ $complaintTime ?: '-' }}</div></div>
    </div>
    <div class="grid-2">
        <div class="cell"><div class="label">Nama Penerima Aduan :</div><div class="value">{{ $receivedBy ?: '-' }}</div></div>
        <div class="cell"><div class="label">Kumpulan / Pelaksana :</div><div class="value">{{ $pelaksanaName ?: '-' }}</div></div>
    </div>

    <div class="block-title">Makluman Aduan dan Arahan Penyelia</div>
    <div class="grid-3">
        <div class="cell"><div class="label">Nama Penyelia Bertugas :</div><div class="value">{{ $directiveBy ?: '-' }}</div></div>
        <div class="cell"><div class="label">Tarikh Maklum Aduan :</div><div class="value">{{ $directiveDateText ?: '-' }}</div></div>
        <div class="cell"><div class="label">Masa Maklum Aduan :</div><div class="value">{{ $directiveTimeText ?: '-' }}</div></div>
    </div>
    <div class="notes-label">Minit / Arahan Tindakan :</div>
    <div class="notes-box">{{ $directiveNotes ?: '-' }}</div>

    <div class="block-title">Serahan Aduan Kepada Anggota Pelaksana</div>
    <div class="grid-3">
        <div class="cell"><div class="label">Pelaksana / Daerah Pelaksana :</div><div class="value">{{ $districtDisplay ?: '-' }}</div></div>
        <div class="cell"><div class="label">Tarikh Serahan :</div><div class="value">{{ $handoverDateText ?: '-' }}</div></div>
        <div class="cell"><div class="label">Masa Serahan :</div><div class="value">{{ $handoverTimeText ?: '-' }}</div></div>
    </div>

    <table class="table">
        <thead>
            <tr>
                <th>Status Terkini</th>
                <th>Tarikh</th>
                <th>Masa</th>
                <th>Catatan</th>
            </tr>
        </thead>
        <tbody>
            @forelse(($historyRows ?? []) as $row)
                <tr>
                    <td>{{ $row['classification'] ?? '-' }}</td>
                    <td>{{ $row['date'] ?? '-' }}</td>
                    <td>{{ $row['time'] ?? '-' }}</td>
                    <td>{{ $row['note'] ?? '-' }}</td>
                </tr>
            @empty
                <tr>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                    <td>-</td>
                </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer-note">Status Terkini / Tarikh Tindakan : {{ $currentStatus ?: '-' }}</div>
    <div class="footer-note">No. Daftar Kes : {{ $caseRegisterNo ?: '-' }}</div>
</body>
</html>
