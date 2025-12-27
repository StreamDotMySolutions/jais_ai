import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const ComplaintDetail = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const [complaint, setComplaint] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortedIds, setSortedIds] = useState([]);
    const [approvalMeta, setApprovalMeta] = useState({
        approvals_count: 0,
        approvals_required: 2,
        has_approved: false,
    });
    const [actionMessage, setActionMessage] = useState('');
    const [statusInput, setStatusInput] = useState('');
    const role = localStorage.getItem('role') || 'awam';

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        axios.get(`${apiUrl}/complaints/${id}`)
            .then((response) => {
                setComplaint(response?.data?.data || null);
                setApprovalMeta(response?.data?.meta || {
                    approvals_count: 0,
                    approvals_required: 2,
                    has_approved: false,
                });
            })
            .catch((err) => {
                setError(err?.message || 'Gagal mendapatkan aduan.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [apiUrl, id]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        axios.get(`${apiUrl}/complaints`)
            .then((response) => {
                const ids = (response?.data?.data || []).map((item) => item.id);
                setSortedIds(ids);
            })
            .catch(() => {
                setSortedIds([]);
            });
    }, [apiUrl]);

    const submitApproval = () => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionMessage('');
        axios.post(`${apiUrl}/complaints/${id}/approve`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setActionMessage('Aduan telah disahkan.');
                setApprovalMeta((prev) => ({
                    ...prev,
                    approvals_count: response?.data?.approvals_count ?? prev.approvals_count,
                    has_approved: true,
                }));
                setComplaint((prev) => prev ? { ...prev, current_stage: response?.data?.current_stage } : prev);
            })
            .catch((err) => {
                setActionMessage(err?.response?.data?.message || 'Gagal mengesahkan aduan.');
            });
    };

    const submitStatus = () => {
        if (!apiUrl || !statusInput) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionMessage('');
        axios.post(`${apiUrl}/complaints/${id}/status`, {
            status: statusInput,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setActionMessage('Status berjaya dikemaskini.');
                setComplaint((prev) => prev ? { ...prev, current_stage: response?.data?.current_stage } : prev);
            })
            .catch((err) => {
                setActionMessage(err?.response?.data?.message || 'Gagal kemaskini status.');
            });
    };

    const handleNext = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex === -1 || currentIndex === sortedIds.length - 1) {
            return;
        }
        const nextId = sortedIds[currentIndex + 1];
        navigate(`/app/complaints/${nextId}`);
    };

    const handlePrev = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex <= 0) {
            return;
        }
        const prevId = sortedIds[currentIndex - 1];
        navigate(`/app/complaints/${prevId}`);
    };

    if (isLoading) {
        return <div className="app-card">Memuatkan aduan...</div>;
    }

    if (error) {
        return <div className="app-card">{error}</div>;
    }

    if (!complaint) {
        return <div className="app-card">Aduan tidak ditemui.</div>;
    }

    return (
        <div className="app-detail">
            <div className="app-detail-header">
                <div className="app-detail-header-block">
                    <Link className="app-back" to="/app/complaints">
                        <i className="bi bi-arrow-left"></i>
                        Kembali ke Senarai
                    </Link>
                    <span className="app-detail-kicker">No Aduan</span>
                    <div className="app-detail-number">
                        <h3>{complaint.reference_no || '-'}</h3>
                        <span className="app-status-pill">{complaint.current_stage || 'baru'}</span>
                    </div>
                </div>
                <div className="app-detail-actions">
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={handlePrev}
                        disabled={sortedIds.indexOf(Number(id)) <= 0}
                    >
                        <i className="bi bi-arrow-left"></i>
                        Sebelum
                    </button>
                    <button
                        className="app-button"
                        type="button"
                        onClick={handleNext}
                        disabled={sortedIds.indexOf(Number(id)) === sortedIds.length - 1}
                    >
                        Seterusnya
                        <i className="bi bi-arrow-right"></i>
                    </button>
                </div>
            </div>

            <div className="app-detail-grid">
                <div className="app-card">
                    <h4>Maklumat Pengadu</h4>
                    <div className="app-detail-row">
                        <span>Nama</span>
                        <strong>{complaint.complainant_name || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>No Kad Pengenalan</span>
                        <strong>{complaint.identification_number || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>No HP</span>
                        <strong>{complaint.contact_number || '-'}</strong>
                    </div>
                </div>

                <div className="app-card">
                    <h4>Maklumat Aduan</h4>
                    <div className="app-detail-row">
                        <span>Tarikh & Masa</span>
                        <strong>
                            {complaint.complaint_date || '-'} {complaint.complaint_time || ''}
                        </strong>
                    </div>
                    <div className="app-detail-row">
                        <span>Daerah</span>
                        <strong>{complaint.district_name || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>Alamat</span>
                        <strong>{complaint.address || '-'}</strong>
                    </div>
                </div>
            </div>

            <div className="app-card">
                <h4>Ringkasan Aduan</h4>
                <p className="app-detail-summary">{complaint.summary || '-'}</p>
            </div>

            {(role === 'pegawai' || role === 'admin' || role === 'system') && (
                <div className="app-card">
                    <h4>Tindakan Pegawai</h4>
                    <div className="app-actions-grid">
                        <div>
                            <div className="app-detail-row">
                                <span>Pengesahan</span>
                                <strong>{approvalMeta.approvals_count} / {approvalMeta.approvals_required}</strong>
                            </div>
                            <button
                                className="app-button"
                                type="button"
                                onClick={submitApproval}
                                disabled={approvalMeta.has_approved}
                            >
                                {approvalMeta.has_approved ? 'Telah Disahkan' : 'Sahkan Aduan'}
                            </button>
                        </div>
                        <div>
                            <label className="app-filter-label">Kemaskini Status</label>
                            <div className="app-status-row">
                                <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
                                    <option value="">Pilih Status</option>
                                    <option value="baru">Baharu</option>
                                    <option value="dalam_tindakan">Dalam Tindakan</option>
                                    <option value="kiv">KIV</option>
                                    <option value="selesai">Selesai</option>
                                    <option value="disahkan">Disahkan</option>
                                </select>
                                <button className="app-button app-button-ghost" type="button" onClick={submitStatus}>
                                    Simpan
                                </button>
                            </div>
                        </div>
                    </div>
                    {actionMessage && <div className="app-detail-note">{actionMessage}</div>}
                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;
