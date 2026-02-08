import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/ListPageLayout';
import PaginationBar from '../../components/PaginationBar';
import InlineAlert from '../../components/SharedInlineAlert';

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
        <>
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
                <InlineAlert type="error" message={error} dismissible onClose={() => setError('')} />
            )}

            {isLoading && <div className="app-empty">Memuatkan rekod...</div>}
            {!isLoading && !error && records.length === 0 ? (
                <div className="app-empty">Tiada rekod dijumpai.</div>
            ) : (
                !isLoading && !error && records.length > 0 && (
                    <div className="app-table app-table-actions">
                        <div className="app-table-header app-okt-header">
                            <span>Nama OKT</span>
                            <span>Kad Pengenalan / Passport</span>
                            <span>Alamat</span>
                            <span>Tahun</span>
                            <span>Nombor Kes</span>
                            <span>Mahkamah</span>
                            <span>Daerah</span>
                            <span>Tarikh Perbicaraan</span>
                            <span>Tindakan</span>
                        </div>
                        {records.map((row) => (
                            <div key={row.id} className="app-table-row app-okt-row">
                                <span>{row.nama_okt || '-'}</span>
                                <span>{row.no_kp_okt || '-'}</span>
                                <span className="app-table-wraptext">{row.alamat_okt || '-'}</span>
                                <span>{row.tahun || '-'}</span>
                                <span>{row.no_kes || '-'}</span>
                                <span>{row.mahkamah?.nama || '-'}</span>
                                <span>{row.daerah?.name || '-'}</span>
                                <span>{formatDate(row.tarikh_bicara)}</span>
                                <span className="app-row-actions">
                                    <button
                                        className="app-icon-button"
                                        type="button"
                                        onClick={() => navigate(`/app/i-waran/${row.id}`)}
                                        aria-label="Lihat waran"
                                        title="Buka"
                                    >
                                        <i className="bi bi-eye"></i>
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

export default WaranOktSearchList;
