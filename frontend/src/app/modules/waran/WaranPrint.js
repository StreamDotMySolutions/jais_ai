import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const WaranPrint = () => {
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
        setError('');
        axios.get(`${apiUrl}/i-waran/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => setRecord(response?.data?.data || null))
            .catch(() => setError('Gagal memuatkan maklumat waran.'))
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, token]);

    if (isLoading) {
        return <div className="app-empty">Memuatkan...</div>;
    }

    if (error) {
        return <div className="app-empty">{error}</div>;
    }

    if (!record) {
        return <div className="app-empty">Rekod tidak dijumpai.</div>;
    }

    return (
        <div className="app-print">
            <div className="app-print-toolbar">
                <button type="button" className="app-button app-button-ghost" onClick={() => navigate(`/app/i-waran/${record.id}`)}>
                    Kembali
                </button>
                <button type="button" className="app-button" onClick={() => window.print()}>
                    <i className="bi bi-printer"></i>
                    Print / Save PDF
                </button>
            </div>

            <div className="app-print-sheet">
                <div className="app-print-header">
                    <div>
                        <div className="app-print-eyebrow">i-WARAN</div>
                        <h1>Butiran Waran</h1>
                        <div className="app-print-sub">
                            ID: <strong>{record.id}</strong>
                        </div>
                    </div>
                    <div className="app-print-meta">
                        <div>
                            <span>Status</span>
                            <strong>{record.status || 'draf'}</strong>
                        </div>
                        <div>
                            <span>Tarikh Terima</span>
                            <strong>{record.tarikh_masa_terima || '-'}</strong>
                        </div>
                    </div>
                </div>

                <div className="app-print-block">
                    <h3>Maklumat Waran</h3>
                    <div className="app-print-grid">
                        <div><span>No. Ruj Fail</span><strong>{record.no_ruj_fail || '-'}</strong></div>
                        <div><span>Jenis Waran</span><strong>{record.jenis_waran || '-'}</strong></div>
                        <div><span>No. Kes</span><strong>{record.no_kes || '-'}</strong></div>
                        <div><span>Daerah</span><strong>{record.daerah?.name || '-'}</strong></div>
                        <div><span>Mahkamah</span><strong>{record.mahkamah?.nama || '-'}</strong></div>
                        <div><span>Tarikh Bicara</span><strong>{record.tarikh_bicara || '-'}</strong></div>
                    </div>
                </div>

                <div className="app-print-block">
                    <h3>Maklumat OKT</h3>
                    <div className="app-print-grid">
                        <div><span>Nama</span><strong>{record.nama_okt || '-'}</strong></div>
                        <div><span>No. K/P</span><strong>{record.no_kp_okt || '-'}</strong></div>
                        <div><span>No. Telefon</span><strong>{record.telefon_okt || '-'}</strong></div>
                        <div className="span-2"><span>Alamat</span><strong style={{ whiteSpace: 'pre-wrap' }}>{record.alamat_okt || '-'}</strong></div>
                    </div>
                </div>

                <div className="app-print-block">
                    <h3>Pelaksanaan</h3>
                    <div className="app-print-grid">
                        <div><span>Pelaksana</span><strong>{record.pelaksana?.name || '-'}</strong></div>
                        <div><span>Jumlah Perlaksanaan</span><strong>{record.jumlah_perlaksanaan ?? '-'}</strong></div>
                        <div><span>Hasil Perlaksanaan</span><strong>{record.hasil_perlaksanaan?.nama || '-'}</strong></div>
                        <div className="span-2"><span>Alamat Pejabat</span><strong style={{ whiteSpace: 'pre-wrap' }}>{record.alamat_pejabat || '-'}</strong></div>
                    </div>
                    {record.laporan && (
                        <div className="app-print-note">
                            <div className="k">Laporan</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{record.laporan}</div>
                        </div>
                    )}
                </div>

                <div className="app-print-block">
                    <h3>Lampiran</h3>
                    {record.attachments?.length ? (
                        <ol className="app-print-list">
                            {record.attachments.map((f) => (
                                <li key={f.id}>{f.file_name}</li>
                            ))}
                        </ol>
                    ) : (
                        <div className="app-print-muted">Tiada lampiran.</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaranPrint;

