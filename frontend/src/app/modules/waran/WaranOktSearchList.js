import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/ListPageLayout';
import PaginationBar from '../../components/PaginationBar';

const formatDate = (value) => {
    if (!value) {
        return '-';
    }
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
        return '-';
    }
    // dd MMM yyyy (BM style is fine without locale dependency)
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mac', 'Apr', 'Mei', 'Jun', 'Jul', 'Ogos', 'Sep', 'Okt', 'Nov', 'Dis'];
    const month = months[d.getMonth()] || '';
    return `${day} ${month} ${d.getFullYear()}`;
};

const WaranOktSearchList = () => {
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);

    const [quickNama, setQuickNama] = useState('');
    const [filters, setFilters] = useState({
        nama: '',
        no_kp: '',
        district: '',
        fromDate: '',
        toDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        nama: '',
        no_kp: '',
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

    const effectiveNama = useMemo(() => {
        return (quickNama || filters.nama || '').trim();
    }, [filters.nama, quickNama]);

    const loadRecords = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/i-waran/semakan-okt`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                ...(effectiveNama ? { nama: effectiveNama } : {}),
                ...(filters.no_kp ? { no_kp: filters.no_kp } : {}),
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, page, perPage, filters, quickNama]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/districts`)
            .then((response) => setDistrictOptions(response?.data?.data || []))
            .catch(() => setDistrictOptions([]));
    }, [apiUrl]);

    const handleSearch = (event) => {
        event.preventDefault();
        setFilters(draftFilters);
        setPage(1);
    };

    const handleReset = () => {
        const empty = {
            nama: '',
            no_kp: '',
            district: '',
            fromDate: '',
            toDate: '',
        };
        setDraftFilters(empty);
        setFilters(empty);
        setQuickNama('');
        setPage(1);
    };

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <ListPageLayout
            eyebrow="i-WARAN"
            title="Semakan Nama OKT Waran"
            description="Carian rekod waran berdasarkan nama OKT dan butiran pengenalan."
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
                            value={quickNama}
                            onChange={(event) => {
                                setQuickNama(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Cari nama OKT..."
                        />
                        {quickNama && (
                            <button
                                type="button"
                                className="app-search-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => {
                                    setQuickNama('');
                                    setPage(1);
                                }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                </>
            )}
        >
            {showFilters && (
                <form className="app-filter" onSubmit={handleSearch}>
                    <div className="app-filter-row">
                        <div className="app-filter-field">
                            <label>Nama OKT</label>
                            <div className="app-filter-input">
                                <input
                                    type="text"
                                    placeholder="Contoh: Zaharin"
                                    value={draftFilters.nama}
                                    onChange={(event) => setDraftFilters({ ...draftFilters, nama: event.target.value })}
                                />
                            </div>
                        </div>
                        <div className="app-filter-field">
                            <label>Kad Pengenalan / Passport</label>
                            <div className="app-filter-input">
                                <input
                                    type="text"
                                    placeholder="Contoh: 860709436865"
                                    value={draftFilters.no_kp}
                                    onChange={(event) => setDraftFilters({ ...draftFilters, no_kp: event.target.value })}
                                />
                            </div>
                        </div>
                        <div className="app-filter-field">
                            <label>Daerah</label>
                            <div className="app-filter-input">
                                <select
                                    value={draftFilters.district}
                                    onChange={(event) => setDraftFilters({ ...draftFilters, district: event.target.value })}
                                >
                                    <option value="">Semua</option>
                                    {districtOptions.map((item) => (
                                        <option key={item.id} value={item.id}>{item.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="app-filter-field">
                            <label>Tarikh Perbicaraan (Dari)</label>
                            <div className="app-filter-input">
                                <input
                                    type="date"
                                    value={draftFilters.fromDate}
                                    onChange={(event) => setDraftFilters({ ...draftFilters, fromDate: event.target.value })}
                                />
                            </div>
                        </div>
                        <div className="app-filter-field">
                            <label>Tarikh Perbicaraan (Hingga)</label>
                            <div className="app-filter-input">
                                <input
                                    type="date"
                                    value={draftFilters.toDate}
                                    onChange={(event) => setDraftFilters({ ...draftFilters, toDate: event.target.value })}
                                />
                            </div>
                        </div>
                    </div>
                    <div className="app-filter-actions">
                        <button className="app-button" type="submit">
                            <i className="bi bi-search"></i>
                            Carian
                        </button>
                        <button className="app-button app-button-ghost" type="button" onClick={handleReset}>
                            <i className="bi bi-arrow-counterclockwise"></i>
                            Reset
                        </button>
                    </div>
                </form>
            )}

            {error && (
                <div className="app-alert app-alert-error">
                    <i className="bi bi-exclamation-triangle"></i>
                    <div>{error}</div>
                </div>
            )}

            <div className="app-table-card">
                <div className="app-table-meta">
                    <div className="app-table-count">
                        {pagination.total > 0 ? `Paparan ${startIndex}-${endIndex} daripada ${pagination.total}` : 'Tiada rekod'}
                    </div>
                    <div className="app-table-perpage">
                        <label>Rekod</label>
                        <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1); }}>
                            {[10, 20, 50].map((size) => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="app-table-wrap">
                    <table className="app-table">
                        <thead>
                            <tr className="app-table-header app-okt-header">
                                <th>Nama OKT</th>
                                <th>Kad Pengenalan / Passport</th>
                                <th>Alamat</th>
                                <th>Tahun</th>
                                <th>Nombor Kes</th>
                                <th>Mahkamah</th>
                                <th>Daerah</th>
                                <th>Tarikh Perbicaraan</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading && (
                                <tr className="app-table-row app-okt-row">
                                    <td colSpan={9}>Memuatkan...</td>
                                </tr>
                            )}
                            {!isLoading && records.length === 0 && (
                                <tr className="app-table-row app-okt-row">
                                    <td colSpan={9}>Tiada rekod dijumpai.</td>
                                </tr>
                            )}
                            {!isLoading && records.map((row) => (
                                <tr key={row.id} className="app-table-row app-okt-row">
                                    <td>{row.nama_okt || '-'}</td>
                                    <td>{row.no_kp_okt || '-'}</td>
                                    <td className="app-table-wraptext">{row.alamat_okt || '-'}</td>
                                    <td>{row.tahun || '-'}</td>
                                    <td>{row.no_kes || '-'}</td>
                                    <td>{row.mahkamah?.nama || '-'}</td>
                                    <td>{row.daerah?.name || '-'}</td>
                                    <td>{formatDate(row.tarikh_bicara)}</td>
                                    <td className="app-table-actions">
                                        <button
                                            type="button"
                                            className="app-button app-button-ghost"
                                            onClick={() => navigate(`/app/i-waran/${row.id}`)}
                                        >
                                            Buka
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <PaginationBar
                    pagination={pagination}
                    page={page}
                    setPage={setPage}
                />
            </div>
        </ListPageLayout>
    );
};

export default WaranOktSearchList;
