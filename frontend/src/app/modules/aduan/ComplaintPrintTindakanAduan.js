import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { getComplaintStageLabel } from './complaintStage';
import { useToast } from '../../components/SharedToastProvider';

const ComplaintPrintTindakanAduan = () => {
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const toast = useToast();
    const [complaint, setComplaint] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isEmailSending, setIsEmailSending] = useState(false);
    const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
    const [emailForm, setEmailForm] = useState({ email: '', subject: '', body: '' });

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
        return `${pad2(parts[2])}/${pad2(parts[1])}/${parts[0]}`;
    };

    const formatTimeMalay = (value) => {
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
        const hh12 = ((hh + 11) % 12) + 1;
        const session = hh < 12 ? 'PAGI' : 'PETANG';

        return `${hh12}.${pad2(mm)} ${session}`;
    };

    const complaintDate = formatDateDMY(complaint?.complaint_date);
    const complaintTime = formatTimeMalay(complaint?.complaint_time);
    const receivedBy =
        complaint?.receivedBy?.name ||
        complaint?.received_by?.name ||
        complaint?.submittedBy?.staff?.name ||
        complaint?.submitted_by?.staff?.name ||
        complaint?.submittedBy?.name ||
        complaint?.submitted_by?.name ||
        '-';
    const directiveBy = complaint?.ajDirectiveStaff?.name || complaint?.aj_directive_staff?.name || '-';
    const pelaksanaName = complaint?.ajHandoverStaff?.name || complaint?.aj_handover_staff?.name || complaint?.picUser?.name || complaint?.pic_user?.name || '-';
    const directiveAt = complaint?.aj_directive_at ? new Date(complaint.aj_directive_at) : null;
    const directiveDateText = directiveAt ? directiveAt.toLocaleDateString('ms-MY') : complaintDate;
    const directiveTimeText = directiveAt ? directiveAt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : complaintTime;
    const handoverAt = complaint?.handover_at ? new Date(complaint.handover_at) : null;
    const handoverDateText = handoverAt ? handoverAt.toLocaleDateString('ms-MY') : complaintDate;
    const handoverTimeText = handoverAt ? handoverAt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : complaintTime;
    const actionHistoryEntries = Array.isArray(complaint?.actionUpdates)
        ? complaint.actionUpdates
        : (Array.isArray(complaint?.action_updates) ? complaint.action_updates : []);
    const actionHistoryRows = actionHistoryEntries
        .slice()
        .sort((a, b) => (Number(a?.sort_order || 0) - Number(b?.sort_order || 0)))
        .filter((row) => (
            String(row?.classification || '').trim()
            || String(row?.action_date || '').trim()
            || String(row?.action_time || '').trim()
            || String(row?.note || '').trim()
        ))
        .map((row) => ({
            classification: row?.classification || '-',
            date: row?.action_date ? formatDateDMY(row.action_date) : '-',
            time: row?.action_time ? formatTimeMalay(row.action_time) : '-',
            note: row?.note || '-',
        }));
    const currentStatus = (String(complaint?.aj_current_status || '').trim() === 'Other')
        ? (complaint?.aj_current_status_other || 'Other')
        : (complaint?.aj_current_status || getComplaintStageLabel(complaint?.current_stage || 'baru'));
    const districtDisplay = complaint?.district_name || complaint?.district?.name || '-';
    const caseRegisterNo = complaint?.case_register_no || '-';
    const subjectCaseNo = caseRegisterNo !== '-' ? `KES- ${districtDisplay} / ${caseRegisterNo} / ${complaint?.complaint_year || '-'}` : (complaint?.reference_no || `Aduan #${id}`);
    const defaultSubject = `TINDAKAN (${(complaint?.aj_arrest_status || complaint?.arrest_status) === 'ada' ? 'Ada Tangkapan' : 'Tiada Tangkapan'}) : ${subjectCaseNo}`;
    const defaultBody = [
        'Assalamualaikum',
        '',
        `Laporan Tindakan bagi daerah ${districtDisplay} telah diperolehi.`,
        '',
        'Sila muat turun salinan Tindakan Aduan di lampiran sebagai simpanan rekod di Fail KES.',
        '',
        'Terima kasih.',
    ].join('\n');

    const openEmailModal = () => {
        setEmailForm({
            email: '',
            subject: defaultSubject,
            body: defaultBody,
        });
        setIsEmailModalOpen(true);
    };

    const closeEmailModal = () => {
        if (isEmailSending) return;
        setIsEmailModalOpen(false);
    };

    const handleEmailFieldChange = (field) => (event) => {
        const value = event?.target?.value ?? '';
        setEmailForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSendEmail = async () => {
        if (!apiUrl || isEmailSending) return;
        const email = String(emailForm.email || '').trim();
        const subject = String(emailForm.subject || '').trim();
        const body = String(emailForm.body || '').trim();

        if (!email) {
            toast.error('Alamat emel wajib diisi.');
            return;
        }
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(email)) {
            toast.error('Format alamat emel tidak sah.');
            return;
        }
        if (!subject) {
            toast.error('Subjek emel wajib diisi.');
            return;
        }
        if (!body) {
            toast.error('Kandungan emel wajib diisi.');
            return;
        }

        const token = localStorage.getItem('token');
        setIsEmailSending(true);
        try {
            const response = await axios.post(
                `${apiUrl}/complaints/${id}/print/tindakan-aduan/email`,
                { email, subject, body },
                { headers: token ? { Authorization: `Bearer ${token}` } : undefined }
            );
            toast.success(response?.data?.message || 'Tindakan Aduan berjaya dihantar melalui emel.');
            setIsEmailModalOpen(false);
        } catch (err) {
            toast.error(err?.response?.data?.message || err?.message || 'Gagal menghantar emel Tindakan Aduan.');
        } finally {
            setIsEmailSending(false);
        }
    };

    if (isLoading) {
        return <div className="print-loading">Memuatkan borang...</div>;
    }

    if (error) {
        return <div className="print-loading">{error}</div>;
    }

    if (!complaint) {
        return <div className="print-loading">Aduan tidak ditemui.</div>;
    }

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/complaints/${id}`}>
                    Kembali
                </Link>
                <button className="app-button app-button-ghost" type="button" onClick={openEmailModal} disabled={isEmailSending}>
                    Email
                </button>
                <button className="app-button" type="button" onClick={() => window.print()}>
                    Cetak Tindakan Aduan
                </button>
            </div>

            <div className="print-sheet print-sheet-compact print-tindakan">
                <div className="print-banner">Tindakan Aduan</div>
                <div className="print-subtitle-center">
                    HOTLINE 24 JAM
                </div>
                <div className="print-subtitle-center">
                    BAHAGIAN PENGURUSAN PENGUATKUASAAN JABATAN AGAMA ISLAM SELANGOR
                </div>

                <div className="print-block-title">Butiran Aduan</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Nombor Aduan :</span>
                        <strong>{renderValue(complaint.reference_no)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Penerimaan Aduan :</span>
                        <strong>{renderValue(complaintDate)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Penerimaan Aduan :</span>
                        <strong>{renderValue(complaintTime)}</strong>
                    </div>
                </div>
                <div className="print-box-grid print-box-grid-2">
                    <div className="print-box">
                        <span>Nama Penerima Aduan :</span>
                        <strong>{renderValue(receivedBy)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Kumpulan / Pelaksana :</span>
                        <strong>{renderValue(pelaksanaName)}</strong>
                    </div>
                </div>

                <div className="print-block-title">Makluman Aduan dan Arahan Penyelia</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Nama Penyelia Bertugas :</span>
                        <strong>{renderValue(directiveBy)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Maklum Aduan :</span>
                        <strong>{renderValue(directiveDateText)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Maklum Aduan :</span>
                        <strong>{renderValue(directiveTimeText)}</strong>
                    </div>
                </div>
                <div className="print-notes">
                    <span>Minit / Arahan Tindakan :</span>
                    <div className="print-notes-box">
                        {renderValue(complaint.aj_directive_notes || complaint.aj_report_notes)}
                    </div>
                </div>

                <div className="print-block-title">Serahan Aduan Kepada Anggota Pelaksana</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Pelaksana / Daerah Pelaksana :</span>
                        <strong>{renderValue(districtDisplay)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Serahan :</span>
                        <strong>{renderValue(handoverDateText)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Serahan :</span>
                        <strong>{renderValue(handoverTimeText)}</strong>
                    </div>
                </div>

                <div className="print-table print-table-compact">
                    <div className="print-table-head">
                        <span>Status Terkini</span>
                        <span>Tarikh</span>
                        <span>Masa</span>
                        <span>Catatan</span>
                    </div>
                    {actionHistoryRows.length > 0 ? actionHistoryRows.map((row, index) => (
                        <div className="print-table-row" key={`history-${index}`}>
                            <span>{renderValue(row.classification)}</span>
                            <span>{renderValue(row.date)}</span>
                            <span>{renderValue(row.time)}</span>
                            <span>{renderValue(row.note)}</span>
                        </div>
                    )) : (
                        <div className="print-table-row">
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                            <span>-</span>
                        </div>
                    )}
                </div>

                <div className="print-footer-note">
                    Status Terkini / Tarikh Tindakan : {renderValue(currentStatus)}
                </div>
                <div className="print-footer-note">
                    No. Daftar Kes : {renderValue(caseRegisterNo)}
                </div>
            </div>

            {isEmailModalOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeEmailModal}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <h4>Hantar Emel Tindakan Aduan</h4>
                            <p>Lampiran PDF Tindakan Aduan akan dihantar bersama emel ini.</p>
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

export default ComplaintPrintTindakanAduan;
