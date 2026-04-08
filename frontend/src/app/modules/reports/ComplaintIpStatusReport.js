import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ComplaintIpStatusReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, status_rows: [], district_rows: [] });
    const [filters, setFilters] = useState({
        district: '',
        caseType: '',
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
        ...(filters.district ? { district_id: filters.district } : {}),
        ...(filters.caseType ? { case_type: filters.caseType } : {}),
        ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
        ...(filters.toDate ? { to_date: filters.toDate } : {}),
    }), [filters]);

    const loadSummary = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        axios.get(`${apiUrl}/complaints/report/ip-status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, status_rows: [], district_rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan statistik status IP.'))
            .finally(() => setIsLoading(false));
    };

    const handleExport = async () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        setIsExporting(true);
        try {
            const response = await axios.get(`${apiUrl}/complaints/report/ip-status/export/xlsx`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params,
                responseType: 'blob',
            });
            const disposition = response?.headers?.['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `aduan-ip-status-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
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

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const maxTotal = useMemo(() => {
        const totals = (summary?.status_rows || []).map((row) => Number(row.total || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Statistik Status IP</h2>
                    <p>Ringkasan bilangan rekod mengikut status IP semasa untuk AJ dan AK.</p>
                </div>
                <Link className="app-button app-button-ghost" to="/app/complaints/report">
                    Kembali Dashboard
                </Link>
            </div>

            <div className="app-card">
                <div className="app-tab-panel">
                    <div className="app-form-grid">
                        <label className="app-form-field">
                            <span>Kategori Aduan</span>
                            <select value={filters.caseType} onChange={(e) => setFilters((prev) => ({ ...prev, caseType: e.target.value }))}>
                                <option value="">Semua</option>
                                <option value="AJ">AJ</option>
                                <option value="AK">AK</option>
                            </select>
                        </label>
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
                                onClick={() => setFilters({ district: '', caseType: '', fromDate: '', toDate: '' })}
                            >
                                Reset
                            </button>
                            <button type="button" className="app-button app-button-ghost" onClick={handleExport} disabled={isExporting}>
                                {isExporting ? 'Sedang Export...' : 'Export Excel'}
                            </button>
                            <button type="button" className="app-button" onClick={loadSummary}>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {error && <div className="app-empty">{error}</div>}
                    {isLoading && <div className="app-empty">Memuatkan statistik...</div>}

                    {!isLoading && !error && (
                        <div className="app-report" style={{ marginTop: '1rem' }}>
                            <div className="app-report-kpis">
                                <div className="app-report-kpi">
                                    <span>Jumlah Rekod</span>
                                    <strong>{summary?.totals?.records ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Bil Status IP</span>
                                    <strong>{summary?.totals?.statuses ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah AJ</span>
                                    <strong>{summary?.totals?.aj ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah AK</span>
                                    <strong>{summary?.totals?.ak ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Status IP Semasa</h4>
                                    {(summary?.status_rows || []).length ? (
                                        <div className="app-report-bars">
                                            {summary.status_rows.map((row) => {
                                                const total = Number(row.total || 0);
                                                const width = `${(total / maxTotal) * 100}%`;

                                                return (
                                                    <div key={row.ip_status} className="app-report-bar-row" style={{ alignItems: 'flex-start' }}>
                                                        <div className="app-report-bar-label">{row.ip_status || 'Tidak diketahui'}</div>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="app-report-bar-track">
                                                                <div className="app-report-bar-fill" style={{ width }}></div>
                                                            </div>
                                                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                                                <span style={{ color: '#1d4ed8' }}>AJ: {row.aj_total || 0}</span>
                                                                <span style={{ color: '#db2777' }}>AK: {row.ak_total || 0}</span>
                                                            </div>
                                                        </div>
                                                        <div className="app-report-bar-value">{total}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data status IP untuk filter semasa.</div>
                                    )}
                                </div>

                                <div className="app-report-card">
                                    <h4>Top Daerah</h4>
                                    {(summary?.district_rows || []).length ? (
                                        <div className="app-inline-table app-inline-clean">
                                            <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                <span>Daerah</span>
                                                <span>Jumlah</span>
                                            </div>
                                            {summary.district_rows.map((row) => (
                                                <div key={`district-${row.district_id || row.district_name}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                    <span>{row.district_name || 'Tidak diketahui'}</span>
                                                    <span>{row.total || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data daerah untuk dipaparkan.</div>
                                    )}
                                </div>
                            </div>

                            <div className="app-report-card">
                                <h4>Jadual Ringkasan Status IP</h4>
                                {(summary?.status_rows || []).length ? (
                                    <div className="app-inline-table app-inline-clean">
                                        <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.35fr 0.35fr 0.35fr' }}>
                                            <span>Status IP</span>
                                            <span>AJ</span>
                                            <span>AK</span>
                                            <span>Jumlah</span>
                                        </div>
                                        {summary.status_rows.map((row) => (
                                            <div key={`table-${row.ip_status}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1fr 0.35fr 0.35fr 0.35fr' }}>
                                                <span>{row.ip_status || 'Tidak diketahui'}</span>
                                                <span>{row.aj_total || 0}</span>
                                                <span>{row.ak_total || 0}</span>
                                                <span>{row.total || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="app-empty">Tiada data untuk dipaparkan.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintIpStatusReport;
