import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import { formatMalaysiaDateTimeStamp } from '../../utils/dateTime';

const formatDateTime = (value) => {
    if (!value) return '-';
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

const ComplaintOpNotesReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [rows, setRows] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [filters, setFilters] = useState({
        district: '',
        fromDate: '',
        toDate: '',
    });

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        axios.get(`${apiUrl}/districts`)
            .then((response) => setDistrictOptions(response?.data?.data || []))
            .catch(() => setDistrictOptions([]));
    }, [apiUrl]);

    const params = useMemo(() => ({
        page: pagination.current_page,
        per_page: pagination.per_page,
        case_type: 'AJ',
        classification: 'OP',
        ...(filters.district ? { district_id: filters.district } : {}),
        ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
        ...(filters.toDate ? { to_date: filters.toDate } : {}),
    }), [filters, pagination.current_page, pagination.per_page]);

    const loadRows = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');

        axios.get(`${apiUrl}/complaints`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => {
                setRows(response?.data?.data || []);
                setPagination((prev) => ({
                    ...prev,
                    ...(response?.data?.meta || {}),
                }));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan data catatan OP.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const handleExport = async () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        setIsExporting(true);
        try {
            const response = await axios.get(`${apiUrl}/complaints/export/xlsx`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params,
                responseType: 'blob',
            });
            const disposition = response?.headers?.['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `aduan-op-${formatMalaysiaDateTimeStamp()}.xlsx`;
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Catatan Status Semasa Aduan OP</h2>
                    <p>Senarai rekod aduan OP yang memaparkan status semasa dan catatan operasi terkini.</p>
                </div>
                <Link className="app-button app-button-ghost" to="/app/complaints/report">
                    Kembali Dashboard
                </Link>
            </div>

            <div className="app-card">
                <div className="app-tab-panel">
                    <div className="app-form-grid">
                        <label className="app-form-field">
                            <span>Daerah</span>
                            <select value={filters.district} onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}>
                                <option value="">Semua</option>
                                {districtOptions.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="app-form-field">
                            <span>Dari Tarikh Aduan</span>
                            <input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
                        </label>
                        <label className="app-form-field">
                            <span>Hingga Tarikh Aduan</span>
                            <input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
                        </label>
                        <div className="app-form-actions app-span-full">
                            <button
                                type="button"
                                className="app-button app-button-ghost"
                                onClick={() => {
                                    setFilters({ district: '', fromDate: '', toDate: '' });
                                    setPagination((prev) => ({ ...prev, current_page: 1 }));
                                }}
                                >
                                    Reset
                                </button>
                            <button
                                type="button"
                                className="app-button app-button-ghost"
                                onClick={handleExport}
                                disabled={isExporting}
                            >
                                {isExporting ? 'Sedang Export...' : 'Export Excel'}
                            </button>
                            <button
                                type="button"
                                className="app-button"
                                onClick={loadRows}
                            >
                                Refresh
                            </button>
                        </div>
                    </div>

                    {error && <div className="app-empty">{error}</div>}
                    {isLoading && <div className="app-empty">Memuatkan catatan OP...</div>}

                    {!isLoading && !error && (
                        <div style={{ marginTop: '1rem' }}>
                            <div className="app-report-kpis" style={{ marginBottom: '1rem' }}>
                                <div className="app-report-kpi">
                                    <span>Jumlah Rekod</span>
                                    <strong>{pagination.total || 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Klasifikasi</span>
                                    <strong>OP</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Kategori</span>
                                    <strong>AJ</strong>
                                </div>
                            </div>

                            <div className="app-inline-table app-inline-clean">
                                <div className="app-inline-table-header" style={{ gridTemplateColumns: '0.45fr 1fr 1fr 1fr 1.2fr 1fr' }}>
                                    <span>Bil</span>
                                    <span>No Aduan</span>
                                    <span>Daerah</span>
                                    <span>Status Terkini</span>
                                    <span>Catatan OP</span>
                                    <span>Dikemas Kini</span>
                                </div>
                                {rows.length ? rows.map((row, index) => (
                                    <div
                                        key={row.id}
                                        className="app-inline-table-row"
                                        style={{ gridTemplateColumns: '0.45fr 1fr 1fr 1fr 1.2fr 1fr' }}
                                    >
                                        <span>{((pagination.current_page - 1) * pagination.per_page) + index + 1}</span>
                                        <span>{row.reference_no || '-'}</span>
                                        <span>{row.district_name || '-'}</span>
                                        <span>{row.aj_current_status || '-'}</span>
                                        <span>{row.aj_op_notes || '-'}</span>
                                        <span>{formatDateTime(row.updated_at)}</span>
                                    </div>
                                )) : (
                                    <div className="app-empty">Tiada catatan OP untuk filter semasa.</div>
                                )}
                            </div>

                            <div style={{ marginTop: '1rem' }}>
                                <PaginationBar
                                    page={pagination.current_page}
                                    lastPage={pagination.last_page}
                                    total={pagination.total}
                                    perPage={pagination.per_page}
                                    startIndex={pagination.total ? ((pagination.current_page - 1) * pagination.per_page) + 1 : 0}
                                    endIndex={pagination.total ? Math.min(pagination.current_page * pagination.per_page, pagination.total) : 0}
                                    onPageChange={(page) => setPagination((prev) => ({ ...prev, current_page: page }))}
                                    onPerPageChange={(perPage) => setPagination((prev) => ({ ...prev, per_page: perPage, current_page: 1 }))}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintOpNotesReport;
