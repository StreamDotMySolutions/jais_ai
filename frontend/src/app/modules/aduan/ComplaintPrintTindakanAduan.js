import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

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
    const complaintDate = complaint?.complaint_date || '-';
    const complaintTime = complaint?.complaint_time || '-';
    const receivedBy = complaint?.submitted_by?.staff?.name || complaint?.submitted_by?.name || '-';
    const pelaksanaName = complaint?.pic_user?.name || '-';
    const approverDate = complaint?.approver_confirmed_at ? new Date(complaint.approver_confirmed_at) : null;
    const approverDateText = approverDate ? approverDate.toLocaleDateString('ms-MY') : '-';
    const approverTimeText = approverDate ? approverDate.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : '-';
    const directiveAt = complaint?.aj_directive_at ? new Date(complaint.aj_directive_at) : null;
    const directiveDateText = directiveAt ? directiveAt.toLocaleDateString('ms-MY') : approverDateText;
    const directiveTimeText = directiveAt ? directiveAt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : approverTimeText;
    const handoverAt = complaint?.handover_at ? new Date(complaint.handover_at) : null;
    const handoverDateText = handoverAt ? handoverAt.toLocaleDateString('ms-MY') : (complaint?.approver_confirmed_at ? approverDateText : '-');
    const handoverTimeText = handoverAt ? handoverAt.toLocaleTimeString('ms-MY', { hour: '2-digit', minute: '2-digit' }) : (complaint?.approver_confirmed_at ? approverTimeText : '-');

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
                    Bahagian Pengurusan Penguatkuasaan Jabatan Agama Islam Selangor
                </div>

                <div className="print-block-title">Butiran Aduan</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Nombor Aduan</span>
                        <strong>{renderValue(complaint.reference_no)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Penerimaan Aduan</span>
                        <strong>{renderValue(complaintDate)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Penerimaan Aduan</span>
                        <strong>{renderValue(complaintTime)}</strong>
                    </div>
                </div>
                <div className="print-box-grid print-box-grid-2">
                    <div className="print-box">
                        <span>Nama Penerima Aduan</span>
                        <strong>{renderValue(receivedBy)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Kumpulan / Pelaksana</span>
                        <strong>{renderValue(pelaksanaName)}</strong>
                    </div>
                </div>

                <div className="print-block-title">Makluman Aduan dan Arahan Penyelia</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Nama Penyelia Bertugas</span>
                        <strong>{renderValue(complaint.aj_directive_staff?.name)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Maklum Aduan</span>
                        <strong>{renderValue(directiveDateText)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Maklum Aduan</span>
                        <strong>{renderValue(directiveTimeText)}</strong>
                    </div>
                </div>
                <div className="print-notes">
                    <span>Minit / Arahan Tindakan</span>
                    <div className="print-notes-box">
                        {renderValue(complaint.aj_directive_notes || complaint.aj_report_notes)}
                    </div>
                </div>

                <div className="print-block-title">Serahan Aduan Kepada Anggota Pelaksana</div>
                <div className="print-box-grid print-box-grid-3">
                    <div className="print-box">
                        <span>Pelaksana / Daerah Pelaksana</span>
                        <strong>{renderValue(complaint.district_name)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Tarikh Serahan</span>
                        <strong>{renderValue(handoverDateText)}</strong>
                    </div>
                    <div className="print-box">
                        <span>Masa Serahan</span>
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
                        <span>{renderValue(complaint.classification_code)}</span>
                        <span>{renderValue(handoverDateText)}</span>
                        <span>{renderValue(handoverTimeText)}</span>
                        <span>{renderValue(complaint.handover_notes || complaint.aj_notes)}</span>
                    </div>
                </div>

                <div className="print-footer-note">
                    Status Terkini / Tarikh Tindakan: {renderValue(complaint.current_stage)}
                </div>
                <div className="print-footer-note">
                    No. Daftar Kes: {renderValue(complaint.case_register_no)}
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintTindakanAduan;
