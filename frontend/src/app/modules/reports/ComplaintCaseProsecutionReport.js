import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ComplaintCaseProsecutionReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [statusOptions, setStatusOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, status_rows: [], district_rows: [], mahkamah_rows: [] });
    const [filters, setFilters] = useState({
        district: '',
        prosecutionStatus: '',
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
        ...(filters.prosecutionStatus ? { prosecution_status: filters.prosecutionStatus } : {}),
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
        axios.get(`${apiUrl}/complaints/report/case-prosecution`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => {
                const data = response?.data?.data || { totals: {}, status_rows: [], district_rows: [], mahkamah_rows: [] };
                setSummary(data);
                setStatusOptions((data.status_rows || []).map((row) => row.prosecution_status).filter(Boolean));
            })
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan statistik KES dan pendakwaan.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const maxStatusTotal = useMemo(() => {
        const totals = (summary?.status_rows || []).map((row) => Number(row.total || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Statistik KES & Pendakwaan</h2>
                    <p>Ringkasan kes AJ yang sudah masuk KES atau mempunyai status pendakwaan.</p>
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
                            <span>Status Pendakwaan</span>
                            <select value={filters.prosecutionStatus} onChange={(e) => setFilters((prev) => ({ ...prev, prosecutionStatus: e.target.value }))}>
                                <option value="">Semua</option>
                                {statusOptions.map((option) => (
                                    <option key={option} value={option}>{option}</option>
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
                                onClick={() => setFilters({ district: '', prosecutionStatus: '', fromDate: '', toDate: '' })}
                            >
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
                                    <span>Jumlah Rekod</span>
                                    <strong>{summary?.totals?.records ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Jumlah KES</span>
                                    <strong>{summary?.totals?.cases ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>No. Daftar Kes Direkod</span>
                                    <strong>{summary?.totals?.registered_cases ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Status Pendakwaan Direkod</span>
                                    <strong>{summary?.totals?.with_prosecution_status ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Mahkamah Direkod</span>
                                    <strong>{summary?.totals?.with_mahkamah ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Status Pendakwaan</h4>
                                    {(summary?.status_rows || []).length ? (
                                        <div className="app-report-bars">
                                            {summary.status_rows.map((row) => {
                                                const width = `${(Number(row.total || 0) / maxStatusTotal) * 100}%`;

                                                return (
                                                    <div key={row.prosecution_status} className="app-report-bar-row" style={{ alignItems: 'flex-start' }}>
                                                        <div className="app-report-bar-label">{row.prosecution_status || 'Tidak diketahui'}</div>
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
                                        <div className="app-empty">Tiada data status pendakwaan untuk filter semasa.</div>
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
                                <h4>Ringkasan Mahkamah</h4>
                                {(summary?.mahkamah_rows || []).length ? (
                                    <div className="app-inline-table app-inline-clean">
                                        <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                            <span>Mahkamah</span>
                                            <span>Jumlah</span>
                                        </div>
                                        {summary.mahkamah_rows.map((row) => (
                                            <div key={`mahkamah-${row.mahkamah_name}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                <span>{row.mahkamah_name || 'Tidak diketahui'}</span>
                                                <span>{row.total || 0}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="app-empty">Tiada data mahkamah untuk dipaparkan.</div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintCaseProsecutionReport;
