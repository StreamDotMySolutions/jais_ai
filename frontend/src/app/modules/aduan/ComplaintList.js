import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ComplaintForm from './ComplaintForm';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import ConfirmModal from '../../components/SharedConfirmModal';
import { sortRows } from '../../utils/sort';

const ComplaintList = ({
    caseType = '',
    isCase = false,
    title = 'Senarai Aduan',
    description = 'Semak dan urus aduan yang diterima.',
    fetchEndpoint = '',
    enablePickup = false,
}) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [quickQuery, setQuickQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const role = localStorage.getItem('role') || 'awam';
    const canDelete = role === 'pegawai_hq';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [statusOptions, setStatusOptions] = useState([{ value: '', label: 'Semua' }]);
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
    const [pickupMessage, setPickupMessage] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusTab, setStatusTab] = useState('all');
    const [pendingApproval, setPendingApproval] = useState(false);
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const showCaseTabs = !caseType && !fetchEndpoint && !isCase;

    const fetchComplaints = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        let endpoint = role === 'awam' ? `${apiUrl}/complaints/my` : `${apiUrl}/complaints`;
        if (fetchEndpoint) {
            endpoint = `${apiUrl}${fetchEndpoint}`;
        }

        const effectiveKeyword = quickQuery || filters.keyword;
        const params = {
            page,
            per_page: perPage,
        };
        if (effectiveKeyword) {
            params.keyword = effectiveKeyword;
        }
        if (filters.status) {
            params.status = filters.status;
        }
        if (filters.district) {
            params.district_id = filters.district;
        }
        if (filters.fromDate) {
            params.from_date = filters.fromDate;
        }
        if (filters.toDate) {
            params.to_date = filters.toDate;
        }
        if (caseType) {
            params.case_type = caseType;
        }
        if (isCase) {
            params.is_case = true;
            // KES only shows items that have been approved (disahkan).
            params.status = 'disahkan';
        }
        if (pendingApproval) {
            params.pending_approval = 1;
        }

        axios.get(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => {
                const data = response?.data?.data || [];
                setComplaints(data);
                setPagination(response?.data?.meta || {
                    current_page: page,
                    last_page: 1,
                    per_page: perPage,
                    total: 0,
                });
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || err?.message || 'Gagal mendapatkan aduan.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    const handlePickup = (complaintId) => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setPickupMessage('');
        axios.post(`${apiUrl}/complaints/${complaintId}/pickup`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                setPickupMessage('Aduan berjaya diambil.');
                fetchComplaints();
            })
            .catch((err) => {
                setPickupMessage(err?.response?.data?.message || 'Gagal ambil aduan.');
            });
    };

    useEffect(() => {
        fetchComplaints();
    }, [apiUrl, role, fetchEndpoint, caseType, isCase, page, perPage, filters, quickQuery, pendingApproval]);

    useEffect(() => {
        setPage(1);
        setSelectedComplaint(null);
    }, [role, fetchEndpoint, caseType, isCase]);

    const sortColumns = [
        { key: 'reference_no', label: 'No Aduan', sortable: true },
        { key: 'complaint_date', label: 'Tarikh', sortable: true },
        { key: 'complainant_name', label: 'Pengadu', sortable: true },
        { key: 'district_name', label: 'Daerah', sortable: true },
        { key: 'case_type', label: 'Kategori', sortable: true },
        { key: 'current_stage', label: 'Status', sortable: true },
        { key: 'summary', label: 'Ringkasan', sortable: false },
        { key: 'actions', label: 'Tindakan', sortable: false },
    ];

    const sortAccessors = useMemo(() => ({
        reference_no: (item) => item.reference_no || '',
        complaint_date: (item) => item.complaint_date || '',
        complainant_name: (item) => item.complainant_name || '',
        district_name: (item) => item.district_name || '',
        case_type: (item) => item.case_type || '',
        current_stage: (item) => item.current_stage || '',
    }), []);

    const sortedComplaints = useMemo(
        () => sortRows(complaints, sortKey, sortDir, sortAccessors),
        [complaints, sortKey, sortDir, sortAccessors]
    );

    const handleSort = (key) => {
        if (!key) {
            return;
        }
        if (key === 'actions') {
            return;
        }
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const handleDelete = (complaintId) => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionMessage('');
        axios.delete(`${apiUrl}/complaints/${complaintId}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setActionMessage(response?.data?.message || 'Aduan dipadam.');
                fetchComplaints();
            })
            .catch((err) => {
                setActionMessage(err?.response?.data?.message || 'Gagal memadam aduan.');
            });
    };

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

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        axios.get(`${apiUrl}/references/complaint-statuses`)
            .then((response) => {
                const data = response?.data?.data || [];
                const options = data.map((item) => ({
                    value: item.code,
                    label: item.name,
                }));
                setStatusOptions([{ value: '', label: 'Semua' }, ...options]);
            })
            .catch(() => {
                setStatusOptions([{ value: '', label: 'Semua' }]);
            });
    }, [apiUrl]);

    const handleSearch = (event) => {
        event.preventDefault();
        setFilters(draftFilters);
        setStatusTab(draftFilters.status || 'all');
        setPendingApproval(false);
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
        setStatusTab('all');
        setPendingApproval(false);
        setPage(1);
    };

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <div className="app-complaints">
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Padam Aduan"
                description={deleteTarget ? `Padam aduan \"${deleteTarget.reference_no || deleteTarget.id}\"? Tindakan ini tidak boleh diundur.` : ''}
                confirmText="Padam"
                cancelText="Batal"
                variant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget?.id) {
                        handleDelete(deleteTarget.id);
                    }
                    setDeleteTarget(null);
                }}
            />
            <div className="app-complaints-header">
                <div>
                    <div className="app-complaints-title">
                        <h3>{title}</h3>
                        {caseType && (
                            <span className="app-status-pill">
                                {caseType === 'AJ' ? 'AJ - Jenayah' : 'AK - Keluarga'}
                            </span>
                        )}
                    </div>
                    <p>{description}</p>
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
                            onChange={(event) => {
                                setQuickQuery(event.target.value);
                                setPage(1);
                            }}
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
                </div>
            </div>

            {showFilters && (
                <form className="app-filter" onSubmit={handleSearch}>
                    <div className="app-filter-row">
                        <div className="app-filter-field">
                            <label>Keyword</label>
                            <div className="app-filter-input">
                                <input
                                    type="text"
                                    placeholder="Nama, no aduan, daerah..."
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

            <div className={`app-complaints-body ${selectedComplaint ? 'has-drawer' : ''}`}>
                <div className="app-complaints-main">
            <div className="app-card app-complaints-card">
                    {showCaseTabs && (
                        <div className="app-list-tabs-row">
                            <div className="app-list-tabs">
                                <button
                                    type="button"
                                    className={`app-list-tab${statusTab === 'all' ? ' active' : ''}`}
                                    onClick={() => {
                                        setStatusTab('all');
                                        setPendingApproval(false);
                                        setFilters((prev) => ({ ...prev, status: '' }));
                                        setDraftFilters((prev) => ({ ...prev, status: '' }));
                                        setPage(1);
                                    }}
                                >
                                    Semua
                                </button>
                                <button
                                    type="button"
                                    className={`app-list-tab${statusTab === 'baru' ? ' active' : ''}`}
                                    onClick={() => {
                                        setStatusTab('baru');
                                        setPendingApproval(false);
                                        setFilters((prev) => ({ ...prev, status: 'baru' }));
                                        setDraftFilters((prev) => ({ ...prev, status: 'baru' }));
                                        setPage(1);
                                    }}
                                >
                                    Baru
                                </button>
                                <button
                                    type="button"
                                    className={`app-list-tab${statusTab === 'pending' ? ' active' : ''}`}
                                    onClick={() => {
                                        setStatusTab('pending');
                                        setPendingApproval(true);
                                        setFilters((prev) => ({ ...prev, status: '' }));
                                        setDraftFilters((prev) => ({ ...prev, status: '' }));
                                        setPage(1);
                                    }}
                                >
                                    Menunggu Pengesahan
                                </button>
                                <button
                                    type="button"
                                    className={`app-list-tab${statusTab === 'disahkan' ? ' active' : ''}`}
                                    onClick={() => {
                                        setStatusTab('disahkan');
                                        setPendingApproval(false);
                                        setFilters((prev) => ({ ...prev, status: 'disahkan' }));
                                        setDraftFilters((prev) => ({ ...prev, status: 'disahkan' }));
                                        setPage(1);
                                    }}
                                >
                                    Disahkan
                                </button>
                            </div>
                        </div>
                    )}
                    {isLoading && (
                        <div className="app-table app-table-actions app-table-skeleton">
                            <div className="app-table-header">
                            <span>No Aduan</span>
                            <span>Tarikh</span>
                            <span>Pengadu</span>
                            <span>Daerah</span>
                            <span>Kategori</span>
                            <span>Status</span>
                            <span>Ringkasan</span>
                            <span>Tindakan</span>
                        </div>
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={`skeleton-row-${index}`} className="app-table-row">
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </div>
                        ))}
                    </div>
                )}
                {error && !isLoading && <div className="app-empty">{error}</div>}
                {!isLoading && !error && complaints.length === 0 && (
                    <div className="app-empty">Tiada aduan ditemui.</div>
                )}
                {!isLoading && !error && complaints.length > 0 && (
                    <div className="app-table app-table-actions">
                        <SortableHeader
                            className="app-table-header"
                            columns={sortColumns}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {sortedComplaints.map((item) => (
                            <div
                                key={item.id}
                                className={`app-table-row ${selectedComplaint?.id === item.id ? 'is-selected' : ''}`}
                            >
                                <span className="app-code">
                                    <button
                                        type="button"
                                        className="app-link app-link-button"
                                        onClick={() => setSelectedComplaint(item)}
                                    >
                                        {item.reference_no || '-'}
                                    </button>
                                </span>
                                <span>{item.complaint_date || '-'}</span>
                                <span>{item.complainant_name || '-'}</span>
                                <span>{item.district_name || '-'}</span>
                                <span>{item.case_type || '-'}</span>
                                <span>
                                    <span className="app-status-pill">
                                        {item.current_stage || 'baru'}
                                    </span>
                                </span>
                                <span className="app-summary">
                                    {item.summary || '-'}
                                </span>
                                <span className="app-row-actions">
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => navigate(`/app/complaints/${item.id}`)}
                                        aria-label="Kemaskini"
                                        title="Kemaskini"
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    {canDelete && item.current_stage === 'baru' && (
                                        <button
                                            type="button"
                                            className="app-icon-button app-icon-button-danger"
                                            onClick={() => setDeleteTarget(item)}
                                            aria-label="Padam"
                                            title="Padam"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    )}
                                    {enablePickup && (
                                        <button
                                            type="button"
                                            className="app-button app-button-ghost"
                                            onClick={() => handlePickup(item.id)}
                                        >
                                            Ambil Aduan
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                    )}
                    </div>
                    {pickupMessage && <div className="app-detail-note">{pickupMessage}</div>}
                    {actionMessage && <div className="app-detail-note">{actionMessage}</div>}
                    {!isLoading && !error && pagination.total > 0 && (
                        <PaginationBar
                            page={pagination.current_page}
                            lastPage={pagination.last_page}
                            total={pagination.total}
                            perPage={pagination.per_page}
                            startIndex={startIndex}
                            endIndex={endIndex}
                            onPageChange={(nextPage) => setPage(nextPage)}
                            onPerPageChange={(size) => {
                                setPerPage(size);
                                setPage(1);
                            }}
                        />
                    )}
                </div>

                {selectedComplaint && (
                    <div className="app-drawer app-drawer--push">
                        <aside className="app-drawer-panel">
                            <div className="app-drawer-header">
                                <div>
                                    <span className="app-eyebrow">Ringkasan Aduan</span>
                                    <h4>{selectedComplaint.reference_no || '-'}</h4>
                                    <span className="app-status-pill">{selectedComplaint.current_stage || 'baru'}</span>
                                </div>
                                <button
                                    className="app-modal-close"
                                    type="button"
                                    onClick={() => setSelectedComplaint(null)}
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </div>

                            <div className="app-drawer-section">
                                <h5>Maklumat Pengadu</h5>
                                <p><strong>{selectedComplaint.complainant_name || '-'}</strong></p>
                                <p>No K/P: {selectedComplaint.identification_number || '-'}</p>
                                <p>No HP: {selectedComplaint.contact_number || '-'}</p>
                            </div>

                            <div className="app-drawer-section">
                                <h5>Maklumat Aduan</h5>
                                <p>Tarikh/Masa: {selectedComplaint.complaint_date || '-'} {selectedComplaint.complaint_time || ''}</p>
                                <p>Alamat: {selectedComplaint.address || '-'}</p>
                                <p>Daerah: {selectedComplaint.district_name || '-'}</p>
                            </div>

                            <div className="app-drawer-section">
                                <h5>Ringkasan Aduan</h5>
                                <p>{selectedComplaint.summary || '-'}</p>
                            </div>

                            <div className="app-drawer-actions">
                                <a
                                    href={`/app/complaints/${selectedComplaint.id}`}
                                    className="app-icon-button"
                                    target="_blank"
                                    rel="noreferrer"
                                    aria-label="Buka di tab baru"
                                    title="Buka di tab baru"
                                >
                                    <i className="bi bi-box-arrow-up-right"></i>
                                </a>
                                <button
                                    className="app-button"
                                    type="button"
                                    onClick={() => navigate(`/app/complaints/${selectedComplaint.id}`)}
                                >
                                    Kemaskini Aduan
                                </button>
                            </div>
                        </aside>
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
