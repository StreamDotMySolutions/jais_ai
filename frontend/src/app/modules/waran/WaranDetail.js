import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import AttachmentPreviewModal from '../../components/AttachmentPreviewModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useToast } from '../../components/ToastProvider';

const formatBytes = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const num = value / (1024 ** idx);
    return `${num.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

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

const toTitle = (value) => {
    if (!value) {
        return '-';
    }
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const WaranDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const toast = useToast();

    const [record, setRecord] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewMime, setPreviewMime] = useState('');
    const [previewName, setPreviewName] = useState('');
    const [thumbUrls, setThumbUrls] = useState({});

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
            .then((response) => {
                setRecord(response?.data?.data || null);
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan maklumat waran.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, token]);

    useEffect(() => {
        if (!apiUrl) {
            return undefined;
        }

        const maxThumbBytes = 3 * 1024 * 1024;
        let disposed = false;
        const list = record?.attachments || [];
        const currentIds = new Set(list.map((f) => f.id));

        setThumbUrls((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                const idKey = Number(key);
                if (!currentIds.has(idKey)) {
                    try { window.URL.revokeObjectURL(next[key]); } catch (_) { /* ignore */ }
                    delete next[key];
                }
            });
            return next;
        });

        const candidates = list.filter((file) => {
            if (!file?.id) return false;
            const mime = String(file?.mime || '');
            if (!mime.startsWith('image/')) return false;
            if (typeof file.size === 'number' && file.size > maxThumbBytes) return false;
            return !thumbUrls[file.id];
        });

        candidates.slice(0, 6).forEach((file) => {
            const url = file.download_url || `${apiUrl}/i-waran/attachments/${file.id}/download`;
            axios.get(url, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                responseType: 'blob',
            })
                .then((response) => {
                    if (disposed) return;
                    const contentType = response.headers?.['content-type'] || file.mime || 'image/*';
                    const blob = new Blob([response.data], { type: contentType });
                    const blobUrl = window.URL.createObjectURL(blob);
                    setThumbUrls((prev) => ({ ...prev, [file.id]: blobUrl }));
                })
                .catch(() => {
                    // ignore
                });
        });

        return () => {
            disposed = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, record, token]);

    const downloadBlob = (blob, filename) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename || 'export.xlsx';
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
    };

    const exportSingleXlsx = () => {
        if (!apiUrl || !id) {
            return;
        }
        axios.get(`${apiUrl}/i-waran/${id}/export/xlsx`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                downloadBlob(blob, `i-waran-${id}.xlsx`);
            })
            .catch(() => {
                setError('Gagal export Excel.');
            });
    };

    const closePreview = () => {
        setPreviewOpen(false);
        setPreviewError('');
        setPreviewLoading(false);
        if (previewUrl) {
            window.setTimeout(() => window.URL.revokeObjectURL(previewUrl), 250);
        }
        setPreviewUrl('');
        setPreviewMime('');
        setPreviewName('');
    };

    const openPreview = (file) => {
        if (!file?.id || !apiUrl) {
            return;
        }
        const url = file.download_url || `${apiUrl}/i-waran/attachments/${file.id}/download`;
        setPreviewError('');
        setPreviewLoading(true);
        setPreviewName(file.file_name || 'Lampiran');
        setPreviewMime(file.mime || '');
        setPreviewOpen(true);
        axios.get(url, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
        })
            .then((response) => {
                const contentType = response.headers?.['content-type'] || file.mime || 'application/octet-stream';
                const blob = new Blob([response.data], { type: contentType });
                const blobUrl = window.URL.createObjectURL(blob);
                setPreviewUrl(blobUrl);
            })
            .catch(() => {
                setPreviewError('Gagal membuka preview fail.');
            })
            .finally(() => setPreviewLoading(false));
    };

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
        <div className="app-waran">
            <ConfirmModal
                isOpen={deleteOpen}
                title="Padam Waran"
                description={`Padam waran ini (ID: ${record.id})? Tindakan ini tidak boleh dikembalikan.`}
                confirmText={deleting ? 'Memadam...' : 'Padam'}
                cancelText="Batal"
                variant="danger"
                confirmDisabled={deleting}
                onCancel={() => setDeleteOpen(false)}
                onConfirm={() => {
                    if (!apiUrl || !record?.id || deleting) {
                        return;
                    }
                    setDeleting(true);
                    axios.delete(`${apiUrl}/i-waran/${record.id}`, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    })
                        .then((response) => {
                            toast.success(response?.data?.message || 'Waran dipadam.');
                            navigate('/app/i-waran');
                        })
                        .catch((err) => {
                            const msg = err?.response?.data?.message || 'Gagal memadam waran.';
                            toast.error(msg);
                            setError(msg);
                        })
                        .finally(() => {
                            setDeleting(false);
                            setDeleteOpen(false);
                        });
                }}
            />
            <AttachmentPreviewModal
                isOpen={previewOpen}
                title="Preview Lampiran i-WARAN"
                fileName={previewName}
                mime={previewMime}
                url={previewUrl}
                onClose={closePreview}
                onOpenTab={() => {
                    if (previewUrl) {
                        window.open(previewUrl, '_blank', 'noopener,noreferrer');
                    }
                }}
            />
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">i-WARAN</span>
                    <h3>Butiran Waran</h3>
                    <p>Maklumat ringkas untuk rujukan pantas.</p>
                </div>
                <div className="app-complaints-actions">
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={() => navigate(`/app/i-waran/${record.id}/print`)}
                    >
                        <i className="bi bi-printer"></i>
                        Print / PDF
                    </button>
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={exportSingleXlsx}
                    >
                        <i className="bi bi-file-earmark-spreadsheet"></i>
                        Export Excel
                    </button>
                    <button
                        className="app-button"
                        type="button"
                        onClick={() => navigate(`/app/i-waran/${record.id}/edit`)}
                    >
                        Kemaskini Waran
                    </button>
                    <button
                        className="app-button app-button-danger"
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                    >
                        <i className="bi bi-trash"></i>
                        Padam
                    </button>
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={() => navigate('/app/i-waran')}
                    >
                        Kembali
                    </button>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Waran</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Jenis Waran</span>
                        <div className="app-detail-value">{toTitle(record.jenis_waran)}</div>
                    </div>
                    <div className="app-form-field">
                        <span>No. Ruj Fail</span>
                        <div className="app-detail-value">{record.no_ruj_fail || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh/Masa Terima</span>
                        <div className="app-detail-value">{formatDateTime(record.tarikh_masa_terima)}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tahun</span>
                        <div className="app-detail-value">{record.tahun || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>No. Kes</span>
                        <div className="app-detail-value">{record.no_kes || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Status</span>
                        <div className="app-detail-value">{toTitle(record.status || 'draf')}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Daerah</span>
                        <div className="app-detail-value">{record.daerah?.name || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Mahkamah</span>
                        <div className="app-detail-value">{record.mahkamah?.nama || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh Bicara</span>
                        <div className="app-detail-value">{formatDateTime(record.tarikh_bicara)}</div>
                    </div>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Tambahan</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Jenis Kes (Mal)</span>
                        <div className="app-detail-value">{record.jenis_kes_mal?.nama || '-'}</div>
                    </div>
                    {record.jenis_kes_mal_lain && (
                        <div className="app-form-field">
                            <span>Lain-lain Kes (Mal)</span>
                            <div className="app-detail-value">{record.jenis_kes_mal_lain}</div>
                        </div>
                    )}
                    <div className="app-form-field">
                        <span>Jenis Kes (Jenayah)</span>
                        <div className="app-detail-value">{record.jenis_kes_jenayah?.nama || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Email</span>
                        <div className="app-detail-value">{record.emel || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Email Mahkamah</span>
                        <div className="app-detail-value">{record.emel_mahkamah || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Pendaftar</span>
                        <div className="app-detail-value">{record.pendaftar?.name || '-'}</div>
                    </div>
                </div>
                {record.catatan_pendaftar && (
                    <div className="app-inline-section">
                        <div className="app-form-field">
                            <span>Catatan Pendaftar</span>
                            <div className="app-detail-value">{record.catatan_pendaftar}</div>
                        </div>
                    </div>
                )}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Lampiran</h4>
                </div>
                {previewError && <div className="app-empty">{previewError}</div>}
                {previewLoading && <div className="app-detail-note">Membuka preview...</div>}
                {record.attachments?.length ? (
                    <div>
                        <div className="app-detail-note" style={{ marginBottom: '0.6rem' }}>
                            {record.attachments.length} lampiran
                        </div>
                        <div className="app-attachment-strip">
                            {record.attachments.map((file) => (
                                <div key={file.id} className="app-attachment-chip">
                                    <button
                                        type="button"
                                        className="app-attachment-main"
                                        onClick={() => openPreview(file)}
                                        title="Preview"
                                    >
                                        <span className="app-attachment-thumb">
                                            {String(file?.mime || '').startsWith('image/') ? (
                                                thumbUrls[file.id] ? (
                                                    <img src={thumbUrls[file.id]} alt="" />
                                                ) : (
                                                    <i className="bi bi-image"></i>
                                                )
                                            ) : (
                                                <i className={`bi ${String(file?.file_name || '').toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark'}`}></i>
                                            )}
                                        </span>
                                        <span className="app-attachment-meta">
                                            <span className="app-attachment-name">{file.file_name}</span>
                                            <span className="app-attachment-size">{formatBytes(file.size)}</span>
                                        </span>
                                    </button>
                                    <span className="app-attachment-actions">
                                        <button
                                            type="button"
                                            className="app-icon-button"
                                            onClick={() => openPreview(file)}
                                            aria-label="Preview lampiran"
                                            title="Preview"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="app-empty">Tiada lampiran.</div>
                )}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat OKT</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Nama</span>
                        <div className="app-detail-value">{record.nama_okt || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>No. K/P</span>
                        <div className="app-detail-value">{record.no_kp_okt || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>No. Telefon</span>
                        <div className="app-detail-value">{record.telefon_okt || '-'}</div>
                    </div>
                    <div className="app-form-field" style={{ gridColumn: '1 / -1' }}>
                        <span>Alamat</span>
                        <div className="app-detail-value">{record.alamat_okt || '-'}</div>
                    </div>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Pelaksanaan</h4>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Pelaksana</span>
                        <div className="app-detail-value">{record.pelaksana?.name || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Alamat Pejabat</span>
                        <div className="app-detail-value">{record.alamat_pejabat || '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Jumlah Perlaksanaan</span>
                        <div className="app-detail-value">{record.jumlah_perlaksanaan ?? '-'}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh/Masa Perlaksanaan 1</span>
                        <div className="app-detail-value">{formatDateTime(record.tarikh_masa_perlaksanaan_1)}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh/Masa Perlaksanaan 2</span>
                        <div className="app-detail-value">{formatDateTime(record.tarikh_masa_perlaksanaan_2)}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Tarikh/Masa Perlaksanaan 3</span>
                        <div className="app-detail-value">{formatDateTime(record.tarikh_masa_perlaksanaan_3)}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Hasil Perlaksanaan</span>
                        <div className="app-detail-value">{record.hasil_perlaksanaan?.nama || '-'}</div>
                    </div>
                </div>

                {record.laporan && (
                    <div className="app-inline-section">
                        <div className="app-form-field">
                            <span>Laporan</span>
                            <div className="app-detail-value" style={{ whiteSpace: 'pre-wrap' }}>{record.laporan}</div>
                        </div>
                    </div>
                )}

                {record.catatan_pelaksana && (
                    <div className="app-inline-section">
                        <div className="app-form-field">
                            <span>Catatan Pelaksana</span>
                            <div className="app-detail-value">{record.catatan_pelaksana}</div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaranDetail;
