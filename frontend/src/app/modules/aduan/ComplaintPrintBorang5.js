import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const ComplaintPrintBorang5 = () => {
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

    if (isLoading) {
        return <div className="print-loading">Memuatkan borang...</div>;
    }

    if (error) {
        return <div className="print-loading">{error}</div>;
    }

    if (!complaint) {
        return <div className="print-loading">Aduan tidak ditemui.</div>;
    }

    const renderValue = (value) => value || '-';
    const pad2 = (value) => String(value ?? '').padStart(2, '0');

    const formatDateDMY = (value) => {
        if (!value) {
            return '-';
        }

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

        if (!timePart) {
            return value;
        }

        const raw = timePart.replace('Z', '').split('.')[0];
        const [hhStr = '0', mmStr = '0'] = raw.split(':');
        const hh = Number(hhStr) || 0;
        const mm = Number(mmStr) || 0;
        const isPm = hh >= 12;
        const hh12 = ((hh + 11) % 12) + 1;
        return `${hh12}.${pad2(mm)} ${isPm ? 'PM' : 'AM'}`;
    };

    const issuerName =
        complaint?.submittedBy?.staff?.name ||
        complaint?.submittedBy?.name ||
        '-';
    const reportText = String(complaint?.borang5_statement || complaint?.summary || '').trim().toUpperCase();
    const reportDate = formatDateDMY(complaint?.complaint_date);
    const reportTime = complaint?.complaint_time ? formatTime12hDot(complaint.complaint_time) : '-';
    const informantName = complaint?.informant_name || complaint?.complainant_name || '';
    const informantIdNumber = complaint?.informant_identification_number || '';
    const informantContactNumber = complaint?.informant_contact_number || '';

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/complaints/${id}`}>
                    Kembali
                </Link>
                <button className="app-button" type="button" onClick={() => window.print()}>
                    Cetak Borang 5
                </button>
            </div>

            <div className="print-sheet print-sheet-laporan-tindakan">
                <div className="print-header-laporan-tindakan">
                    <div className="print-meta-strong print-meta-top-right">REK-BPN-01</div>
                    <h1 className="print-title-underline print-title-laporan-tindakan">BORANG 5</h1>
                    <div className="print-borang5-subtitle">ENAKMEN TATACARA JENAYAH SYARIAH (NEGERI SELANGOR) 2003</div>
                    <div className="print-borang5-subtitle">SUBSEKSYEN 54(2) / 5(1)</div>
                    <div className="print-borang5-subtitle">MAKLUMAT KEPADA PEGAWAI PENGUATKUASA AGAMA</div>
                </div>

                <div className="print-form-table">
                    <div className="print-form-row">
                        <div className="print-form-label">No. Daftar Aduan</div>
                        <div className="print-form-value">{renderValue(complaint.reference_no)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">Daerah</div>
                        <div className="print-form-value">{renderValue(complaint.district_name)}</div>
                    </div>
                    <div className="print-form-row print-form-row-inline">
                        <div className="print-form-label">Tarikh</div>
                        <div className="print-form-value">{renderValue(reportDate)}</div>
                        <div className="print-form-inline-label">Masa</div>
                        <div className="print-form-inline-value">{renderValue(reportTime)}</div>
                    </div>
                </div>

                <div className="print-form-table print-form-table-identity">
                    <div className="print-form-row">
                        <div className="print-form-label">Nama Pemberi Maklumat</div>
                        <div className="print-form-value">{renderValue(informantName)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. K/P Pemberi Maklumat</div>
                        <div className="print-form-value">{renderValue(informantIdNumber)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. Telefon Pemberi Maklumat</div>
                        <div className="print-form-value">{renderValue(informantContactNumber)}</div>
                    </div>
                </div>

                <div className="print-form-table print-form-table-identity">
                    <div className="print-form-row">
                        <div className="print-form-label">Nama Pengadu</div>
                        <div className="print-form-value">{renderValue(complaint.complainant_name)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. K/P Pengadu</div>
                        <div className="print-form-value">{renderValue(complaint.identification_number)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">Pekerjaan Pengadu</div>
                        <div className="print-form-value">{renderValue(complaint.complainant_occupation)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">No. Telefon Pengadu</div>
                        <div className="print-form-value">{renderValue(complaint.contact_number)}</div>
                    </div>
                    <div className="print-form-row">
                        <div className="print-form-label">Alamat Pengadu</div>
                        <div className="print-form-value">{renderValue(complaint.address)}</div>
                    </div>
                </div>

                <div className="print-block-title-laporan">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
                <div className="print-paragraph print-paragraph-justify print-paragraph-laporan">{renderValue(reportText || '-')}</div>

                <div className="print-signature print-signature-laporan">
                    <div className="print-sign-col print-sign-col-centered">
                        <div className="print-sign-label">Tandatangan Pemberi Maklumat</div>
                        <div className="print-sign-name print-sign-name-uppercase">{renderValue(informantName)}</div>
                    </div>
                </div>

                <div className="print-footer-note print-footer-note-left print-footer-note-laporan">
                    Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada
                    Pemberi Maklumat.
                </div>

                <div className="print-signature print-signature-laporan print-signature-laporan-bottom">
                    <div className="print-sign-col print-sign-col-centered">
                        <div className="print-sign-label">Tandatangan Pegawai Penguatkuasa Agama</div>
                        <div className="print-sign-name print-sign-name-uppercase">{renderValue(issuerName)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintBorang5;
