import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const ComplaintPrintLaporanTindakan = () => {
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const [complaint, setComplaint] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        const token = localStorage.getItem('token');
        axios.get(`${apiUrl}/complaints/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setComplaint(response?.data?.data || null);
            })
            .catch((err) => {
                setError(err?.message || 'Gagal mendapatkan aduan.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [apiUrl, id]);

    const renderValue = (value) => value || '-';

    if (isLoading) {
        return <div className="print-loading">Memuatkan laporan...</div>;
    }

    if (error) {
        return <div className="print-loading">{error}</div>;
    }

    if (!complaint) {
        return <div className="print-loading">Aduan tidak ditemui.</div>;
    }

    const laporanText = complaint?.aj_report_notes || '';

    const pad2 = (value) => String(value ?? '').padStart(2, '0');

    const formatDateDMY = (value) => {
        if (!value) {
            return '-';
        }

        // Accept YYYY-MM-DD, YYYY-MM-DD HH:mm:ss, or ISO.
        const str = String(value);
        const datePart = str.includes('T')
            ? str.split('T')[0]
            : (str.includes(' ') ? str.split(' ')[0] : str);

        const parts = datePart.split('-');
        if (parts.length !== 3) {
            return value;
        }
        return `${pad2(parts[2])}-${pad2(parts[1])}-${parts[0]}`;
    };

    const formatTime12hDot = (value) => {
        if (!value) {
            return '-';
        }

        const str = String(value);
        const timePart = str.includes('T')
            ? (str.split('T')[1] || '')
            : (str.includes(' ') ? (str.split(' ')[1] || '') : str);

        const raw = timePart.replace('Z', '').split('.')[0];
        const [hhStr = '0', mmStr = '0'] = raw.split(':');
        const hh = Number(hhStr) || 0;
        const mm = Number(mmStr) || 0;

        const isPm = hh >= 12;
        const hh12 = ((hh + 11) % 12) + 1;
        return `${hh12}.${pad2(mm)} ${isPm ? 'PM' : 'AM'}`;
    };

    const tarikhMasa = complaint?.aj_statement_datetime || '';

    const noDaftar = (() => {
        const referenceNo = String(complaint?.reference_no || '').trim();
        const normalizedDistrict = String(complaint?.district_name || '').trim();
        const normalizedYear = String(complaint?.complaint_year || '').trim();
        const dateMonth = String(complaint?.complaint_date || '').slice(5, 7);

        // Expected reference format: AJ-Klang / 2026 / 04 / 0006
        const parts = referenceNo.split('/').map((part) => part.trim()).filter(Boolean);
        const head = parts[0] || '';
        const parsedDistrict = head.replace(/^(AJ|AK)\s*-\s*/i, '').trim();
        const year = parts[1] || normalizedYear || '-';
        const month = parts[2] || dateMonth || '-';
        const runningNo = parts[3] || '-';
        const district = parsedDistrict || normalizedDistrict || '-';

        return `KES-${district} / ${year} / ${month} / ${runningNo}`;
    })();

    const arrestStaff = complaint?.aj_arrest_staff || complaint?.ajArrestStaff || null;
    const officerName = arrestStaff?.name || '';
    const officerIdNo = arrestStaff?.staff_id || arrestStaff?.ic_number || '-';
    const officerJob = arrestStaff?.position || '-';
    const officerPhone = arrestStaff?.phone || '-';
    const officerAddress = arrestStaff?.office_address || arrestStaff?.address || arrestStaff?.department || '-';
    const reportParagraph = String(laporanText || '').trim().toUpperCase();
    const reportDate = formatDateDMY(tarikhMasa);
    const reportTime = formatTime12hDot(tarikhMasa);

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/complaints/${id}`}>
                    Kembali
                </Link>
                <button className="app-button" type="button" onClick={() => window.print()}>
                    Cetak Laporan Tindakan
                </button>
            </div>

            <div className="print-sheet print-sheet-laporan-tindakan">
                <div className="print-header-laporan-tindakan">
                    <div className="print-meta-strong print-meta-top-right">REK-BPN-02</div>
                    <h1 className="print-title-underline print-title-laporan-tindakan">LAPORAN TINDAKAN</h1>
                </div>

                <div className="print-form-table">
                    <div className="print-form-row">
                        <div className="print-form-label">No. Daftar</div>
                        <div className="print-form-value">{renderValue(noDaftar)}</div>
                    </div>
                    <div className="print-form-row print-form-row-inline">
                        <div className="print-form-label">Tarikh</div>
                        <div className="print-form-value">{reportDate}</div>
                        <div className="print-form-inline-label">Masa</div>
                        <div className="print-form-inline-value">{reportTime}</div>
                    </div>
                </div>

                <div className="print-form-table print-form-table-identity">
                    <div className="print-form-row">
                        <div className="print-form-label">Nama</div>
                        <div className="print-form-value">{renderValue(officerName)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. ID / K. Pengenalan</div>
                        <div className="print-form-value">{renderValue(officerIdNo)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">Pekerjaan</div>
                        <div className="print-form-value">{renderValue(officerJob)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. Telefon</div>
                        <div className="print-form-value">{renderValue(officerPhone)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">Alamat</div>
                        <div className="print-form-value">{renderValue(officerAddress)}</div>
                    </div>
                </div>

                <div className="print-block-title-laporan">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
                <div className="print-paragraph print-paragraph-justify print-paragraph-laporan">
                    {reportParagraph || 'LAPORAN MASIH BELUM DIISI'}
                </div>

                <div className="print-signature print-signature-laporan">
                    <div className="print-sign-col print-sign-col-centered">
                        <div className="print-sign-label">Tandatangan Pemberi Maklumat</div>
                        <div className="print-sign-name print-sign-name-uppercase">{renderValue(officerName)}</div>
                    </div>
                </div>

                <div className="print-footer-note print-footer-note-left print-footer-note-laporan">
                    Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada
                    Pemberi Maklumat.
                </div>

                <div className="print-signature print-signature-laporan print-signature-laporan-bottom">
                    <div className="print-sign-col print-sign-col-centered">
                        <div className="print-sign-label">Tandatangan Pegawai Penguatkuasa Agama</div>
                    </div>
                </div>

                <div className="print-footer-note print-footer-note-left print-footer-note-laporan">
                    {`Bertarikh pada ${reportDate}`}
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintLaporanTindakan;
