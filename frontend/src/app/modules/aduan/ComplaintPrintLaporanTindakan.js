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

    const ringkasanAduan = (
        complaint?.aj_report_notes ||
        complaint?.ak_notes ||
        complaint?.summary ||
        complaint?.borang5_statement ||
        ''
    );

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

    const tarikhMasa =
        complaint?.aj_statement_datetime ||
        complaint?.aj_action_datetime ||
        `${complaint?.complaint_date || ''} ${complaint?.complaint_time || ''}`.trim();

    const noDaftar = (() => {
        const district = complaint?.district_name ? String(complaint.district_name) : '';
        const year = complaint?.complaint_year ? String(complaint.complaint_year) : '';
        const no = complaint?.case_register_no || complaint?.reference_no || complaint?.id;
        const prefix = 'KES';
        if (!district && !year) {
            return String(no || '-');
        }
        // Example: "KES - Gombak / 27 / 2026"
        return `${prefix} - ${district || '-'} / ${no || '-'} / ${year || '-'}`;
    })();

    const ppa =
        complaint?.ajArrestStaff ||
        complaint?.submittedBy?.staff ||
        null;

    const ppaName = ppa?.name || '';
    const ppaIdNo = ppa?.staff_id || ppa?.ic_number || '';
    const ppaJob = ppa?.position || 'Pegawai Penguatkuasa Agama';
    const ppaPhone = ppa?.phone || '';
    const ppaOfficeAddress = ppa?.address || '';

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

            <div className="print-sheet">
                <div className="print-header">
                    <div className="print-meta">REK-BPN-02</div>
                    <h1 className="print-title-underline">Laporan Tindakan</h1>
                </div>

                <div className="print-grid print-grid-tight">
                    <div className="print-row">
                        <span>No. Daftar</span>
                        <strong>{renderValue(noDaftar)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Tarikh</span>
                        <strong>{formatDateDMY(tarikhMasa)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Masa</span>
                        <strong>{formatTime12hDot(tarikhMasa)}</strong>
                    </div>
                </div>

                <div className="print-grid print-grid-tight print-mt">
                    <div className="print-row">
                        <span>Nama</span>
                        <strong>{renderValue(ppaName)}</strong>
                    </div>
                    <div className="print-row">
                        <span>No. ID / K. Pengenalan</span>
                        <strong>{renderValue(ppaIdNo)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Pekerjaan</span>
                        <strong>{renderValue(ppaJob)}</strong>
                    </div>
                    <div className="print-row">
                        <span>No. Telefon</span>
                        <strong>{renderValue(ppaPhone)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Alamat</span>
                        <strong>{renderValue(ppaOfficeAddress)}</strong>
                    </div>
                </div>

                <div className="print-block-title print-mt-lg">Saya dengan ini memberikan maklumat berikut :</div>
                <div className="print-notes-box print-notes-box--plain">{renderValue(ringkasanAduan)}</div>

                <div className="print-signature print-signature-split">
                    <div className="print-sign-col">
                        <div className="print-sign-line">Tandatangan Pemberi Maklumat</div>
                        <div className="print-sign-name">{renderValue(complaint.complainant_name)}</div>
                    </div>
                    <div className="print-sign-col">
                        <div className="print-sign-line">Tandatangan Pegawai Penguatkuasa Agama</div>
                        <div className="print-sign-name">{renderValue(ppaName)}</div>
                    </div>
                </div>

                <div className="print-footer-note print-footer-note-left">
                    Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan
                    kepada Pemberi Maklumat.
                </div>

                <div className="print-footer-note print-footer-note-left print-footer-date">
                    Bertarikh pada {formatDateDMY(tarikhMasa)}
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintLaporanTindakan;
