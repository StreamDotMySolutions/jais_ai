import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const ComplaintCourtsProsecutorsReport = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [summary, setSummary] = useState({ totals: {}, mahkamah_rows: [], prosecutor_rows: [], district_rows: [] });
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
        axios.get(`${apiUrl}/complaints/report/courts-prosecutors`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, mahkamah_rows: [], prosecutor_rows: [], district_rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan statistik mahkamah dan pendakwa.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Statistik Mahkamah & Pendakwa</h2>
                    <p>Ringkasan mahkamah dan pendakwa yang direkodkan dalam pendakwaan AJ.</p>
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
                                    <span>Jumlah Rekod</span>
                                    <strong>{summary?.totals?.records ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Mahkamah Direkod</span>
                                    <strong>{summary?.totals?.with_mahkamah ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Pendakwa Direkod</span>
                                    <strong>{summary?.totals?.with_prosecutor ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Bil Mahkamah</span>
                                    <strong>{summary?.totals?.mahkamah_count ?? 0}</strong>
                                </div>
                                <div className="app-report-kpi">
                                    <span>Bil Pendakwa</span>
                                    <strong>{summary?.totals?.prosecutor_count ?? 0}</strong>
                                </div>
                            </div>

                            <div className="app-report-grid">
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

                                <div className="app-report-card">
                                    <h4>Ringkasan Pendakwa</h4>
                                    {(summary?.prosecutor_rows || []).length ? (
                                        <div className="app-inline-table app-inline-clean">
                                            <div className="app-inline-table-header" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                <span>Pendakwa</span>
                                                <span>Jumlah</span>
                                            </div>
                                            {summary.prosecutor_rows.map((row) => (
                                                <div key={`prosecutor-${row.prosecutor_name}`} className="app-inline-table-row" style={{ gridTemplateColumns: '1fr 0.35fr' }}>
                                                    <span>{row.prosecutor_name || 'Tidak diketahui'}</span>
                                                    <span>{row.total || 0}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="app-empty">Tiada data pendakwa untuk dipaparkan.</div>
                                    )}
                                </div>
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
                    )}
                </div>
            </div>
        </div>
    );
};

export default ComplaintCourtsProsecutorsReport;
