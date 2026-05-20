<!DOCTYPE html>
<html lang="ms">
<head>
    <meta charset="utf-8">
    <title>Borang 5</title>
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
            margin-bottom: 2.7rem;
        }

        .meta {
            text-align: right;
            font-size: 8px;
            font-weight: 700;
            margin-bottom: 2.4rem;
        }

        .title {
            text-align: center;
            font-size: 10px;
            font-weight: 700;
            line-height: 1.45;
        }

        .title-spacer {
            min-height: 1.15rem;
        }

        .section-spacer {
            height: 1.4rem;
        }

        table {
            border-collapse: collapse;
            width: 100%;
        }

        .table-identity {
            margin-top: 1.7rem;
        }

        .identity-title {
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            text-decoration: underline;
            margin: 0 0 0.4rem;
            padding-left: 2.5rem;
        }

        .row-label {
            width: 30%;
            vertical-align: top;
            font-size: 10px;
            line-height: 1.6;
            padding-left: 2.5rem;
        }

        .row-value {
            width: 70%;
            vertical-align: top;
            font-size: 10px;
            line-height: 1.6;
            font-weight: 700;
        }

        .inline-time-label {
            margin-left: 4.7rem;
            font-weight: 400;
        }

        .body {
            margin-top: 2.15rem;
            padding-left: 2.5rem;
            padding-right: 0.5rem;
        }

        .body-title {
            font-size: 10px;
            font-weight: 700;
            margin-bottom: 0.9rem;
        }

        .body-text {
            font-size: 10px;
            line-height: 1.6;
            text-align: left;
            word-break: break-word;
        }

        .body-line {
            display: block;
            margin: 0;
            text-align: left;
        }

        .sign-row {
            width: 100%;
            margin-top: 3.4rem;
            page-break-inside: avoid;
        }

        .sign-row-bottom {
            margin-top: 3.9rem;
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
            font-size: 10px;
            font-style: italic;
            margin-bottom: 0.45rem;
        }

        .sign-name {
            font-size: 10px;
            line-height: 1.5;
        }

        .sign-note {
            margin-top: 0.2rem;
            font-size: 9px;
            font-style: italic;
            color: #4b5563;
        }

        .note {
            margin-top: 2rem;
            padding-left: 2.5rem;
            padding-right: 0.5rem;
            font-size: 10px;
            line-height: 1.6;
        }

        .date-note {
            margin-top: 2.6rem;
            padding-left: 2.5rem;
            font-size: 10px;
            line-height: 1.6;
        }

        .main-status {
            margin-top: 2.8rem;
            padding-left: 2.5rem;
            font-size: 10px;
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
            @if(($caseType ?? 'AJ') === 'AK')
                <tr>
                    <td colspan="2" class="identity-title">BUTIR-BUTIR PEMBERI MAKLUMAT</td>
                </tr>
            @endif
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
                $reportLines = array_values(array_filter(
                    array_map(static fn ($line) => ltrim((string) $line), preg_split("/\r\n|\n|\r/", (string) ($reportText ?: '-')) ?: []),
                    static fn ($line) => $line !== ''
                ));
                $hasBoldedLokasiLine = false;
            @endphp
            <div class="body-text">
                @foreach($reportLines as $line)
                    @php
                        $matched = preg_match('/^(\s*(?:LOKASI|LOKASI KEJADIAN|ALAMAT KEJADIAN|ALAMAT LOKASI KEJADIAN)\s*:\s*)(.*)$/i', $line, $parts) === 1;
                    @endphp
                    @if($matched && ! $hasBoldedLokasiLine)
                        @php $hasBoldedLokasiLine = true; @endphp
                        <div class="body-line">
                            <span>{{ trim((string) $parts[1]) }}</span>
                            <strong>{{ trim((string) $parts[2]) !== '' ? trim((string) $parts[2]) : '-' }}</strong>
                        </div>
                    @else
                        <div class="body-line">{{ $line }}</div>
                    @endif
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
