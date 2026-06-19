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

const STATUS_LABELS = {
    draf: 'Draf',
    berjaya: 'Berjaya',
    tidak_berjaya: 'Tidak Berjaya',
    dalam_proses: 'Dalam Proses',
    kembalian: 'Kembalian',
};

const JENIS_WARAN_LABELS = {
    tangkap: 'Waran Tangkap',
    geledah: 'Waran Geledah',
};

const STAGE_TONE = {
    baru: 'app-waran-status-pill is-draf',
    dihantar_ke_daerah: 'app-status-pill-soft',
    diterima_daerah: 'app-status-pill-soft',
    hantar_ke_mahkamah: 'app-waran-status-pill is-hantar_mahkamah',
};

const toTitle = (value) => {
    const raw = String(value || '').trim();
    if (!raw) return '-';
    return raw
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
};

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur',
    });
};

const WaranList = () => {
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const role = String(localStorage.getItem('role') || '').trim().toLowerCase();
    const isSystem = role === 'system';
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
        scope: 'active',
    });
    const [draftFilters, setDraftFilters] = useState({
        keyword: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
        scope: 'active',
    });
    const [showFilters, setShowFilters] = useState(true);
    const [advancedOpen, setAdvancedOpen] = useState(false);
    const [actionLoadingId, setActionLoadingId] = useState(null);
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
        axios.get(`${apiUrl}/i-waran/export/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(filters.keyword ? { keyword: filters.keyword } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
                ...(filters.scope ? { scope: filters.scope } : {}),
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
        axios.get(`${apiUrl}/i-waran/export/xlsx`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                ...(filters.keyword ? { keyword: filters.keyword } : {}),
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
        axios.get(`${apiUrl}/i-waran`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                ...(filters.keyword ? { keyword: filters.keyword } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.fromDate ? { from_date: filters.fromDate } : {}),
                ...(filters.toDate ? { to_date: filters.toDate } : {}),
                ...(filters.scope ? { scope: filters.scope } : {}),
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
    }, [apiUrl, page, perPage, filters]);

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
            scope: filters.scope || 'active',
        };
        setDraftFilters(empty);
        setFilters(empty);
        setPage(1);
    };

    const updateRecordRow = (updated) => {
        if (!updated?.id) return;
        setRecords((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    };

    const handleDispatch = (item) => {
        if (!apiUrl || !item?.id || actionLoadingId) {
            return;
        }
        setActionLoadingId(`dispatch-${item.id}`);
        axios.post(`${apiUrl}/i-waran/${item.id}/dispatch-to-district`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                updateRecordRow(response?.data?.data || {});
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal hantar waran ke daerah.');
            })
            .finally(() => setActionLoadingId(null));
    };

    const handlePickup = (item) => {
        if (!apiUrl || !item?.id || actionLoadingId) {
            return;
        }
        setActionLoadingId(`pickup-${item.id}`);
        axios.post(`${apiUrl}/i-waran/${item.id}/pickup`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                updateRecordRow(response?.data?.data || {});
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal terima waran.');
            })
            .finally(() => setActionLoadingId(null));
    };

    const handleSendToCourt = (item) => {
        if (!apiUrl || !item?.id || actionLoadingId) {
            return;
        }
        setActionLoadingId(`court-${item.id}`);
        axios.post(`${apiUrl}/i-waran/${item.id}/send-to-court`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                updateRecordRow(response?.data?.data || {});
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal hantar email i-Waran ke mahkamah.');
            })
            .finally(() => setActionLoadingId(null));
    };

    const handleRestore = (item) => {
        if (!apiUrl || !item?.id || actionLoadingId) {
            return;
        }

        setActionLoadingId(`restore-${item.id}`);
        axios.post(`${apiUrl}/i-waran/${item.id}/restore`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                setError('');
                loadRecords();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memulihkan rekod waran.');
            })
            .finally(() => setActionLoadingId(null));
    };

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <>
            <ListPageLayout
                title="Senarai Waran"
                description="Semak dan urus waran yang diterima."
                className="app-aduan-list app-waran-list"
                actions={(
                    <>
                        <button className="app-button app-button-ghost" type="button" onClick={exportXlsx}>
                            <i className="bi bi-file-earmark-spreadsheet"></i>
                            Export Excel
                        </button>
                        <button
                            className="app-button app-button-ghost"
                            type="button"
                            onClick={() => setShowFilters((prev) => !prev)}
                        >
                            <i className={`bi ${showFilters ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                            {showFilters ? 'Sembunyi Filter' : 'Tunjuk Filter'}
                        </button>
                    </>
                )}
            >
                {showFilters && (
                    <form className="app-filter" onSubmit={handleSearch}>
                        <div className="app-filter-row app-filter-row-main">
                            <div className="app-filter-field app-filter-field-main">
                                <label>Keyword</label>
                                <div className="app-filter-input app-filter-input-advanced">
                                    <i className="bi bi-search app-filter-input-icon" aria-hidden="true"></i>
                                    <input
                                        className="app-filter-keyword-input"
                                        type="text"
                                        placeholder="Carian Waran"
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
                                    <button
                                        type="button"
                                        className={`app-search-advanced-toggle ${advancedOpen ? 'active' : ''}`}
                                        aria-label="Buka penapis lanjut"
                                        title="Penapis lanjut"
                                        onClick={() => setAdvancedOpen((prev) => !prev)}
                                    >
                                        <i className="bi bi-sliders"></i>
                                    </button>
                                </div>
                            </div>
                            <div className="app-filter-actions app-filter-actions-main">
                                <button className="app-button" type="submit">Search</button>
                                <button className="app-button app-button-ghost" type="button" onClick={handleReset}>
                                    Reset
                                </button>
                            </div>
                        </div>
                        {advancedOpen && (
                            <div className="app-filter-row app-filter-row-advanced">
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
                            </div>
                        )}
                    </form>
                )}
                <div className="app-list-tabs-row">
                    <div className="app-list-tabs">
                        <button
                            type="button"
                            className={`app-list-tab ${filters.scope === 'active' ? 'active' : ''}`}
                            onClick={() => {
                                const next = { ...filters, scope: 'active' };
                                const nextDraft = { ...draftFilters, scope: 'active' };
                                setFilters(next);
                                setDraftFilters(nextDraft);
                                setPage(1);
                            }}
                        >
                            Aktif
                        </button>
                        {isSystem && (
                            <button
                                type="button"
                                className={`app-list-tab ${filters.scope === 'deleted' ? 'active' : ''}`}
                                onClick={() => {
                                    const next = { ...filters, scope: 'deleted' };
                                    const nextDraft = { ...draftFilters, scope: 'deleted' };
                                    setFilters(next);
                                    setDraftFilters(nextDraft);
                                    setPage(1);
                                }}
                            >
                                Dipadam
                            </button>
                        )}
                    </div>
                    <button className="app-button app-list-tabs-add-btn" type="button" onClick={() => navigate('/app/i-waran/new')}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Waran
                    </button>
                </div>
                {isLoading && <div className="app-empty">Memuatkan rekod...</div>}
                {!isLoading && error && <div className="app-empty">{error}</div>}
                {!isLoading && !error && records.length === 0 ? (
                    <div className="app-empty">Tiada rekod waran ditemui.</div>
                ) : (
                    !isLoading && !error && records.length > 0 && (
                        <div className="app-table app-table-actions app-waran-list-table">
                            <div className="app-table-header">
                                <span>Bil</span>
                                <span>Waran</span>
                                <span>Daerah / Jenis</span>
                                <span>Status Waran</span>
                                <span>Butiran Waran</span>
                                <span>Tindakan</span>
                                <span>Aksi</span>
                            </div>
                            {records.map((item, index) => (
                                <div key={item.id} className="app-table-row">
                                    <span>{startIndex + index}</span>
                                    <span className="app-complaint-cell">
                                        <span className="app-complaint-cell-link-row">
                                            <button
                                                type="button"
                                                className="app-link app-link-button app-complaint-cell-link"
                                                onClick={() => navigate(`/app/i-waran/${item.id}`)}
                                            >
                                                {item.no_ruj_fail || '-'}
                                            </button>
                                            <a
                                                className="app-icon-button app-icon-button-xs"
                                                href={`/app/i-waran/${item.id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                aria-label="Buka dalam tab baharu"
                                                title="Buka tab baharu"
                                                onClick={(event) => event.stopPropagation()}
                                            >
                                                <i className="bi bi-box-arrow-up-right"></i>
                                            </a>
                                        </span>
                                        <span className="app-complaint-cell-name">
                                            {JENIS_WARAN_LABELS[item.jenis_waran] || toTitle(item.jenis_waran)}
                                        </span>
                                        <span className="app-complaint-cell-meta">{item.no_kes || 'No. kes belum direkodkan'}</span>
                                    </span>
                                    <span className="app-complaint-cell">
                                        <span className="app-complaint-cell-name">{item.daerah?.name || '-'}</span>
                                        <span className="app-complaint-cell-meta">{JENIS_WARAN_LABELS[item.jenis_waran] || toTitle(item.jenis_waran)}</span>
                                    </span>
                                    <span>
                                        <span className={`app-status-pill ${STAGE_TONE[item.current_stage || 'baru'] || ''}`}>
                                            {item.current_stage_label || 'Baru'}
                                        </span>
                                        {item.status && (
                                            <span className="app-status-stack">
                                                <span className={`app-waran-status-pill is-${item.status}`}>
                                                    {STATUS_LABELS[item.status] || toTitle(item.status)}
                                                </span>
                                                {item.sent_to_court_at && (
                                                    <span className="app-status-pill-mini is-info">
                                                        {item.court_delivery_label || 'Telah hantar ke Mahkamah'}
                                                    </span>
                                                )}
                                            </span>
                                        )}
                                        {!item.status && item.sent_to_court_at && (
                                            <span className="app-status-stack">
                                                <span className="app-status-pill-mini is-info">
                                                    {item.court_delivery_label || 'Telah hantar ke Mahkamah'}
                                                </span>
                                            </span>
                                        )}
                                    </span>
                                    <span className="app-summary">
                                        {[
                                            item.nama_okt ? `Nama OKT: ${item.nama_okt}` : '',
                                            item.no_kp_okt ? `No. K/P: ${item.no_kp_okt}` : '',
                                            item.no_kes ? `No. Kes: ${item.no_kes}` : '',
                                        ].filter(Boolean).join('\n') || '-'}
                                    </span>
                                    <span className="app-complaint-cell">
                                        <span className="app-complaint-cell-meta">Tarikh Terima</span>
                                        <span className="app-complaint-cell-name">{formatDateTime(item.tarikh_masa_terima)}</span>
                                        {item.sent_to_district_by?.name && (
                                            <span className="app-complaint-cell-meta" title={`Dihantar oleh ${item.sent_to_district_by.name}`}>
                                                Hantar: {item.sent_to_district_by.name}
                                            </span>
                                        )}
                                        {item.received_by?.name && (
                                            <span className="app-complaint-cell-meta" title={`Diterima oleh ${item.received_by.name}`}>
                                                Terima: {item.received_by.name}
                                            </span>
                                        )}
                                        {item.sent_to_court_by?.name && (
                                            <span className="app-complaint-cell-meta" title={`Dihantar ke mahkamah oleh ${item.sent_to_court_by.name}`}>
                                                Mahkamah: {item.sent_to_court_by.name}
                                            </span>
                                        )}
                                          {item.can_dispatch && (
                                              <button
                                                  type="button"
                                                  className="app-button app-button-ghost app-button-mini"
                                                  onClick={() => handleDispatch(item)}
                                                  disabled={actionLoadingId === `dispatch-${item.id}`}
                                              >
                                                  {actionLoadingId === `dispatch-${item.id}` && (
                                                      <span
                                                          className="spinner-border spinner-border-sm"
                                                          role="status"
                                                          aria-hidden="true"
                                                          style={{ marginRight: '.45rem' }}
                                                      ></span>
                                                  )}
                                                  {actionLoadingId === `dispatch-${item.id}`
                                                      ? 'Menghantar...'
                                                      : `Hantar ke ${item.daerah?.name || 'Daerah'}`}
                                              </button>
                                          )}
                                          {item.can_pickup && (
                                              <button
                                                  type="button"
                                                  className="app-button app-button-ghost app-button-mini"
                                                  onClick={() => handlePickup(item)}
                                                  disabled={actionLoadingId === `pickup-${item.id}`}
                                              >
                                                  {actionLoadingId === `pickup-${item.id}` && (
                                                      <span
                                                          className="spinner-border spinner-border-sm"
                                                          role="status"
                                                          aria-hidden="true"
                                                          style={{ marginRight: '.45rem' }}
                                                      ></span>
                                                  )}
                                                  {actionLoadingId === `pickup-${item.id}` ? 'Menerima...' : 'Terima Waran'}
                                              </button>
                                          )}
                                          {item.can_send_to_court && (
                                              <button
                                                  type="button"
                                                  className="app-button app-button-ghost app-button-mini"
                                                  onClick={() => handleSendToCourt(item)}
                                                  disabled={actionLoadingId === `court-${item.id}`}
                                              >
                                                  {actionLoadingId === `court-${item.id}` && (
                                                      <span
                                                          className="spinner-border spinner-border-sm"
                                                          role="status"
                                                          aria-hidden="true"
                                                          style={{ marginRight: '.45rem' }}
                                                      ></span>
                                                  )}
                                                  {actionLoadingId === `court-${item.id}` ? 'Menghantar...' : 'Hantar ke Mahkamah'}
                                              </button>
                                          )}
                                          {item.can_restore && (
                                              <button
                                                  type="button"
                                                  className="app-button app-button-ghost app-button-mini"
                                                  onClick={() => handleRestore(item)}
                                                  disabled={actionLoadingId === `restore-${item.id}`}
                                              >
                                                  {actionLoadingId === `restore-${item.id}` && (
                                                      <span
                                                          className="spinner-border spinner-border-sm"
                                                          role="status"
                                                          aria-hidden="true"
                                                          style={{ marginRight: '.45rem' }}
                                                      ></span>
                                                  )}
                                                  {actionLoadingId === `restore-${item.id}` ? 'Memulihkan...' : 'Pulihkan'}
                                              </button>
                                          )}
                                    </span>
                                    <span>
                                        <div className="app-row-actions-stack is-compact">
                                            <div className="app-row-actions-icons">
                                                {!item.is_deleted && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="app-link"
                                                            onClick={() => navigate(`/app/i-waran/${item.id}/edit`)}
                                                        >
                                                            Kemaskini
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
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
