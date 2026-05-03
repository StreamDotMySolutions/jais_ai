import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/ListPageLayout';
import PaginationBar from '../../components/PaginationBar';

const formatDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
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

const formatArrestStatus = (value) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized === 'ada') return 'Ada Tangkapan';
    if (normalized === 'tiada') return 'Tiada Tangkapan';
    return '-';
};

const formatOpStatus = (status, category) => {
    const statusText = String(status || '').trim();
    const categoryText = String(category || '').trim();
    if (statusText && categoryText) return `OP: ${statusText} (${categoryText})`;
    if (statusText) return `OP: ${statusText}`;
    if (categoryText) return `OP: ${categoryText}`;
    return '';
};

const formatExistingComplaintCase = (complaint) => {
    const caseNo = String(complaint?.case_register_no || '').trim();
    return caseNo ? `Kes sedia ada: ${caseNo}` : '';
};

const CaseList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [caseType, setCaseType] = useState('AJ');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(20);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [complaintKeyword, setComplaintKeyword] = useState('');
    const [complaintResults, setComplaintResults] = useState([]);
    const [selectedComplaints, setSelectedComplaints] = useState([]);
    const [isComplaintSearchLoading, setIsComplaintSearchLoading] = useState(false);
    const [isCreatingCase, setIsCreatingCase] = useState(false);
    const [createError, setCreateError] = useState('');

    const loadCases = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/cases`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                case_type: caseType || undefined,
                keyword: keyword.trim() || undefined,
                with_complaints: 1,
            },
        })
            .then((response) => {
                setRows(Array.isArray(response?.data?.data) ? response.data.data : []);
                setTotal(Number(response?.data?.meta?.total || 0));
                setLastPage(Number(response?.data?.meta?.last_page || 1));
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan senarai kes.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadCases();
    }, [apiUrl, page, perPage, caseType]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadCases();
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

    const searchComplaints = () => {
        if (!apiUrl) {
            setCreateError('API URL tidak diset.');
            return;
        }

        setIsComplaintSearchLoading(true);
        setCreateError('');
        axios.get(`${apiUrl}/complaints`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                case_type: 'AJ',
                keyword: complaintKeyword.trim() || undefined,
                per_page: 12,
            },
        })
            .then((response) => {
                setComplaintResults(Array.isArray(response?.data?.data) ? response.data.data : []);
            })
            .catch((err) => {
                setCreateError(err?.response?.data?.message || 'Gagal mencari aduan.');
            })
            .finally(() => setIsComplaintSearchLoading(false));
    };

    useEffect(() => {
        if (!isCreateModalOpen) {
            return undefined;
        }
        const timer = setTimeout(searchComplaints, 300);
        return () => clearTimeout(timer);
    }, [isCreateModalOpen, complaintKeyword]);

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
        setComplaintKeyword('');
        setComplaintResults([]);
        setSelectedComplaints([]);
        setCreateError('');
    };

    const closeCreateModal = () => {
        if (isCreatingCase) {
            return;
        }
        setIsCreateModalOpen(false);
        setCreateError('');
    };

    const isComplaintSelected = (complaintId) => selectedComplaints.some((item) => Number(item.id) === Number(complaintId));

    const toggleComplaintSelection = (complaint) => {
        setCreateError('');
        setSelectedComplaints((prev) => {
            if (prev.some((item) => Number(item.id) === Number(complaint.id))) {
                return prev.filter((item) => Number(item.id) !== Number(complaint.id));
            }
            return [...prev, complaint];
        });
    };

    const createCaseFromSelection = () => {
        if (!apiUrl || selectedComplaints.length === 0) {
            setCreateError('Pilih sekurang-kurangnya satu aduan.');
            return;
        }

        setIsCreatingCase(true);
        setCreateError('');
        axios.post(`${apiUrl}/cases`, {
            complaint_ids: selectedComplaints.map((item) => item.id),
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const createdCase = response?.data?.data;
                setIsCreateModalOpen(false);
                loadCases();
                if (createdCase?.id) {
                    navigate(`/app/cases/${createdCase.id}`);
                }
            })
            .catch((err) => {
                const errors = err?.response?.data?.errors;
                const firstError = errors ? Object.values(errors)?.[0]?.[0] : '';
                setCreateError(firstError || err?.response?.data?.message || 'Gagal menambah kes.');
            })
            .finally(() => setIsCreatingCase(false));
    };

    const startIndex = useMemo(() => (
        total === 0 ? 0 : ((page - 1) * perPage) + 1
    ), [page, perPage, total]);
    const endIndex = useMemo(() => (
        total === 0 ? 0 : Math.min(total, page * perPage)
    ), [page, perPage, total]);

    return (
        <ListPageLayout
            className="app-case-list"
            eyebrow="Pengurusan Kes"
            title="Senarai Kes"
            description="Paparan semua rekod KES yang sudah dipautkan dengan aduan."
            actions={(
                <button type="button" className="app-button" onClick={openCreateModal}>
                    <i className="bi bi-plus-lg"></i>
                    Tambah Kes
                </button>
            )}
            filters={(
                <form className="app-filter app-case-filters" onSubmit={(event) => event.preventDefault()}>
                    <div className="app-filter-row app-case-filter-row">
                        <div className="app-filter-field app-filter-field-main">
                            <span>Carian</span>
                            <div className="app-filter-input">
                                <i className="bi bi-search app-filter-input-icon" aria-hidden="true"></i>
                                <input
                                    type="text"
                                    className="app-filter-keyword-input"
                                    value={keyword}
                                    onChange={(event) => setKeyword(event.target.value)}
                                    placeholder="Cari No. Daftar Kes / Nombor Fail"
                                />
                                {keyword && (
                                    <button
                                        type="button"
                                        className="app-search-clear"
                                        aria-label="Kosongkan carian"
                                        onClick={() => setKeyword('')}
                                    >
                                        <i className="bi bi-x-lg"></i>
                                    </button>
                                )}
                            </div>
                        </div>
                        <label className="app-filter-field">
                            <span>Kategori Kes</span>
                            <select value={caseType} onChange={(event) => {
                                setCaseType(event.target.value);
                                setPage(1);
                            }}>
                                <option value="AJ">Aduan Jenayah (AJ)</option>
                                <option value="AK">Aduan Keluarga (AK)</option>
                                <option value="">Semua</option>
                            </select>
                        </label>
                    </div>
                </form>
            )}
        >
            {isCreateModalOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeCreateModal}></div>
                    <div className="app-modal-content app-modal-content--wide app-case-create-modal">
                        <div className="app-modal-header">
                            <div>
                                <h4>Tambah Kes</h4>
                                <p>Pilih satu atau lebih aduan AJ untuk dipautkan kepada kes baharu.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeCreateModal} disabled={isCreatingCase}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {createError && <div className="app-form-error">{createError}</div>}
                        <div className="app-case-create-grid">
                            <div className="app-case-create-panel">
                                <div className="app-filter-input app-case-create-search">
                                    <i className="bi bi-search app-filter-input-icon" aria-hidden="true"></i>
                                    <input
                                        type="text"
                                        className="app-filter-keyword-input"
                                        value={complaintKeyword}
                                        onChange={(event) => setComplaintKeyword(event.target.value)}
                                        placeholder="Cari no aduan, nama pengadu atau daerah"
                                    />
                                    {complaintKeyword && (
                                        <button
                                            type="button"
                                            className="app-search-clear"
                                            aria-label="Kosongkan carian aduan"
                                            onClick={() => setComplaintKeyword('')}
                                        >
                                            <i className="bi bi-x-lg"></i>
                                        </button>
                                    )}
                                </div>
                                <div className="app-case-create-results">
                                    {isComplaintSearchLoading && <div className="app-empty">Mencari aduan...</div>}
                                    {!isComplaintSearchLoading && complaintResults.length === 0 && (
                                        <div className="app-empty">Tiada aduan dijumpai.</div>
                                    )}
                                    {!isComplaintSearchLoading && complaintResults.map((complaint) => (
                                        <label
                                            className={`app-case-complaint-option${isComplaintSelected(complaint.id) ? ' active' : ''}`}
                                            key={`case-complaint-option-${complaint.id}`}
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isComplaintSelected(complaint.id)}
                                                onChange={() => toggleComplaintSelection(complaint)}
                                            />
                                            <span className="app-case-complaint-option-main">
                                                <strong>{complaint.reference_no || `Aduan #${complaint.id}`}</strong>
                                                <span>{complaint.complainant_name || '-'}</span>
                                                <small>{complaint.district_name || '-'} | {formatDateTime(`${complaint.complaint_date || ''}T${complaint.complaint_time || '00:00:00'}`)}</small>
                                                {formatExistingComplaintCase(complaint) && (
                                                    <small className="app-case-linked-case-no">{formatExistingComplaintCase(complaint)}</small>
                                                )}
                                            </span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="app-case-create-panel app-case-create-selected">
                                <div className="app-case-create-selected-head">
                                    <strong>Aduan Dipilih</strong>
                                    <span>{selectedComplaints.length} aduan</span>
                                </div>
                                {selectedComplaints.length === 0 ? (
                                    <div className="app-empty">Belum ada aduan dipilih.</div>
                                ) : (
                                    <div className="app-case-create-selected-list">
                                        {selectedComplaints.map((complaint) => (
                                            <div className="app-case-create-selected-item" key={`selected-complaint-${complaint.id}`}>
                                                <div>
                                                    <strong>{complaint.reference_no || `Aduan #${complaint.id}`}</strong>
                                                    <span>{complaint.complainant_name || '-'}</span>
                                                    {formatExistingComplaintCase(complaint) && (
                                                        <small className="app-case-linked-case-no">{formatExistingComplaintCase(complaint)}</small>
                                                    )}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="app-icon-button"
                                                    aria-label="Buang aduan"
                                                    title="Buang aduan"
                                                    onClick={() => toggleComplaintSelection(complaint)}
                                                    disabled={isCreatingCase}
                                                >
                                                    <i className="bi bi-x-lg"></i>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="app-modal-footer">
                            <button type="button" className="app-button app-button-ghost" onClick={closeCreateModal} disabled={isCreatingCase}>
                                Batal
                            </button>
                            <button
                                type="button"
                                className="app-button"
                                onClick={createCaseFromSelection}
                                disabled={isCreatingCase || selectedComplaints.length === 0}
                            >
                                {isCreatingCase ? 'Mencipta Kes...' : 'Cipta Kes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {error && <div className="app-empty">{error}</div>}
            {!error && isLoading && <div className="app-empty">Memuatkan senarai kes...</div>}
            {!error && !isLoading && rows.length === 0 && <div className="app-empty">Tiada rekod kes dijumpai.</div>}
            {!error && !isLoading && rows.length > 0 && (
                <>
                    <div className="app-table app-table-actions app-case-menu-table">
                        <div className="app-table-header">
                            <span>Bil</span>
                            <span>Kes</span>
                            <span>Daerah / Kategori</span>
                            <span>Status / Tangkapan</span>
                            <span>Aduan Linked</span>
                            <span>Tindakan</span>
                        </div>
                        {rows.map((item, index) => (
                            <div className="app-table-row" key={`case-row-${item.id}`}>
                                <span>{startIndex + index}</span>
                                <div className="app-complaint-cell app-case-ref-cell">
                                    <button
                                        type="button"
                                        className="app-link app-link-button app-complaint-cell-link"
                                        onClick={() => {
                                            navigate(`/app/cases/${item.id}`);
                                        }}
                                    >
                                        {item.case_register_no || `KES #${item.id}`}
                                    </button>
                                    {item.file_no && (
                                        <span className="app-complaint-cell-meta">{item.file_no}</span>
                                    )}
                                    <span className="app-complaint-cell-meta">{formatDateTime(item.created_at)}</span>
                                </div>
                                <div className="app-complaint-cell">
                                    <span className="app-complaint-cell-name">{item.district_name || '-'}</span>
                                    <span className="app-complaint-cell-meta">{item.case_type === 'AJ' ? 'Aduan Jenayah (AJ)' : (item.case_type === 'AK' ? 'Aduan Keluarga (AK)' : '-')}</span>
                                </div>
                                <div className="app-complaint-cell">
                                    <span className="app-status-pill">{item.current_status || '-'}</span>
                                    <span className="app-complaint-cell-meta">{formatArrestStatus(item.arrest_status)}</span>
                                    {formatOpStatus(item.op_case_status, item.op_category) && (
                                        <span className="app-complaint-cell-meta app-case-op-status">
                                            {formatOpStatus(item.op_case_status, item.op_category)}
                                        </span>
                                    )}
                                </div>
                                <div className="app-case-linked-wrap">
                                    <strong>{item.complaints_count || 0} aduan</strong>
                                    <div className="app-case-linked-list">
                                        {(Array.isArray(item.complaints) ? item.complaints : []).map((complaint) => (
                                            <button
                                                key={`linked-complaint-${item.id}-${complaint.id}`}
                                                type="button"
                                                className="app-link app-link-button app-case-linked-link"
                                                onClick={() => navigate(`/app/complaints/${complaint.id}`)}
                                                title={[
                                                    complaint.reference_no || `Aduan #${complaint.id}`,
                                                    formatExistingComplaintCase(complaint),
                                                ].filter(Boolean).join(' | ')}
                                            >
                                                {complaint.reference_no || `Aduan #${complaint.id}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div className="app-case-table-actions">
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => navigate(`/app/cases/${item.id}`)}
                                        aria-label="Papar Kes"
                                        title="Papar Kes"
                                    >
                                        <i className="bi bi-pencil-square"></i>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <PaginationBar
                        page={page}
                        lastPage={lastPage}
                        total={total}
                        perPage={perPage}
                        startIndex={startIndex}
                        endIndex={endIndex}
                        onPageChange={setPage}
                        onPerPageChange={(value) => {
                            setPerPage(value);
                            setPage(1);
                        }}
                    />
                </>
            )}
        </ListPageLayout>
    );
};

export default CaseList;
