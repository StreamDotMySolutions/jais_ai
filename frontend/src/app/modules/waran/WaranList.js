import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/ListPageLayout';
import PaginationBar from '../../components/PaginationBar';
import { formatMalaysiaDateStamp } from '../../utils/dateTime';

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

const WaranList = () => {
    const navigate = useNavigate();
    const [quickQuery, setQuickQuery] = useState('');
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [statusOptions, setStatusOptions] = useState([
        { value: '', label: 'Semua' },
        { value: 'draf', label: 'Draf' },
        { value: 'berjaya', label: 'Berjaya' },
        { value: 'tidak_berjaya', label: 'Tidak Berjaya' },
        { value: 'dalam_proses', label: 'Dalam Proses' },
        { value: 'kembalian', label: 'Kembalian' },
    ]);
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
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });

    const exportCsv = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }
        const effectiveKeyword = quickQuery || filters.keyword;
        axios.get(`${apiUrl}/i-waran/export/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(effectiveKeyword ? { keyword: effectiveKeyword } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'text/csv' });
                downloadBlob(blob, `i-waran-export-${formatMalaysiaDateStamp()}.csv`);
            })
            .catch(() => {
                setError('Gagal export CSV.');
            });
    };

    const exportXlsx = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }
        const effectiveKeyword = quickQuery || filters.keyword;
        axios.get(`${apiUrl}/i-waran/export/xlsx`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(effectiveKeyword ? { keyword: effectiveKeyword } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => {
                const blob = new Blob([response.data], { type: response.headers?.['content-type'] || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                downloadBlob(blob, `i-waran-export-${formatMalaysiaDateStamp()}.xlsx`);
            })
            .catch(() => {
                setError('Gagal export Excel.');
            });
    };

    const loadRecords = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const effectiveKeyword = quickQuery || filters.keyword;
        axios.get(`${apiUrl}/i-waran`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                ...(effectiveKeyword ? { keyword: effectiveKeyword } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
            },
        })
            .then((response) => {
                setRecords(response?.data?.data || []);
                setPagination(response?.data?.meta || {
                    current_page: 1,
                    last_page: 1,
                    per_page: perPage,
                    total: 0,
                });
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan rekod.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadRecords();
    }, [apiUrl, page, perPage, filters, quickQuery]);

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

    const handleSearch = (event) => {
        event.preventDefault();
        setFilters(draftFilters);
        setPage(1);
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
        setPage(1);
    };

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <>
            <ListPageLayout
                eyebrow="i-WARAN"
                title="Senarai Waran"
                description="Rekod pendaftaran waran dan laporan perlaksanaan."
                actions={(
                    <>
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
                                value={quickQuery}
                                onChange={(event) => {
                                    setQuickQuery(event.target.value);
                                    setPage(1);
                                }}
                                placeholder="Cari nombor kes, nama OKT, daerah..."
                            />
                            {quickQuery && (
                                <button
                                    type="button"
                                    className="app-search-clear"
                                    aria-label="Kosongkan carian"
                                    onClick={() => {
                                        setQuickQuery('');
                                        setPage(1);
                                    }}
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>
                        <button className="app-button" type="button" onClick={() => navigate('/app/i-waran/new')}>
                            <i className="bi bi-plus-lg"></i>
                            Tambah Waran
                        </button>
                        <button className="app-button app-button-ghost" type="button" onClick={exportCsv}>
                            <i className="bi bi-download"></i>
                            Export CSV
                        </button>
                        <button className="app-button app-button-ghost" type="button" onClick={exportXlsx}>
                            <i className="bi bi-file-earmark-spreadsheet"></i>
                            Export Excel
                        </button>
                    </>
                )}
            >
                {showFilters && (
                    <form className="app-filter" onSubmit={handleSearch}>
                        <div className="app-filter-row">
                            <div className="app-filter-field">
                                <label>Keyword</label>
                                <div className="app-filter-input">
                                    <input
                                        type="text"
                                        placeholder="No kes, no ruj fail, OKT..."
                                        value={draftFilters.keyword}
                                        onChange={(event) => setDraftFilters({ ...draftFilters, keyword: event.target.value })}
                                    />
                                    {draftFilters.keyword && (
                                        <button
                                            type="button"
                                            className="app-search-clear"
                                            aria-label="Kosongkan carian"
                                            onClick={() => setDraftFilters({ ...draftFilters, keyword: '' })}
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    )}
                                </div>
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
                {isLoading && <div className="app-empty">Memuatkan rekod...</div>}
                {!isLoading && error && <div className="app-empty">{error}</div>}
                {!isLoading && !error && records.length === 0 ? (
                    <div className="app-empty">Tiada rekod waran ditemui.</div>
                ) : (
                    !isLoading && !error && records.length > 0 && (
                        <div className="app-table">
                            <div className="app-table-header app-waran-header">
                                <span>No. Ruj Fail</span>
                                <span>Jenis Waran</span>
                                <span>No. Kes</span>
                                <span>Daerah</span>
                                <span>Tarikh Terima</span>
                                <span>Status</span>
                                <span>Tindakan</span>
                            </div>
                            {records.map((item) => (
                                <div key={item.id} className="app-table-row app-waran-row">
                                    <span>{item.no_ruj_fail || '-'}</span>
                                    <span>{item.jenis_waran || '-'}</span>
                                    <span>{item.no_kes || '-'}</span>
                                    <span>{item.daerah?.name || '-'}</span>
                                    <span>{item.tarikh_masa_terima || '-'}</span>
                                    <span>
                                        <span className="app-status-pill">
                                            {item.status || 'draf'}
                                        </span>
                                    </span>
                                    <span className="app-row-actions">
                                        <button
                                            className="app-icon-button"
                                            type="button"
                                            onClick={() => navigate(`/app/i-waran/${item.id}`)}
                                            aria-label="Lihat waran"
                                            title="Lihat"
                                        >
                                            <i className="bi bi-eye"></i>
                                        </button>
                                        <button
                                            className="app-icon-button"
                                            type="button"
                                            onClick={() => navigate(`/app/i-waran/${item.id}/edit`)}
                                            aria-label="Kemaskini waran"
                                            title="Kemaskini"
                                        >
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                    </span>
                                </div>
                            ))}
                        </div>
                    )
                )}
            </ListPageLayout>

            {!isLoading && !error && pagination.total > 0 && (
                <PaginationBar
                    page={pagination.current_page}
                    lastPage={pagination.last_page}
                    total={pagination.total}
                    perPage={pagination.per_page}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                />
            )}
        </>
    );
};

export default WaranList;
