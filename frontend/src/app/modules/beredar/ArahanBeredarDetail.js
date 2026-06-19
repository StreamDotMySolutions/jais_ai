import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const formatDateTime = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur',
    });
};

const formatAuditUser = (user) => user?.name || '-';

const ArahanBeredarDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const role = String(localStorage.getItem('role') || '').trim().toLowerCase();
    const canViewAudit = ['admin', 'system'].includes(role);
    const [record, setRecord] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiUrl || !id) {
            setError('Rekod tidak dijumpai.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/arahan-beredar/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRecord(response?.data?.data || null);
            })
            .catch(() => {
                setError('Gagal memuatkan rekod.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, token]);

    if (isLoading) {
        return <div className="app-empty">Memuatkan rekod...</div>;
    }

    if (error) {
        return <div className="app-empty">{error}</div>;
    }

    if (!record) {
        return <div className="app-empty">Rekod tidak dijumpai.</div>;
    }

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Arahan Beredar</span>
                    <h3>Butiran Rekod Arahan Beredar</h3>
                    <p>Maklumat ringkas untuk rujukan pantas.</p>
                </div>
                <div className="app-complaints-actions">
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={() => navigate('/app/arahan-beredar')}
                    >
                        Kembali
                    </button>
                    <button
                        className="app-button"
                        type="button"
                        onClick={() => navigate(`/app/arahan-beredar/${record.id}/edit`)}
                    >
                        Kemaskini Rekod
                    </button>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Kejadian</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Lokasi Kejadian</span>
                        <div className="app-detail-value">{record.location || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh Kejadian</span>
                        <div className="app-detail-value">{record.incident_date || '-'}</div>
                    </div>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Kesalahan</h4>
                </div>
                <div className="app-form-section">
                    <p>Seksyen kesalahan yang direkodkan.</p>
                </div>
                <ul className="app-list">
                    {(record.sections || []).map((section) => (
                        <li key={section.id}>{section.name}</li>
                    ))}
                </ul>
                {record.other_section && (
                    <div className="app-inline-section">
                        <div className="app-form-field">
                            <span>Lain-lain Kesalahan</span>
                            <div className="app-detail-value">{record.other_section}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat OYDS</h4>
                </div>
                {record.oyds?.length ? (
                    <div className="app-inline-table app-oyds-table">
                        <div className="app-inline-table-header">
                            <span>Nama</span>
                            <span>No. K/P</span>
                            <span>No. Telefon</span>
                            <span>Alamat</span>
                        </div>
                        {record.oyds.map((row) => (
                            <div key={row.id} className="app-inline-table-row">
                                <span>{row.name || '-'}</span>
                                <span>{row.ic_number || '-'}</span>
                                <span>{row.phone || '-'}</span>
                                <span>{row.address || '-'}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="app-empty">Tiada maklumat OYDS.</div>
                )}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Pegawai Bertugas</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Nama</span>
                        <div className="app-detail-value">{record.staff?.name || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Email</span>
                        <div className="app-detail-value">{record.email || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Status Rekod</span>
                        <div className="app-detail-value">{record.status || '-'}</div>
                    </div>
                </div>
            </div>

            {canViewAudit && (
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Audit Rekod</h4>
                    </div>
                    <div className="app-waran-kv-grid">
                        <div className="app-waran-kv-col">
                            <div className="app-kv">
                                <span className="app-kv-label">Dicipta Oleh</span>
                                <span className="app-kv-value">{formatAuditUser(record.created_by || record.creator)}</span>
                            </div>
                            <div className="app-kv">
                                <span className="app-kv-label">Tarikh Cipta</span>
                                <span className="app-kv-value">{formatDateTime(record.created_at)}</span>
                            </div>
                        </div>
                        <div className="app-waran-kv-col">
                            <div className="app-kv">
                                <span className="app-kv-label">Dikemaskini Oleh</span>
                                <span className="app-kv-value">{formatAuditUser(record.updated_by)}</span>
                            </div>
                            <div className="app-kv">
                                <span className="app-kv-label">Tarikh Kemaskini</span>
                                <span className="app-kv-value">{formatDateTime(record.updated_at)}</span>
                            </div>
                        </div>
                        <div className="app-waran-kv-col">
                            <div className="app-kv">
                                <span className="app-kv-label">Dipadam Oleh</span>
                                <span className="app-kv-value">{formatAuditUser(record.deleted_by)}</span>
                            </div>
                            <div className="app-kv">
                                <span className="app-kv-label">Tarikh Padam</span>
                                <span className="app-kv-value">{formatDateTime(record.deleted_at)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ArahanBeredarDetail;
