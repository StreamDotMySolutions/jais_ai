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

    const renderValue = (value) => value || '-';
    const complaintDateTime = `${complaint?.complaint_date || '-'}${complaint?.complaint_time ? ` ${complaint.complaint_time}` : ''}`;
    const issuerName = complaint?.submitted_by?.staff?.name || complaint?.submitted_by?.name || '-';

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
                    Cetak Borang 5
                </button>
            </div>

            <div className="print-sheet">
                <div className="print-header">
                    <div className="print-meta">REK: BPN-01</div>
                    <h1>BORANG 5</h1>
                    <div className="print-subtitle">
                        ENAKMEN TATACARA JENAYAH SYARIAH (NEGERI SELANGOR) 2003
                    </div>
                    <div className="print-subtitle">
                        Subseksyen 54(2) / 5(1)
                    </div>
                    <div className="print-subtitle">
                        MAKLUMAT KEPADA PEGAWAI PENGUATKUASA AGAMA
                    </div>
                </div>

                <div className="print-grid">
                    <div className="print-row">
                        <span>No. Daftar Aduan</span>
                        <strong>{renderValue(complaint.reference_no)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Daerah</span>
                        <strong>{renderValue(complaint.district_name)}</strong>
                    </div>
                    <div className="print-row">
                        <span>Tarikh / Masa</span>
                        <strong>{renderValue(complaintDateTime)}</strong>
                    </div>
                </div>

                <div className="print-section">
                    <h2>Butir-Butir Pemberi Maklumat</h2>
                    <div className="print-grid">
                        <div className="print-row">
                            <span>Nama</span>
                            <strong>{renderValue(complaint.complainant_name)}</strong>
                        </div>
                        <div className="print-row">
                            <span>No. Pengenalan Diri</span>
                            <strong>{renderValue(complaint.identification_number)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Alamat</span>
                            <strong>{renderValue(complaint.address)}</strong>
                        </div>
                        <div className="print-row">
                            <span>Pekerjaan</span>
                            <strong>{renderValue(complaint.occupation)}</strong>
                        </div>
                        <div className="print-row">
                            <span>No. Telefon</span>
                            <strong>{renderValue(complaint.contact_number)}</strong>
                        </div>
                    </div>
                </div>

                <div className="print-section">
                    <p>Saya dengan ini memberikan maklumat berikut:</p>
                    <p className="print-paragraph">{renderValue(complaint.borang5_statement || complaint.summary)}</p>
                </div>

                <div className="print-signature">
                    <div className="print-sign-line">
                        Tandatangan Pemberi Maklumat
                    </div>
                    <div className="print-sign-name">{renderValue(complaint.complainant_name)}</div>
                </div>

                <div className="print-section">
                    <p>
                        Maklumat di atas diberikan secara bertulis / lisan dan telah ditandatangani oleh pegawai di bawah ini dan
                        dibacakan kepada Pemberi Maklumat.
                    </p>
                </div>

                <div className="print-signature">
                    <div className="print-sign-line">
                        Tandatangan Pegawai Penguatkuasa Agama
                    </div>
                    <div className="print-sign-name">{issuerName}</div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintBorang5;
