import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ComplaintSeizureItemsReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, district_rows: [], storage_rows: [] });
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
        axios.get(`${apiUrl}/complaints/report/seizure-items`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, district_rows: [], storage_rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan statistik barang kes.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const maxStorageTotal = useMemo(() => {
        const totals = (summary?.storage_rows || []).map((row) => Number(row.total || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Statistik Barang Kes / Sitaan</h2>
                    <p>Ringkasan barang kes yang direkodkan mengikut daerah dan stor simpanan.</p>
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
                                    <span>Jumlah Barang Kes</span>
                                    <strong>{summary?.totals?.items ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah Aduan</span>
                                    <strong>{summary?.totals?.complaints ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>No. Barang Direkod</span>
                                    <strong>{summary?.totals?.with_item_no ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Stor Direkod</span>
                                    <strong>{summary?.totals?.with_storage ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Stor Simpanan</h4>
                                    {(summary?.storage_rows || []).length ? (
                                        <div className="app-report-bars">
                                            {summary.storage_rows.map((row) => {
                                                const width = `${(Number(row.total || 0) / maxStorageTotal) * 100}%`;

                                                return (
                                                    <div key={row.storage_name} className="app-report-bar-row" style={{ alignItems: 'flex-start' }}>
                                                        <div className="app-report-bar-label">{row.storage_name || 'Tidak diketahui'}</div>
                                                        <div style={{ flex: 1 }}>
                                                            <div className="app-report-bar-track">
                                                                <div className="app-report-bar-fill" style={{ width }}></div>
                                                            </div>
                                                        </div>
                                                        <div className="app-report-bar-value">{row.total || 0}</div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data barang kes untuk filter semasa.</div>
                                    )}
                                </div>

                                <div className="app-report-card">
                                    <h4>Jadual Ringkasan Daerah</h4>
                                    {(summary?.district_rows || []).length ? (
                                        <div className="app-inline-table app-inline-clean">
                                            <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                <span>Daerah</span>
                                                <span>Jumlah Barang</span>
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
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintSeizureItemsReport;
