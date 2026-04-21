import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { getComplaintStageLabel } from './complaintStage';

const ComplaintPrintTindakanAduan = () => {
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
    const statusHistoryDate = complaint?.aj_action_datetime ? formatDateDMY(complaint.aj_action_datetime) : handoverDateText;
    const statusHistoryTime = complaint?.aj_action_datetime ? formatTimeMalay(complaint.aj_action_datetime) : handoverTimeText;
    const currentStatus = complaint?.aj_current_status || getComplaintStageLabel(complaint?.current_stage || 'baru');
    const currentClassification = complaint?.aj_ppa_classification || '-';
    const districtDisplay = complaint?.district_name || complaint?.district?.name || '-';
    const caseRegisterNo = complaint?.case_register_no || '-';
    const notesText = complaint?.handover_notes || complaint?.aj_directive_notes || complaint?.aj_report_notes || '-';

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
                    <div className="print-table-row">
                        <span>{renderValue(currentClassification)}</span>
                        <span>{renderValue(statusHistoryDate)}</span>
                        <span>{renderValue(statusHistoryTime)}</span>
                        <span>{renderValue(notesText)}</span>
                    </div>
                </div>

                <div className="print-footer-note">
                    Status Terkini / Tarikh Tindakan : {renderValue(currentStatus)}
                </div>
                <div className="print-footer-note">
                    No. Daftar Kes : {renderValue(caseRegisterNo)}
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintTindakanAduan;
