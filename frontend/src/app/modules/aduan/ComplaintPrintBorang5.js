import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useToast } from '../../components/SharedToastProvider';

const ComplaintPrintBorang5 = () => {
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const toast = useToast();
    const [complaint, setComplaint] = useState(null);
    const [offices, setOffices] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({
        email: '',
        subject: '',
        body: '',
    });

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        const token = localStorage.getItem('token');
        Promise.all([
            axios.get(`${apiUrl}/complaints/${id}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
            axios.get(`${apiUrl}/references/offices`),
        ])
            .then(([complaintResponse, officeResponse]) => {
                setComplaint(complaintResponse?.data?.data || null);
                setOffices(officeResponse?.data?.data || []);
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
    const renderUpperValue = (value) => {
        const text = String(value || '').trim();
        if (!text) {
            return '-';
        }
        return text.toLocaleUpperCase('ms-MY');
    };
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
    const reportTextRaw = String(complaint?.borang5_statement || complaint?.summary || '').trim();
    const reportDate = formatDateDMY(complaint?.complaint_date);
    const reportTime = complaint?.complaint_time ? formatTime12hDot(complaint.complaint_time) : '-';
    const mainStatus = (() => {
        const normalized = (complaint?.aj_ppa_classification || '').toString().trim().toUpperCase();
        return normalized === 'FFA' ? 'FNA' : normalized;
    })();
    const consentAccepted = Boolean(complaint?.consent_accepted);
    const consentAcceptedAt = complaint?.consent_accepted_at ? formatDateDMY(complaint.consent_accepted_at) : '';
    const officerInformantName =
        receiverStaff?.name ||
        complaint?.received_by?.name ||
        complaint?.receivedBy?.name ||
        issuerName;
    const receiverStaffOfficeType = String(receiverStaff?.office?.office_type || receiverStaff?.office_type || '').trim().toLowerCase();
    const hqOffice = offices.find((office) => String(office?.code || '').trim().toUpperCase() === 'HQ');
    const borang5ContextOffice = !isPhysicalInformant && receiverStaffOfficeType === 'hq'
        ? (hqOffice || receiverStaff?.office || null)
        : (receiverStaff?.office || null);
    const officerInformantIdNumber = receiverStaff?.staff_id || receiverStaff?.ic_number || '-';
    const officerInformantOccupation = receiverStaff?.position || 'Pegawai Penguatkuasa Agama';
    const officerInformantContactNumber = borang5ContextOffice?.phone || receiverStaff?.no_tel_pejabat || '-';
    const officerInformantAddress = borang5ContextOffice?.address || receiverStaff?.office_address || receiverStaff?.address || '-';
    const complainantName = complaint?.complainant_name || '';
    const complainantIdNumber = complaint?.identification_number || '';
    const complainantOccupation = complaint?.complainant_occupation || '';
    const complainantContactNumber = complaint?.contact_number || '';
    const complainantAddress = complaint?.address || '';
    const complainantCurrentAddress = complaint?.current_address || '';
    const effectiveInformantName = isPhysicalInformant ? complainantName : officerInformantName;
    const effectiveInformantSignerName = String(effectiveInformantName || '').toLocaleUpperCase('ms-MY');
    const effectiveInformantIdNumber = isPhysicalInformant ? complainantIdNumber : officerInformantIdNumber;
    const effectiveInformantOccupation = isPhysicalInformant ? complainantOccupation : officerInformantOccupation;
    const effectiveInformantContactNumber = isPhysicalInformant ? complainantContactNumber : officerInformantContactNumber;
    const effectiveInformantAddressBase = isPhysicalInformant ? complainantAddress : officerInformantAddress;
    const effectiveInformantAddress = caseType === 'AK'
        ? (complainantCurrentAddress || '')
        : effectiveInformantAddressBase;
    const approverSignerName = String(
        complaint?.approver_staff?.name ||
        complaint?.approverStaff?.name ||
        ''
    ).trim();
    const effectiveOfficerSignerName = caseType === 'AK'
        ? (approverSignerName || '-')
        : approverSignerName;
    const hasOfficerSignerName = String(
        caseType === 'AK' ? effectiveOfficerSignerName : approverSignerName
    ).trim() !== '';
    const isSignerRequired = caseType === 'AJ';
    const signerRequiredTitle = !isSignerRequired || hasOfficerSignerName
        ? undefined
        : 'Borang 5 hanya boleh dijana selepas aduan disahkan oleh Pegawai Pengesah.';
    const districtName = complaint?.district_name || complaint?.district?.name || '-';
    const reportText = (() => {
        if (!reportTextRaw) {
            return '';
        }
        if (caseType === 'AK') {
            // AK Borang 5: do not auto-show/prefill LOKASI line.
            return reportTextRaw
                .replace(/^\s*(LOKASI|LOKASI KEJADIAN|ALAMAT KEJADIAN|ALAMAT LOKASI KEJADIAN)\s*:[^\r\n]*(\r?\n)?/i, '')
                .trim();
        }
        const incidentAddress = String(complaint?.address || '').trim();
        if (!incidentAddress) {
            return reportTextRaw;
        }
        const hasLokasiPrefix = /^\s*(LOKASI|LOKASI KEJADIAN|ALAMAT KEJADIAN|ALAMAT LOKASI KEJADIAN)\s*:/i.test(reportTextRaw);
        if (hasLokasiPrefix) {
            return reportTextRaw;
        }
        return `LOKASI : ${incidentAddress}\n${reportTextRaw}`;
    })();

    const openEmailModal = () => {
        const defaultSubject = `TINDAKAN (${mainStatus || 'Aduan'}) : ${complaint?.reference_no || `Aduan #${id}`}`;
        const defaultBody = [
            'Assalamualaikum',
            '',
            `Aduan berstatus ${mainStatus || '-'} untuk tindakan daerah ${districtName}.`,
            'Sila pastikan aduan diambil tindakan mengikut tempoh yang ditetapkan.',
            '',
            'Muat turun salinan Borang 5 di lampiran sebagai simpanan rekod di Fail Aduan.',
            '',
            'Terima kasih.',
        ].join('\n');
        setEmailForm({
            email: '',
            subject: defaultSubject,
            body: defaultBody,
        });
        setIsEmailModalOpen(true);
    };

    const closeEmailModal = () => {
        if (isEmailSending) {
            return;
        }
        setIsEmailModalOpen(false);
    };

    const handleEmailFieldChange = (field) => (event) => {
        const value = event?.target?.value ?? '';
        setEmailForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSendEmail = async () => {
        if (!apiUrl) {
            toast.error('API URL tidak diset.');
            return;
        }
        if (isEmailSending) {
            return;
        }
        const email = String(emailForm.email || '').trim();
        if (!email) {
            toast.error('Alamat emel wajib diisi.');
            return;
        }

        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            toast.error('Format alamat emel tidak sah.');
            return;
        }
        const subject = String(emailForm.subject || '').trim();
        if (!subject) {
            toast.error('Subjek emel wajib diisi.');
            return;
        }
        const body = String(emailForm.body || '').trim();
        if (!body) {
            toast.error('Kandungan emel wajib diisi.');
            return;
        }

        const token = localStorage.getItem('token');
        setIsEmailSending(true);
        try {
            const response = await axios.post(
                `${apiUrl}/complaints/${id}/print/borang-5/email`,
                {
                    email,
                    subject,
                    body,
                },
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
            );
            toast.success(response?.data?.message || 'Borang 5 berjaya dihantar melalui emel.');
            setIsEmailModalOpen(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Gagal menghantar emel Borang 5.');
        } finally {
            setIsEmailSending(false);
        }
    };

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/complaints/${id}`}>
                    Kembali
                </Link>
                <button
                    className="app-button app-button-ghost"
                    type="button"
                    onClick={openEmailModal}
                    disabled={isEmailSending || (isSignerRequired && !hasOfficerSignerName)}
                    title={signerRequiredTitle}
                >
                    Email
                </button>
                <button
                    className="app-button"
                    type="button"
                    onClick={() => window.print()}
                    disabled={isSignerRequired && !hasOfficerSignerName}
                    title={signerRequiredTitle}
                >
                    Cetak Borang 5
                </button>
            </div>

            <div className="print-sheet print-sheet-borang5">
                <div className="print-borang5-header">
                    <div className="print-borang5-meta">REK-BPN-01</div>
                    <div className="print-borang5-title">BORANG 5</div>
                    <div className="print-borang5-title">ENAKMEN TATACARA JENAYAH SYARIAH (NEGERI SELANGOR) 2003</div>
                    <div className="print-borang5-title">
                        {caseType === 'AK' ? 'Subseksyen 54(2)' : 'Subseksyen 54(2) / 57(1)'}
                    </div>
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

                <div className="print-borang5-table print-borang5-table-identity">
                    {caseType === 'AK' && (
                        <div className="print-borang5-identity-title">BUTIR-BUTIR PEMBERI MAKLUMAT</div>
                    )}
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">Nama</div>
                        <div className="print-borang5-value">{renderUpperValue(effectiveInformantName)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{caseType === 'AK' ? 'No Kad Pengenalan Diri' : 'No. K/P'}</div>
                        <div className="print-borang5-value">{renderUpperValue(effectiveInformantIdNumber)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{caseType === 'AK' ? 'Pekerjaan' : 'Pekerjaan'}</div>
                        <div className="print-borang5-value">{renderUpperValue(effectiveInformantOccupation)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{caseType === 'AK' ? 'No. Telefon' : 'No. Telefon'}</div>
                        <div className="print-borang5-value">{renderUpperValue(effectiveInformantContactNumber)}</div>
                    </div>
                    <div className="print-borang5-row">
                        <div className="print-borang5-label">{caseType === 'AK' ? 'Alamat' : 'Alamat'}</div>
                        <div className="print-borang5-value">
                            {caseType === 'AK'
                                ? String(effectiveInformantAddress || '').toLocaleUpperCase('ms-MY')
                                : renderUpperValue(effectiveInformantAddress)}
                        </div>
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
                        <div className="print-borang5-sign-name">{renderValue(effectiveInformantSignerName)}</div>
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
                        <div className="print-borang5-sign-name">{effectiveOfficerSignerName || ''}</div>
                    </div>
                </div>

                <div className="print-borang5-date-note">{`Bertarikh pada ${renderValue(reportDate)}`}</div>
                {mainStatus && (
                    <div className="print-borang5-main-status">{`STATUS UTAMA ADUAN : ${mainStatus}`}</div>
                )}
                {channel === 'portal' && (
                    <div className="print-borang5-note" style={{ marginTop: '1.5rem' }}>
                        <strong>Persetujuan Pengadu:</strong> {consentAccepted ? 'Diterima' : 'Tidak direkodkan'}
                        {consentAcceptedAt ? ` pada ${consentAcceptedAt}` : ''}
                    </div>
                )}
            </div>

            {isEmailModalOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeEmailModal}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <h4>Hantar Emel Borang 5</h4>
                            <p>Lampiran PDF Borang 5 akan dihantar bersama emel ini.</p>
                            <button className="app-modal-close" onClick={closeEmailModal} disabled={isEmailSending}>
                                &times;
                            </button>
                        </div>
                        <div style={{ display: 'grid', gap: '0.9rem' }}>
                            <div className="app-form-field">
                                <label htmlFor="email-to">To</label>
                                <input
                                    id="email-to"
                                    type="email"
                                    className="form-control"
                                    placeholder="contoh@domain.com"
                                    value={emailForm.email}
                                    onChange={handleEmailFieldChange('email')}
                                    disabled={isEmailSending}
                                />
                            </div>
                            <div className="app-form-field">
                                <label htmlFor="email-subject">Subject</label>
                                <input
                                    id="email-subject"
                                    type="text"
                                    className="form-control"
                                    value={emailForm.subject}
                                    onChange={handleEmailFieldChange('subject')}
                                    disabled={isEmailSending}
                                />
                            </div>
                            <div className="app-form-field">
                                <label htmlFor="email-body">Body</label>
                                <textarea
                                    id="email-body"
                                    className="form-control"
                                    rows={10}
                                    value={emailForm.body}
                                    onChange={handleEmailFieldChange('body')}
                                    disabled={isEmailSending}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
                            <button type="button" className="app-button" onClick={handleSendEmail} disabled={isEmailSending}>
                                {isEmailSending ? 'Menghantar Emel...' : 'Hantar Emel'}
                            </button>
                            <button type="button" className="app-button app-button-ghost" onClick={closeEmailModal} disabled={isEmailSending}>
                                Batal
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintPrintBorang5;
