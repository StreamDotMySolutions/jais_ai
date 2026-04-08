import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ARREST_BY_OPTIONS = ['Pegawai Penguatkuasa Agama', 'Pegawai Masjid', 'Pegawai Polis', 'Orang Awam'];

const ComplaintArrestorsReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, type_rows: [], rows: [] });
    const [filters, setFilters] = useState({
        district: '',
        arrestBy: '',
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
        ...(filters.arrestBy ? { arrest_by: filters.arrestBy } : {}),
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
        axios.get(`${apiUrl}/complaints/report/arrestors`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, type_rows: [], rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan senarai penangkap.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const maxTotal = useMemo(() => {
        const totals = (summary?.type_rows || []).map((row) => Number(row.total_male || 0) + Number(row.total_female || 0) + Number(row.total_other || 0));
        return Math.max(1, ...totals);
    }, [summary]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Senarai Penangkap</h2>
                    <p>Ringkasan jenis penangkap dan pegawai penangkap bagi laporan pemeriksaan AJ.</p>
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
                            <span>Tangkapan Oleh</span>
                            <select value={filters.arrestBy} onChange={(e) => setFilters((prev) => ({ ...prev, arrestBy: e.target.value }))}>
                                <option value="">Semua</option>
                                {ARREST_BY_OPTIONS.map((option) => (
                                    <option key={option} value={option}>{option}</option>
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
                            <button
                                type="button"
                                className="app-button app-button-ghost"
                                onClick={() => setFilters({ district: '', arrestBy: '', fromDate: '', toDate: '' })}
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
                                <div className="app-report-kpi">
                                    <span>Bil Penangkap</span>
                                    <strong>{summary?.totals?.arrestors ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-grid">
                                <div className="app-report-card">
                                    <h4>Jenis Penangkap</h4>
                                    {(summary?.type_rows || []).length ? (
                                        <div className="app-report-bars">
                                            {summary.type_rows.map((row) => {
                                                const male = Number(row.total_male || 0);
                                                const female = Number(row.total_female || 0);
                                                const other = Number(row.total_other || 0);
                                                const total = male + female + other;
                                                const width = `${(total / maxTotal) * 100}%`;

                                                return (
                                                    <div key={row.arrest_by} className="app-report-bar-row" style={{ alignItems: 'flex-start' }}>
                                                        <div className="app-report-bar-label">{row.arrest_by || 'Tidak diketahui'}</div>
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
                                        <div className="app-empty">Tiada data penangkap untuk filter semasa.</div>
                                    )}
                                </div>

                                <div className="app-report-card">
                                    <h4>Senarai Pegawai Penangkap</h4>
                                    {(summary?.rows || []).length ? (
                                        <div className="app-inline-table app-inline-clean">
                                            <div className="app-inline-table-header" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.55fr 0.35fr' }}>
                                                <span>Penangkap</span>
                                                <span>Daerah</span>
                                                <span>Total</span>
                                                <span>Rekod</span>
                                            </div>
                                            {summary.rows.map((row) => {
                                                const total = Number(row.total_male || 0) + Number(row.total_female || 0) + Number(row.total_other || 0);
                                                return (
                                                    <div key={`${row.aj_arrest_by}-${row.aj_arrest_staff_id || row.district_id || row.arrestor_label}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1.2fr 0.8fr 0.55fr 0.35fr' }}>
                                                        <span>{row.arrestor_label || 'Tidak diketahui'}</span>
                                                        <span>{row.district_name || 'Tidak diketahui'}</span>
                                                        <span>{total}</span>
                                                        <span>{row.total_records || 0}</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada senarai penangkap untuk dipaparkan.</div>
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

export default ComplaintArrestorsReport;
