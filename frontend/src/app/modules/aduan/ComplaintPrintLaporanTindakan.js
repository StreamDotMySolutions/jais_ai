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
    const complaintDateTime = `${complaint?.complaint_date || '-'}${complaint?.complaint_time ? ` ${complaint.complaint_time}` : ''}`;

    if (isLoading) {
        return <div className="print-loading">Memuatkan laporan...</div>;
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
                    Cetak Laporan Tindakan
                </button>
            </div>

            <div className="print-sheet">
                <div className="print-header">
                    <h1>Laporan Tindakan</h1>
                    <div className="print-subtitle">
                        Hotline 24 Jam - Bahagian Pengurusan Penguatkuasaan Jais
                    </div>
                    <div className="print-chip">No Aduan: {renderValue(complaint.reference_no)}</div>
                </div>

                <div className="print-section">
                    <h2>Maklumat Aduan</h2>
                    <div className="print-grid">
                        <div className="print-row">
                            <span>Tarikh / Masa</span>
                            <strong>{renderValue(complaintDateTime)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Daerah</span>
                            <strong>{renderValue(complaint.district_name)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Kategori</span>
                            <strong>{renderValue(complaint.case_type)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Klasifikasi</span>
                            <strong>{renderValue(complaint.classification_code)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Status Terkini</span>
                            <strong>{renderValue(complaint.current_stage)}</strong>
                        </div>
                    </div>
                </div>

                <div className="print-section">
                    <h2>Ringkasan Aduan</h2>
                    <p className="print-paragraph">{renderValue(complaint.summary)}</p>
                </div>

                <div className="print-section">
                    <h2>Maklumat Pengadu</h2>
                    <div className="print-grid">
                        <div className="print-row">
                            <span>Nama</span>
                            <strong>{renderValue(complaint.complainant_name)}</strong>
                        </div>
                        <div className="print-row">
                            <span>No. Pengenalan</span>
                            <strong>{renderValue(complaint.identification_number)}</strong>
                        </div>
                        <div className="print-row">
                            <span>No. Telefon</span>
                            <strong>{renderValue(complaint.contact_number)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintLaporanTindakan;
