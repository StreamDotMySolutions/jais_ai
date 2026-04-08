import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ComplaintArrestByOffenseReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, rows: [] });
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
        ...(filters.district ? { district_id: filters.district } : {}),
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
        axios.get(`${apiUrl}/complaints/report/arrest-by-offense`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan rekod tangkapan mengikut kesalahan.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const maxTotal = useMemo(() => {
        const totals = (summary?.rows || []).map((row) => Number(row.total_male || 0) + Number(row.total_female || 0) + Number(row.total_other || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Rekod Tangkapan Mengikut Kesalahan</h2>
                    <p>Ringkasan jumlah tangkapan AJ berdasarkan kesalahan dalam laporan pemeriksaan.</p>
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
                            <span>Dari Tarikh / Masa Tindakan</span>
                            <input type="date" value={filters.fromDate} onChange={(e) => setFilters((prev) => ({ ...prev, fromDate: e.target.value }))} />
                        </label>
                        <label className="app-form-field">
                            <span>Hingga Tarikh / Masa Tindakan</span>
                            <input type="date" value={filters.toDate} onChange={(e) => setFilters((prev) => ({ ...prev, toDate: e.target.value }))} />
                        </label>
                        <div className="app-form-actions app-span-full">
                            <button type="button" className="app-button app-button-ghost" onClick={() => setFilters({ district: '', fromDate: '', toDate: '' })}>
                                Reset
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
                                    <span>Jumlah Lelaki</span>
                                    <strong>{summary?.totals?.male ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah Perempuan</span>
                                    <strong>{summary?.totals?.female ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah Lain-lain</span>
                                    <strong>{summary?.totals?.other ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Rekod Laporan</span>
                                    <strong>{summary?.totals?.records ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-card">
                                <h4>Top Kesalahan</h4>
                                {(summary?.rows || []).length ? (
                                    <div className="app-report-bars">
                                        {summary.rows.slice(0, 12).map((row) => {
                                            const male = Number(row.total_male || 0);
                                            const female = Number(row.total_female || 0);
                                            const other = Number(row.total_other || 0);
                                            const total = male + female + other;
                                            const width = `${(total / maxTotal) * 100}%`;

                                            return (
                                                <div key={row.offense_id || row.offense_label} className="app-report-bar-row" style={{ alignItems: 'flex-start' }}>
                                                    <div className="app-report-bar-label">{row.offense_label || 'Tidak diketahui'}</div>
                                                    <div style={{ flex: 1 }}>
                                                        <div className="app-report-bar-track">
                                                            <div className="app-report-bar-fill" style={{ width }}></div>
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap', fontSize: '0.85rem' }}>
                                                            <span style={{ color: '#1d4ed8' }}>Lelaki: {male}</span>
                                                            <span style={{ color: '#db2777' }}>Perempuan: {female}</span>
                                                            <span style={{ color: '#0f766e' }}>Lain-lain: {other}</span>
                                                        </div>
                                                    </div>
                                                    <div className="app-report-bar-value">{total}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="app-empty">Tiada data tangkapan untuk filter semasa.</div>
                                )}
                            </div>

                            <div className="app-report-card">
                                <h4>Jadual Ringkasan Kesalahan</h4>
                                {(summary?.rows || []).length ? (
                                    <div className="app-inline-table app-inline-clean">
                                        <div className="app-inline-table-header" style={{ gridTemplateColumns: '1.6fr 0.35fr 0.35fr 0.35fr 0.35fr 0.35fr' }}>
                                            <span>Kesalahan</span>
                                            <span>Lelaki</span>
                                            <span>Perempuan</span>
                                            <span>Lain-lain</span>
                                            <span>Total</span>
                                            <span>Rekod</span>
                                        </div>
                                        {summary.rows.map((row) => {
                                            const total = Number(row.total_male || 0) + Number(row.total_female || 0) + Number(row.total_other || 0);
                                            return (
                                                <div key={`table-${row.offense_id || row.offense_label}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1.6fr 0.35fr 0.35fr 0.35fr 0.35fr 0.35fr' }}>
                                                    <span>{row.offense_label || 'Tidak diketahui'}</span>
                                                    <span>{row.total_male || 0}</span>
                                                    <span>{row.total_female || 0}</span>
                                                    <span>{row.total_other || 0}</span>
                                                    <span>{total}</span>
                                                    <span>{row.total_records || 0}</span>
                                                </div>
                                            );
                                        })}
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

export default ComplaintArrestByOffenseReport;
