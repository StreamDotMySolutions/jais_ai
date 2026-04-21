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

    const channel = String(complaint?.channel || '').trim().toLowerCase();
    const caseType = String(complaint?.case_type || '').trim().toUpperCase();
    const isPhysicalInformant = ['walkin', 'walk-in', 'kaunter'].includes(channel);
    const receiverStaff =
        complaint?.received_by?.staff ||
        complaint?.receivedBy?.staff ||
        complaint?.submittedBy?.staff ||
        null;
    const issuerName =
        complaint?.submittedBy?.staff?.name ||
        complaint?.submittedBy?.name ||
        complaint?.received_by?.name ||
        complaint?.receivedBy?.name ||
        '-';
    const reportText = String(complaint?.borang5_statement || complaint?.summary || '').trim();
    const reportDate = formatDateDMY(complaint?.complaint_date);
    const reportTime = complaint?.complaint_time ? formatTime12hDot(complaint.complaint_time) : '-';
    const consentAccepted = Boolean(complaint?.consent_accepted);
    const consentAcceptedAt = complaint?.consent_accepted_at ? formatDateDMY(complaint.consent_accepted_at) : '';
    const publicInformantName = complaint?.informant_name || complaint?.complainant_name || '';
    const publicInformantIdNumber = complaint?.informant_identification_number || complaint?.identification_number || '';
    const publicInformantContactNumber = complaint?.informant_contact_number || complaint?.contact_number || '';
    const officerInformantName =
        receiverStaff?.name ||
        complaint?.received_by?.name ||
        complaint?.receivedBy?.name ||
        issuerName;
    const officerInformantIdNumber = receiverStaff?.staff_id || receiverStaff?.ic_number || '-';
    const officerInformantOccupation = receiverStaff?.position || 'Pegawai Penguatkuasa Agama';
    const officerInformantContactNumber = receiverStaff?.phone || '-';
    const officerInformantAddress = receiverStaff?.office_address || receiverStaff?.address || '-';
    const effectiveInformantName = isPhysicalInformant ? publicInformantName : officerInformantName;
    const effectiveInformantIdNumber = isPhysicalInformant ? publicInformantIdNumber : officerInformantIdNumber;
    const effectiveInformantContactNumber = isPhysicalInformant ? publicInformantContactNumber : officerInformantContactNumber;
    const effectiveOfficerSignerName = caseType === 'AK'
        ? officerInformantName
        : (
            complaint?.approver_staff?.name ||
            complaint?.approverStaff?.name ||
            issuerName
        );

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

            <div className="print-sheet print-sheet-borang5">
                <div className="print-borang5-header">
                    <div className="print-borang5-meta">REK-BPN-01</div>
                    <div className="print-borang5-title">BORANG 5</div>
                    <div className="print-borang5-title">ENAKMEN TATACARA JENAYAH SYARIAH (NEGERI SELANGOR) 2003</div>
                    <div className="print-borang5-title">Subsyeksyen 54(2) / 57(1)</div>
                    <div className="print-borang5-title print-borang5-title-spacer">&nbsp;</div>
                    <div className="print-borang5-title">MAKLUMAT KEPADA PEGAWAI PENGUATKUASA AGAMA</div>
                </div>

                <div className="print-borang5-section-spacer" />

                <div className="print-borang5-table">
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">No. Daftar</div>
                        <div className="print-borang5-value">{renderValue(complaint.reference_no)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">Tarikh</div>
                        <div className="print-borang5-value print-borang5-inline-value">
                            <span className="print-borang5-inline-date">{renderValue(reportDate)}</span>
                            <span className="print-borang5-inline-time-label">Masa</span>
                            <span>{renderValue(reportTime)}</span>
                        </div>
                    </div>
                </div>

                {isPhysicalInformant && (
                    <div className="print-borang5-table print-borang5-table-identity">
                        <div className="print-borang5-row">
                            <div className="print-borang5-label">Nama</div>
                            <div className="print-borang5-value">{renderValue(publicInformantName)}</div>
                        </div>
                        <div className="print-borang5-row">
                            <div className="print-borang5-label">No. K/P Pemberi Maklumat</div>
                            <div className="print-borang5-value">{renderValue(publicInformantIdNumber)}</div>
                        </div>
                        <div className="print-borang5-row">
                            <div className="print-borang5-label">No. Telefon Pemberi Maklumat</div>
                            <div className="print-borang5-value">{renderValue(publicInformantContactNumber)}</div>
                        </div>
                    </div>
                )}

                <div className="print-borang5-table print-borang5-table-identity">
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">Nama</div>
                        <div className="print-borang5-value">{renderValue(officerInformantName)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{isPhysicalInformant ? 'No. K/P Pengadu' : 'No. Pengenalan'}</div>
                        <div className="print-borang5-value">{renderValue(officerInformantIdNumber)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{isPhysicalInformant ? 'Pekerjaan Pengadu' : 'Pekerjaan'}</div>
                        <div className="print-borang5-value">{renderValue(officerInformantOccupation)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{isPhysicalInformant ? 'No. Telefon Pengadu' : 'No. Telefon'}</div>
                        <div className="print-borang5-value">{renderValue(officerInformantContactNumber)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{isPhysicalInformant ? 'Alamat Pengadu' : 'Alamat'}</div>
                        <div className="print-borang5-value">{renderValue(officerInformantAddress)}</div>
                    </div>
                </div>

                <div className="print-borang5-body">
                    <div className="print-borang5-body-title">SAYA DENGAN INI MEMBERIKAN MAKLUMAT BERIKUT :</div>
                    <div className="print-borang5-body-text">{renderValue(reportText || '-')}</div>
                </div>

                <div className="print-borang5-sign-row">
                    <div className="print-borang5-sign-empty" />
                    <div className="print-borang5-sign-col">
                        <div className="print-borang5-sign-label">Tandatangan Pemberi Maklumat</div>
                        <div className="print-borang5-sign-name">{renderValue(effectiveInformantName)}</div>
                    </div>
                </div>

                <div className="print-borang5-note">
                    Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan dibacakan kepada
                    Pemberi Maklumat.
                </div>

                <div className="print-borang5-sign-row print-borang5-sign-row-bottom">
                    <div className="print-borang5-sign-empty" />
                    <div className="print-borang5-sign-col">
                        <div className="print-borang5-sign-label">Tandatangan Pegawai Penguatkuasa Agama</div>
                        <div className="print-borang5-sign-name">{renderValue(effectiveOfficerSignerName)}</div>
                    </div>
                </div>

                <div className="print-borang5-date-note">{`Bertarikh pada ${renderValue(reportDate)}`}</div>
                {channel === 'portal' && (
                    <div className="print-borang5-note" style={{ marginTop: '1.5rem' }}>
                        <strong>Persetujuan Pengadu:</strong> {consentAccepted ? 'Diterima' : 'Tidak direkodkan'}
                        {consentAcceptedAt ? ` pada ${consentAcceptedAt}` : ''}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplaintPrintBorang5;
