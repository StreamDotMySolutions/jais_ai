import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import ConfirmModal from '../../components/SharedConfirmModal';
import { useToast } from '../../components/SharedToastProvider';
import AttachmentSection from '../../components/SharedAttachmentSection';

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

const WARAN_STAGE_TONE = {
    baru: 'app-waran-status-pill is-draf',
    dihantar_ke_daerah: 'app-status-pill-soft',
    diterima_daerah: 'app-status-pill-soft',
    hantar_ke_mahkamah: 'app-waran-status-pill is-hantar_mahkamah',
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
    const [actionLoading, setActionLoading] = useState('');

    const handleDispatch = () => {
        if (!apiUrl || !record?.id || actionLoading) {
            return;
        }
        setActionLoading('dispatch');
        axios.post(`${apiUrl}/i-waran/${record.id}/dispatch-to-district`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRecord(response?.data?.data || null);
                toast.success(response?.data?.message || 'Waran berjaya dihantar ke daerah.');
                setError('');
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal hantar waran ke daerah.';
                setError(msg);
                toast.error(msg);
            })
            .finally(() => setActionLoading(''));
    };

    const handlePickup = () => {
        if (!apiUrl || !record?.id || actionLoading) {
            return;
        }
        setActionLoading('pickup');
        axios.post(`${apiUrl}/i-waran/${record.id}/pickup`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRecord(response?.data?.data || null);
                toast.success(response?.data?.message || 'Waran berjaya diterima.');
                setError('');
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal terima waran.';
                setError(msg);
                toast.error(msg);
            })
            .finally(() => setActionLoading(''));
    };

    const handleSendToCourt = () => {
        if (!apiUrl || !record?.id || actionLoading) {
            return;
        }
        setActionLoading('court');
        axios.post(`${apiUrl}/i-waran/${record.id}/send-to-court`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRecord(response?.data?.data || null);
                toast.success(response?.data?.message || 'Email i-Waran berjaya dihantar ke mahkamah.');
                setError('');
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal hantar email i-Waran ke mahkamah.';
                setError(msg);
                toast.error(msg);
            })
            .finally(() => setActionLoading(''));
    };

    const renderKvGrid = (columns = []) => (
        <div className="app-waran-kv-grid">
            {columns.map((rows, index) => (
                <div className="app-waran-kv-col" key={`col-${index}`}>
                    {rows.map((row) => (
                        <div
                            className={`app-kv${row.stack ? ' app-kv--stack' : ''}`}
                            key={row.label}
                        >
                            <span className="app-kv-label">{row.label}</span>
                            {row.stack ? (
                                <div className="app-kv-stack">
                                    <span className="app-kv-value">{row.value ?? '-'}</span>
                                </div>
                            ) : (
                                <span className="app-kv-value">{row.value ?? '-'}</span>
                            )}
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );

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

    const openWaranPrintPopup = () => {
        const url = `/app/i-waran/${record.id}/print`;
        const popup = window.open(
            url,
            'laporanPelaksanaanWaran',
            'width=980,height=720,scrollbars=yes,resizable=yes'
        );
        if (!popup) {
            navigate(url);
        }
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
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">i-WARAN</span>
                    <h3>Butiran Waran</h3>
                    <p>Maklumat ringkas untuk rujukan pantas.</p>
                    <div className="app-status-stack" style={{ marginTop: '0.45rem' }}>
                        <span className={`app-status-pill ${WARAN_STAGE_TONE[record.current_stage || 'baru'] || ''}`} title="Status Waran">
                            Status Waran: {record.current_stage_label || 'Baru'}
                        </span>
                        {record.status && (
                            <span className="app-status-pill-mini is-muted" title="Status Pelaksanaan">
                                Pelaksanaan: {toTitle(record.status)}
                            </span>
                        )}
                        {record.sent_to_court_at && (
                            <span className="app-status-pill-mini is-info" title="Status penghantaran ke mahkamah">
                                {record.court_delivery_label || 'Telah hantar ke Mahkamah'}
                            </span>
                        )}
                    </div>
                </div>
                <div className="app-complaints-actions">
                    {record.can_dispatch && (
                        <button
                            className="app-button"
                            type="button"
                            onClick={handleDispatch}
                            disabled={actionLoading === 'dispatch'}
                        >
                            {actionLoading === 'dispatch' && (
                                <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden="true"
                                    style={{ marginRight: '.45rem' }}
                                ></span>
                            )}
                            {actionLoading === 'dispatch' ? 'Menghantar...' : `Hantar ke ${record.daerah?.name || 'Daerah'}`}
                        </button>
                    )}
                    {record.can_pickup && (
                        <button
                            className="app-button"
                            type="button"
                            onClick={handlePickup}
                            disabled={actionLoading === 'pickup'}
                        >
                            {actionLoading === 'pickup' && (
                                <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden="true"
                                    style={{ marginRight: '.45rem' }}
                                ></span>
                            )}
                            {actionLoading === 'pickup' ? 'Menerima...' : 'Terima Waran'}
                        </button>
                    )}
                    {record.can_send_to_court && (
                        <button
                            className="app-button app-button-ghost"
                            type="button"
                            onClick={handleSendToCourt}
                            disabled={actionLoading === 'court'}
                        >
                            {actionLoading === 'court' && (
                                <span
                                    className="spinner-border spinner-border-sm"
                                    role="status"
                                    aria-hidden="true"
                                    style={{ marginRight: '.45rem' }}
                                ></span>
                            )}
                            {actionLoading === 'court' ? 'Menghantar...' : 'Hantar ke Mahkamah'}
                        </button>
                    )}
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={openWaranPrintPopup}
                    >
                        <i className="bi bi-printer"></i>
                        Laporan Pelaksanaan Waran
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
                {renderKvGrid([
                    [
                        { label: 'Jenis Waran', value: toTitle(record.jenis_waran) },
                        { label: 'Tahun', value: record.tahun || '-' },
                        { label: 'Daerah', value: record.daerah?.name || '-' },
                    ],
                    [
                        { label: 'No. Ruj Fail', value: record.no_ruj_fail || '-' },
                        { label: 'No. Kes', value: record.no_kes || '-' },
                        { label: 'Mahkamah', value: record.mahkamah?.nama || '-', stack: true },
                    ],
                    [
                        { label: 'Tarikh/Masa Terima', value: formatDateTime(record.tarikh_masa_terima) },
                        { label: 'Status Pelaksanaan', value: toTitle(record.status || 'draf') },
                        { label: 'Tarikh Bicara', value: formatDateTime(record.tarikh_bicara) },
                    ],
                    [
                        { label: 'Stage Semasa', value: record.current_stage_label || 'Baru' },
                        { label: 'Dihantar Ke Daerah Pada', value: formatDateTime(record.sent_to_district_at) },
                        { label: 'Dihantar Oleh', value: record.sent_to_district_by?.name || '-' },
                    ],
                    [
                        { label: 'Diterima Pada', value: formatDateTime(record.received_at) },
                        { label: 'Diterima Oleh', value: record.received_by?.name || '-' },
                        { label: 'Hantar ke Mahkamah Pada', value: formatDateTime(record.sent_to_court_at) },
                    ],
                    [
                        { label: 'Hantar ke Mahkamah Oleh', value: record.sent_to_court_by?.name || '-' },
                    ],
                ])}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Tambahan</h4>
                </div>
                {renderKvGrid([
                    [
                        { label: 'Jenis Kes (Mal)', value: record.jenis_kes_mal?.nama || '-' },
                        { label: 'Email Mahkamah', value: record.emel_mahkamah || '-', stack: true },
                        { label: 'Catatan Pendaftar', value: record.catatan_pendaftar || '-', stack: true },
                    ],
                    [
                        { label: 'Jenis Kes (Jenayah)', value: record.jenis_kes_jenayah?.nama || '-' },
                        { label: 'Pendaftar', value: record.pendaftar?.name || '-', stack: true },
                        { label: 'Lain-lain Kes (Jenayah)', value: record.jenis_kes_jenayah_lain || '-' },
                    ],
                    [
                        { label: 'Email', value: record.emel || '-', stack: true },
                        { label: 'Lain-lain Kes (Mal)', value: record.jenis_kes_mal_lain || '-' },
                    ],
                ])}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Dokumen Mahkamah</h4>
                </div>
                <AttachmentSection
                    apiUrl={apiUrl}
                    token={token}
                    recordId={record.id}
                    attachments={record.court_documents || []}
                    canUpload={false}
                    canDelete={false}
                />
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Lampiran Pelaksana</h4>
                </div>
                <AttachmentSection
                    apiUrl={apiUrl}
                    token={token}
                    recordId={record.id}
                    attachments={record.attachments || []}
                    canUpload={false}
                    canDelete={false}
                />
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat OKT</h4>
                </div>
                {renderKvGrid([
                    [
                        { label: 'Nama', value: record.nama_okt || '-' },
                        { label: 'No. Telefon', value: record.telefon_okt || '-' },
                    ],
                    [
                        { label: 'No. K/P', value: record.no_kp_okt || '-' },
                        { label: 'Alamat', value: record.alamat_okt || '-', stack: true },
                    ],
                ])}
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Pelaksanaan</h4>
                </div>
                {renderKvGrid([
                    [
                        { label: 'Pelaksana', value: record.pelaksana?.name || '-' },
                        { label: 'Tarikh/Masa Perlaksanaan 1', value: formatDateTime(record.tarikh_masa_perlaksanaan_1) },
                        { label: 'Hasil Perlaksanaan', value: record.hasil_perlaksanaan?.nama || '-' },
                    ],
                    [
                        { label: 'Alamat Pejabat', value: record.alamat_pejabat || '-', stack: true },
                        { label: 'Tarikh/Masa Perlaksanaan 2', value: formatDateTime(record.tarikh_masa_perlaksanaan_2) },
                        { label: 'Laporan', value: record.laporan || '-', stack: true },
                    ],
                    [
                        { label: 'Jumlah Perlaksanaan', value: record.jumlah_perlaksanaan ?? '-' },
                        { label: 'Tarikh/Masa Perlaksanaan 3', value: formatDateTime(record.tarikh_masa_perlaksanaan_3) },
                        { label: 'Catatan Pelaksana', value: record.catatan_pelaksana || '-', stack: true },
                    ],
                ])}
            </div>
        </div>
    );
};

export default WaranDetail;
