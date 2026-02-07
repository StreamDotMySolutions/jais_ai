import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

const STATUS_LABELS = {
    draf: 'Draf',
    berjaya: 'Berjaya',
    tidak_berjaya: 'Tidak Berjaya',
    dalam_proses: 'Dalam Proses',
    kembalian: 'Kembalian',
};

const JENIS_LABELS = {
    tangkap: 'Waran Tangkap',
    geledah: 'Waran Geledah',
};

const downloadBlob = (blob, filename) => {
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename || 'export.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(blobUrl), 5000);
};

const TrendChart = ({ series }) => {
    const points = (series || []).map((row) => ({
        x: String(row.date || ''),
        y: Number(row.total || 0),
    })).filter((p) => p.x);

    if (points.length < 2) {
        return <div className="app-empty">Tiada data trend.</div>;
    }

    const width = 720;
    const height = 160;
    const padX = 10;
    const padY = 12;
    const maxY = Math.max(1, ...points.map((p) => p.y));

    const toX = (i) => {
        const n = points.length - 1;
        if (n <= 0) return padX;
        const usable = width - (padX * 2);
        return padX + (i / n) * usable;
    };
    const toY = (y) => {
        const usable = height - (padY * 2);
        return height - padY - (y / maxY) * usable;
    };

    const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(i).toFixed(2)} ${toY(p.y).toFixed(2)}`).join(' ');

    const last = points[points.length - 1];
    const first = points[0];

    return (
        <div className="app-trend">
            <div className="app-trend-meta">
                <div>
                    <span>Tempoh</span>
                    <strong>{first.x} hingga {last.x}</strong>
                </div>
                <div>
                    <span>Maks</span>
                    <strong>{maxY}</strong>
                </div>
            </div>
            <svg
                className="app-trend-svg"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
                role="img"
                aria-label="Trend i-WARAN"
            >
                <path className="app-trend-area" d={`${d} L ${toX(points.length - 1)} ${height - padY} L ${toX(0)} ${height - padY} Z`} />
                <path className="app-trend-line" d={d} />
                <circle className="app-trend-dot" cx={toX(points.length - 1)} cy={toY(last.y)} r="4" />
            </svg>
        </div>
    );
};

const WaranReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [summary, setSummary] = useState(null);

    const [districtOptions, setDistrictOptions] = useState([]);
    const [filters, setFilters] = useState({
        status: '',
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

    const loadSummary = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');

        axios.get(`${apiUrl}/i-waran/report/summary`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => setSummary(response?.data?.data || null))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan laporan.'))
            .finally(() => setIsLoading(false));
    };

    const exportReportCsv = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }
        axios.get(`${apiUrl}/i-waran/report/export/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'text/csv' });
                downloadBlob(blob, `i-waran-report-${new Date().toISOString().slice(0, 10)}.csv`);
            })
            .catch(() => setError('Gagal export laporan CSV.'));
    };

    const exportReportXlsx = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }
        axios.get(`${apiUrl}/i-waran/report/export/xlsx`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                downloadBlob(blob, `i-waran-report-${new Date().toISOString().slice(0, 10)}.xlsx`);
            })
            .catch(() => setError('Gagal export laporan Excel.'));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, filters.status, filters.district, filters.fromDate, filters.toDate]);

    const byStatusMap = useMemo(() => {
        const map = {};
        (summary?.by_status || []).forEach((row) => {
            if (!row?.status) return;
            map[String(row.status)] = Number(row.total || 0);
        });
        return map;
    }, [summary]);

    const byJenisMap = useMemo(() => {
        const map = {};
        (summary?.by_jenis_waran || []).forEach((row) => {
            if (!row?.jenis_waran) return;
            map[String(row.jenis_waran)] = Number(row.total || 0);
        });
        return map;
    }, [summary]);

    const statusCards = [
        { key: 'draf', label: 'Draf' },
        { key: 'dalam_proses', label: 'Dalam Proses' },
        { key: 'berjaya', label: 'Berjaya' },
        { key: 'tidak_berjaya', label: 'Tidak Berjaya' },
        { key: 'kembalian', label: 'Kembalian' },
    ];

    const topDistricts = useMemo(() => {
        const list = summary?.by_district || [];
        return list.slice(0, 12);
    }, [summary]);

    const maxDistrict = useMemo(() => {
        const totals = (summary?.by_district || []).map((r) => Number(r.total || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    const dateSeries = useMemo(() => {
        const list = summary?.by_date || [];
        return list.slice(-30); // show latest 30 days
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Laporan i-WARAN</h2>
                    <p>Ringkasan mengikut status, daerah, dan tarikh terima.</p>
                </div>
            </div>

            <div className="app-card">
                <div className="app-tab-panel">
                    <div className="app-form-grid">
                        <label className="app-form-field">
                            <span>Status</span>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value }))}
                            >
                                <option value="">Semua</option>
                                {Object.keys(STATUS_LABELS).map((key) => (
                                    <option key={key} value={key}>{STATUS_LABELS[key]}</option>
                                ))}
                            </select>
                        </label>
                        <label className="app-form-field">
                            <span>Daerah</span>
                            <select
                                value={filters.district}
                                onChange={(e) => setFilters((prev) => ({ ...prev, district: e.target.value }))}
                            >
                                <option value="">Semua</option>
                                {districtOptions.map((d) => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </label>
                        <label className="app-form-field">
                            <span>Dari Tarikh</span>
                            <input
                                type="date"
                                value={filters.fromDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))}
                            />
                        </label>
                        <label className="app-form-field">
                            <span>Hingga Tarikh</span>
                            <input
                                type="date"
                                value={filters.toDate}
                                onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))}
                            />
                        </label>
                        <div className="app-form-actions app-span-full">
                            <button
                                type="button"
                                className="app-button app-button-ghost"
                                onClick={() => setFilters({ status: '', district: '', fromDate: '', toDate: '' })}
                            >
                                Reset
                            </button>
                            <button type="button" className="app-button app-button-ghost" onClick={exportReportCsv}>
                                <i className="bi bi-download"></i>
                                Export CSV
                            </button>
                            <button type="button" className="app-button app-button-ghost" onClick={exportReportXlsx}>
                                <i className="bi bi-file-earmark-spreadsheet"></i>
                                Export Excel
                            </button>
                            <button type="button" className="app-button" onClick={loadSummary}>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {isLoading && <div className="app-empty">Memuatkan laporan...</div>}
                    {!isLoading && error && <div className="app-empty">{error}</div>}

                    {!isLoading && !error && summary && (
                        <div className="app-report">
                            <div className="app-report-kpis">
                                <div className="app-report-kpi">
                                    <span className="app-waran-label">Jumlah</span>
                                    <strong>{summary.total ?? 0}</strong>
                                </div>
                                {statusCards.map((c) => (
                                    <div key={c.key} className="app-report-kpi">
                                        <span className="app-waran-label">{c.label}</span>
                                        <strong>{byStatusMap[c.key] ?? 0}</strong>
                                    </div>
                                ))}
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Trend (30 hari terakhir)</h4>
                                    <TrendChart series={dateSeries} />
                                    <div className="app-detail-note" style={{ marginTop: '0.75rem' }}>
                                        Nota: trend dikira berdasarkan `tarikh_masa_terima`.
                                    </div>
                                </div>

                                <div className="app-report-card">
                                    <h4>Ikut Jenis Waran</h4>
                                    <div className="app-report-kpis" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                                        {Object.keys(JENIS_LABELS).map((key) => (
                                            <div key={key} className="app-report-kpi">
                                                <span className="app-waran-label">{JENIS_LABELS[key]}</span>
                                                <strong>{byJenisMap[key] ?? 0}</strong>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="app-detail-note" style={{ marginTop: '0.75rem' }}>
                                        Tangkap/Geledah diambil daripada field `jenis_waran`.
                                    </div>
                                </div>
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Ikut Daerah</h4>
                                    {topDistricts.length ? (
                                        <div className="app-report-bars">
                                            {topDistricts.map((row) => (
                                                <div key={row.district_id || row.district_name} className="app-report-bar-row">
                                                    <div className="app-report-bar-label">{row.district_name || 'Tidak diketahui'}</div>
                                                    <div className="app-report-bar-track">
                                                        <div
                                                            className="app-report-bar-fill"
                                                            style={{ width: `${Math.round((Number(row.total || 0) / maxDistrict) * 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <div className="app-report-bar-value">{row.total ?? 0}</div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data.</div>
                                    )}
                                </div>

                                <div className="app-report-card">
                                    <h4>Trend (senarai)</h4>
                                    {dateSeries.length ? (
                                        <div className="app-inline-table app-inline-clean">
                                            <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.5fr' }}>
                                                <span>Tarikh</span>
                                                <span style={{ textAlign: 'right' }}>Jumlah</span>
                                            </div>
                                            {dateSeries.slice(-14).map((row) => (
                                                <div
                                                    key={row.date}
                                                    className="app-inline-table-row"
                                                    style={{ gridTemplateColumns: '1fr 0.5fr' }}
                                                >
                                                    <span>{row.date}</span>
                                                    <span style={{ textAlign: 'right' }}>{row.total ?? 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data trend.</div>
                                    )}
                                    <div className="app-detail-note" style={{ marginTop: '0.75rem' }}>Paparan table: 14 hari terakhir.</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WaranReport;
