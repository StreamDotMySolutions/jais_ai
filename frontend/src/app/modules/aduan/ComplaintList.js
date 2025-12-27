import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ComplaintForm from './ComplaintForm';

const ComplaintList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [complaints, setComplaints] = useState([]);
    const [quickQuery, setQuickQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const role = localStorage.getItem('role') || 'awam';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [filters, setFilters] = useState({
        keyword: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        keyword: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
    });
    const [showFilters, setShowFilters] = useState(true);

    const fetchComplaints = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        const endpoint = role === 'awam' ? `${apiUrl}/complaints/my` : `${apiUrl}/complaints`;

        axios.get(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const data = response?.data?.data || [];
                setComplaints(data);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || err?.message || 'Gagal mendapatkan aduan.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    useEffect(() => {
        fetchComplaints();
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        axios.get(`${apiUrl}/districts`)
            .then((response) => {
                const data = response?.data?.data || [];
                setDistrictOptions(data);
            })
            .catch(() => {
                setDistrictOptions([]);
            });
    }, [apiUrl]);

    const statusOptions = [
        { value: '', label: 'Semua' },
        { value: 'baru', label: 'Baharu' },
        { value: 'dalam_tindakan', label: 'Dalam Tindakan' },
        { value: 'kiv', label: 'KIV' },
        { value: 'selesai', label: 'Selesai' },
    ];

    const handleSearch = (event) => {
        event.preventDefault();
        setFilters(draftFilters);
    };

    const handleReset = () => {
        const empty = {
            keyword: '',
            status: '',
            district: '',
            fromDate: '',
            toDate: '',
        };
        setDraftFilters(empty);
        setFilters(empty);
        setQuickQuery('');
    };

    const matchesDateRange = (dateValue, fromDate, toDate) => {
        if (!dateValue) {
            return false;
        }
        const date = new Date(dateValue);
        if (fromDate && date < new Date(fromDate)) {
            return false;
        }
        if (toDate && date > new Date(toDate)) {
            return false;
        }
        return true;
    };

    const filtered = useMemo(() => {
        let items = complaints;

        if (filters.keyword) {
            const term = filters.keyword.toLowerCase();
            items = items.filter((item) => {
                const ref = item.reference_no || '';
                const name = item.complainant_name || '';
                const district = item.district_name || '';
                const summary = item.summary || '';
                return (
                    ref.toLowerCase().includes(term) ||
                    name.toLowerCase().includes(term) ||
                    district.toLowerCase().includes(term) ||
                    summary.toLowerCase().includes(term)
                );
            });
        }

        if (filters.status) {
            items = items.filter((item) => (item.current_stage || '').toLowerCase() === filters.status);
        }

        if (filters.district) {
            items = items.filter((item) => item.district_id === Number(filters.district));
        }

        if (filters.fromDate || filters.toDate) {
            items = items.filter((item) => matchesDateRange(item.complaint_date, filters.fromDate, filters.toDate));
        }

        if (!quickQuery) {
            return items;
        }
        const term = quickQuery.toLowerCase();
        return items.filter((item) => {
            const ref = item.reference_no || '';
            const name = item.complainant_name || '';
            const district = item.district_name || '';
            const summary = item.summary || '';
            return (
                ref.toLowerCase().includes(term) ||
                name.toLowerCase().includes(term) ||
                district.toLowerCase().includes(term) ||
                summary.toLowerCase().includes(term)
            );
        });
    }, [complaints, filters, quickQuery]);

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <h3>Senarai Aduan</h3>
                    <p>Semak dan urus aduan yang diterima.</p>
                </div>
                <div className="app-complaints-actions">
                    {(role === 'awam' || role === 'pegawai' || role === 'admin' || role === 'system') && (
                        <button className="app-button" type="button" onClick={() => setIsFormOpen(true)}>
                            <i className="bi bi-plus-lg"></i>
                            Tambah Aduan
                        </button>
                    )}
                    <button
                        className="app-button app-button-ghost"
                        type="button"
                        onClick={() => setShowFilters((prev) => !prev)}
                    >
                        <i className={`bi ${showFilters ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                        {showFilters ? 'Sembunyi Filter' : 'Tunjuk Filter'}
                    </button>
                    <div className="app-search">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Cari no aduan, pengadu, daerah..."
                            value={quickQuery}
                            onChange={(event) => setQuickQuery(event.target.value)}
                        />
                    </div>
                </div>
            </div>

            {showFilters && (
                <form className="app-filter" onSubmit={handleSearch}>
                    <div className="app-filter-row">
                        <div className="app-filter-field">
                            <label>Keyword</label>
                            <input
                                type="text"
                                placeholder="Nama, no aduan, daerah..."
                                value={draftFilters.keyword}
                                onChange={(event) => setDraftFilters({ ...draftFilters, keyword: event.target.value })}
                            />
                        </div>
                        <div className="app-filter-field">
                            <label>Status</label>
                            <select
                                value={draftFilters.status}
                                onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}
                            >
                                {statusOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div className="app-filter-field">
                            <label>Daerah</label>
                            <select
                                value={draftFilters.district}
                                onChange={(event) => setDraftFilters({ ...draftFilters, district: event.target.value })}
                            >
                                <option value="">Semua</option>
                                {districtOptions.map((district) => (
                                    <option key={district.id} value={district.id}>
                                        {district.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="app-filter-row">
                        <div className="app-filter-field">
                            <label>Dari Tarikh</label>
                            <input
                                type="date"
                                value={draftFilters.fromDate}
                                onChange={(event) => setDraftFilters({ ...draftFilters, fromDate: event.target.value })}
                            />
                        </div>
                        <div className="app-filter-field">
                            <label>Hingga Tarikh</label>
                            <input
                                type="date"
                                value={draftFilters.toDate}
                                onChange={(event) => setDraftFilters({ ...draftFilters, toDate: event.target.value })}
                            />
                        </div>
                        <div className="app-filter-actions">
                            <button className="app-button" type="submit">Search</button>
                            <button className="app-button app-button-ghost" type="button" onClick={handleReset}>
                                Reset
                            </button>
                        </div>
                    </div>
                </form>
            )}

            <div className="app-card app-complaints-card">
                {isLoading && <div className="app-empty">Memuatkan aduan...</div>}
                {error && !isLoading && <div className="app-empty">{error}</div>}
                {!isLoading && !error && filtered.length === 0 && (
                    <div className="app-empty">Tiada aduan ditemui.</div>
                )}
                {!isLoading && !error && filtered.length > 0 && (
                    <div className="app-table">
                        <div className="app-table-header">
                            <span>No Aduan</span>
                            <span>Tarikh</span>
                            <span>Pengadu</span>
                            <span>Daerah</span>
                            <span>Status</span>
                            <span>Ringkasan</span>
                        </div>
                        {filtered.map((item) => (
                            <div key={item.id} className="app-table-row">
                                <span className="app-code">
                                    <Link to={`/app/complaints/${item.id}`} className="app-link">
                                        {item.reference_no || '-'}
                                    </Link>
                                </span>
                                <span>{item.complaint_date || '-'}</span>
                                <span>{item.complainant_name || '-'}</span>
                                <span>{item.district_name || '-'}</span>
                                <span>
                                    <span className="app-status-pill">
                                        {item.current_stage || 'baru'}
                                    </span>
                                </span>
                                <span className="app-summary">
                                    {item.summary || '-'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isFormOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={() => setIsFormOpen(false)}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <div>
                                <h4>Tambah Aduan</h4>
                                <p>Lengkapkan maklumat aduan anda.</p>
                            </div>
                            <button className="app-modal-close" onClick={() => setIsFormOpen(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <ComplaintForm
                            showSuccessMessage={false}
                            channelSource={role === 'awam' ? 'portal' : 'pegawai'}
                            onSuccess={() => {
                                setIsFormOpen(false);
                                fetchComplaints();
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplaintList;
