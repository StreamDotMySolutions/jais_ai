import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const ArahanBeredarDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
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
        </div>
    );
};

export default ArahanBeredarDetail;
