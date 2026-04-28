<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <title>Borang 5</title>
    <style>
        @page {
            margin: 20mm 16mm 18mm 16mm;
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
            margin-bottom: 26px;
        }

        .meta {
            text-align: right;
            font-size: 8px;
            font-weight: 700;
            margin-bottom: 24px;
        }

        .title {
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.45;
        }

        .title-spacer {
            min-height: 12px;
        }

        .section-spacer {
            height: 14px;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        .table-identity {
            margin-top: 16px;
        }

        .row-label {
            width: 30%;
            vertical-align: top;
            line-height: 1.6;
            padding-left: 32px;
        }

        .row-value {
            width: 70%;
            vertical-align: top;
            line-height: 1.6;
            font-weight: 700;
        }

        .inline-time-label {
            margin-left: 52px;
            font-weight: 400;
        }

        .body {
            margin-top: 22px;
            padding-left: 32px;
            padding-right: 8px;
        }

        .body-title {
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 9px;
        }

        .body-text {
            line-height: 1.6;
            text-align: justify;
            white-space: pre-wrap;
        }

        .sign-row {
            width: 100%;
            margin-top: 52px;
        }

        .sign-row-bottom {
            margin-top: 58px;
        }

        .sign-empty {
            width: 50%;
            display: inline-block;
        }

        .sign-col {
            width: 49%;
            display: inline-block;
            text-align: center;
            vertical-align: top;
        }

        .sign-label {
            font-style: italic;
            margin-bottom: 5px;
        }

        .sign-name {
            line-height: 1.5;
        }

        .sign-note {
            margin-top: 3px;
            font-size: 9px;
            font-style: italic;
            color: #4b5563;
        }

        .note {
            margin-top: 20px;
            padding-left: 32px;
            padding-right: 8px;
            line-height: 1.6;
        }

        .date-note {
            margin-top: 26px;
            padding-left: 32px;
            line-height: 1.6;
        }

        .main-status {
            margin-top: 28px;
            padding-left: 32px;
            line-height: 1.6;
            font-weight: 700;
            color: #d32f2f;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="sheet">
        <div class="header">
            <div class="meta">REK-BPN-01</div>
            <div class="title">BORANG 5</div>
            <div class="title">ENAKMEN TATACARA JENAYAH SYARIAH (NEGERI SELANGOR) 2003</div>
            <div class="title">Subsyeksyen 54(2) / 57(1)</div>
            <div class="title title-spacer">&nbsp;</div>
            <div class="title">MAKLUMAT KEPADA PEGAWAI PENGUATKUASA AGAMA</div>
        </div>

        <div class="section-spacer"></div>

        <table>
            <tr>
                <td class="row-label">No. Daftar</td>
                <td class="row-value">{{ $referenceNo ?: '-' }}</td>
            </tr>
            <tr>
                <td class="row-label">Tarikh</td>
                <td class="row-value">
                    <span>{{ $reportDate ?: '-' }}</span>
                    <span class="inline-time-label">Masa</span>
                    <span>{{ $reportTime ?: '-' }}</span>
                </td>
            </tr>
        </table>

        <table class="table-identity">
            <tr>
                <td class="row-label">Nama</td>
                <td class="row-value">{{ $informantName ?: '-' }}</td>
            </tr>
            <tr>
                <td class="row-label">{{ strtoupper((string) ($caseType ?? 'AJ')) === 'AK' ? 'No Kad Pengenalan Diri' : 'No. K/P' }}</td>
                <td class="row-value">{{ $informantIdNumber ?: '-' }}</td>
            </tr>
            <tr>
                <td class="row-label">Pekerjaan</td>
                <td class="row-value">{{ $informantOccupation ?: '-' }}</td>
            </tr>
            <tr>
                <td class="row-label">No. Telefon</td>
                <td class="row-value">{{ $informantContactNumber ?: '-' }}</td>
            </tr>
            <tr>
                <td class="row-label">Alamat</td>
                <td class="row-value">{{ $informantAddress ?: '-' }}</td>
            </tr>
        </table>

        <div class="body">
            <div class="body-title">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
            @php
                $reportLines = preg_split("/\r\n|\n|\r/", (string) ($reportText ?: '-'));
                $hasBoldedLokasiLine = false;
            @endphp
            <div class="body-text">
                @foreach($reportLines as $index => $line)
                    @php
                        $line = (string) $line;
                        $matched = preg_match('/^(\s*(?:LOKASI|LOKASI KEJADIAN|ALAMAT KEJADIAN|ALAMAT LOKASI KEJADIAN)\s*:\s*)(.*)$/i', $line, $parts) === 1;
                    @endphp
                    @if($matched && ! $hasBoldedLokasiLine)
                        @php $hasBoldedLokasiLine = true; @endphp
                        <span>{{ $parts[1] }}</span><strong>{{ $parts[2] !== '' ? $parts[2] : '-' }}</strong>
                    @else
                        {{ $line !== '' ? $line : ' ' }}
                    @endif
                    @if($index < count($reportLines) - 1)<br>@endif
                @endforeach
            </div>
        </div>

        <div class="sign-row">
            <div class="sign-empty"></div>
            <div class="sign-col">
                <div class="sign-label">Tandatangan Pemberi Maklumat</div>
                <div class="sign-name">{{ $informantName ?: '-' }}</div>
            </div>
        </div>

        <div class="note">
            Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada
            Pemberi Maklumat.
        </div>

        <div class="sign-row sign-row-bottom">
            <div class="sign-empty"></div>
            <div class="sign-col">
                <div class="sign-label">Tandatangan Pegawai Penguatkuasa Agama</div>
                <div class="sign-name">{{ $officerSignerName ?: '' }}</div>
                @if(!empty($officerSignerPendingNote))
                    <div class="sign-note">{{ $officerSignerPendingNote }}</div>
                @endif
            </div>
        </div>

        <div class="date-note">Bertarikh pada {{ $reportDate ?: '-' }}</div>

        @if(!empty($mainStatus))
            <div class="main-status">STATUS UTAMA ADUAN : {{ $mainStatus }}</div>
        @endif
    </div>
</body>
</html>
