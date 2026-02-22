import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ComplaintForm from './ComplaintForm';
import ComplainFormPegawai from './complainFormPegawai';
import ConfirmModal from '../../components/SharedConfirmModal';
import { useToast } from '../../components/SharedToastProvider';
import { sortRows } from '../../utils/sort';
import { getComplaintStageLabel, getPublicComplaintStageLabel } from './complaintStage';
import ComplaintListPublicView from './ComplaintListPublicView';
import ComplaintListInternalView from './ComplaintListInternalView';
import ComplaintListDrawer from './ComplaintListDrawer';
import ComplaintListHeader from './ComplaintListHeader';
import ComplaintListFilter from './ComplaintListFilter';

const getIpStatusBadgeTone = (value) => {
    if (!value) {
        return 'is-muted';
    }
    const normalized = String(value).toLowerCase();
    if (normalized.includes('selesai')) {
        return 'is-success';
    }
    if (normalized.startsWith('semakan')) {
        return 'is-warn';
    }
    if (normalized.startsWith('proses')) {
        return 'is-info';
    }
    return 'is-muted';
};

const getProsecutionStatusLabel = (value) => {
    if (!value) {
        return '';
    }
    const normalized = String(value).toLowerCase();
    if (normalized === 'didakwa') {
        return 'Dalam Pendakwaan';
    }
    if (normalized === 'dalam_proses') {
        return 'Dalam Proses';
    }
    if (normalized === 'selesai') {
        return 'Selesai';
    }
    if (normalized === 'kiv') {
        return 'KIV';
    }
    return value;
};

const getProsecutionStatusBadgeTone = (value) => {
    if (!value) {
        return 'is-muted';
    }
    const normalized = String(value).toLowerCase();
    if (normalized === 'selesai') {
        return 'is-success';
    }
    if (normalized === 'didakwa') {
        return 'is-info';
    }
    if (normalized === 'dalam_proses') {
        return 'is-warn';
    }
    if (normalized === 'kiv') {
        return 'is-muted';
    }
    return 'is-muted';
};

const formatChannelLabel = (channel) => {
    const value = (channel || '').toString().trim().toLowerCase();
    if (!value) return '-';
    if (value === 'portal') return 'Portal (Awam)';
    if (value === 'web') return 'Web';
    if (value === 'walkin') return 'Walk-in / Kaunter';
    if (value === 'telefon') return 'Telefon';
    if (value === 'email') return 'Email';
    if (value === 'agensi') return 'Agensi';
    if (value === 'lain') return 'Lain-lain';
    return channel;
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

const ComplaintList = ({
    caseType = '',
    isCase = false,
    title = 'Senarai Aduan',
    description = 'Semak dan urus aduan yang diterima.',
    fetchEndpoint = '',
    enablePickup = false,
    publicMode = null,
}) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const toast = useToast();
    const navigate = useNavigate();
    const [complaints, setComplaints] = useState([]);
    const [quickQuery, setQuickQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const role = localStorage.getItem('role') || 'awam';
    const inferredPublicRole = ['awam', 'user'].includes(role);
    const isPublicRole = typeof publicMode === 'boolean' ? publicMode : inferredPublicRole;
    const canDelete = role === 'pegawai_hq';
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [statusOptions, setStatusOptions] = useState([{ value: '', label: 'Semua' }]);
    const ipStatusOptions = useMemo(() => ([
        { value: '', label: 'Semua' },
        { value: 'Proses Siasatan', label: 'Proses Siasatan' },
        { value: 'Semakan PP (US)', label: 'Semakan PP (US)' },
        { value: 'Semakan KPP', label: 'Semakan KPP' },
        { value: 'Semakan JPSS', label: 'Semakan JPSS' },
        { value: 'Selesai', label: 'Selesai' },
    ]), []);
    const prosecutionStatusOptions = useMemo(() => ([
        { value: '', label: 'Semua' },
        { value: 'dalam_proses', label: 'Dalam Proses' },
        { value: 'didakwa', label: 'Dalam Pendakwaan' },
        { value: 'selesai', label: 'Selesai' },
        { value: 'kiv', label: 'KIV' },
    ]), []);
    const [filters, setFilters] = useState({
        keyword: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
        ipStatus: '',
        prosecutionStatus: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        keyword: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
        ipStatus: '',
        prosecutionStatus: '',
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
    const canInlineEdit = !isPublicRole;
    const canCreateComplaint = isPublicRole || role === 'pegawai' || role === 'admin' || role === 'system';

    const showCaseTabs = !isPublicRole && !caseType && !fetchEndpoint && !isCase;

    const fetchComplaints = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const token = localStorage.getItem('token');
        let endpoint = isPublicRole ? `${apiUrl}/complaints/my` : `${apiUrl}/complaints`;
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
        if (filters.ipStatus) {
            params.ip_status = filters.ipStatus;
        }
        if (filters.prosecutionStatus) {
            params.prosecution_status = filters.prosecutionStatus;
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

    const handlePickup = (complaintId, openDetail = false) => {
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
                if (openDetail) {
                    navigate(`/app/complaints/${complaintId}`);
                }
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

    const syncUpdatedComplaint = (updated) => {
        if (!updated?.id) {
            return;
        }
        setSelectedComplaint((prev) => (prev?.id === updated.id ? { ...prev, ...updated } : prev));
        setComplaints((prev) => prev.map((row) => (row.id === updated.id ? { ...row, ...updated } : row)));
    };

    const saveInlineField = async (fieldName, value) => {
        if (!apiUrl || !selectedComplaint?.id) {
            throw new Error('Aduan tidak ditemui.');
        }
        const token = localStorage.getItem('token');
        const payload = {
            [fieldName]: fieldName === 'district_id' ? (value || null) : value,
        };

        try {
            const response = await axios.post(`${apiUrl}/complaints/${selectedComplaint.id}/basic`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            const updated = response?.data?.data;
            if (updated) {
                syncUpdatedComplaint(updated);
            }
            toast.success(response?.data?.message || 'Maklumat aduan dikemaskini.');
            return updated;
        } catch (err) {
            const msg = err?.response?.data?.message || 'Gagal kemaskini.';
            toast.error(msg);
            throw new Error(msg);
        }
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
            ipStatus: '',
            prosecutionStatus: '',
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
            <ComplaintListHeader
                title={title}
                description={description}
                caseType={caseType}
                canCreateComplaint={canCreateComplaint}
                onOpenForm={() => setIsFormOpen(true)}
                showFilters={showFilters}
                onToggleFilters={() => setShowFilters((prev) => !prev)}
                quickQuery={quickQuery}
                setQuickQuery={setQuickQuery}
                setPage={setPage}
            />

            {showFilters && (
                <ComplaintListFilter
                    isPublicRole={isPublicRole}
                    caseType={caseType}
                    statusOptions={statusOptions}
                    districtOptions={districtOptions}
                    ipStatusOptions={ipStatusOptions}
                    prosecutionStatusOptions={prosecutionStatusOptions}
                    draftFilters={draftFilters}
                    setDraftFilters={setDraftFilters}
                    onSearch={handleSearch}
                    onReset={handleReset}
                />
            )}

            <div className={`app-complaints-body ${selectedComplaint ? 'has-drawer' : ''}`}>
                <div className="app-complaints-main">
                    <div className="app-card app-complaints-card">
                        {isPublicRole ? (
                            <ComplaintListPublicView
                                isLoading={isLoading}
                                error={error}
                                complaints={complaints}
                                sortedComplaints={sortedComplaints}
                                setSelectedComplaint={setSelectedComplaint}
                                getPublicComplaintStageLabel={getPublicComplaintStageLabel}
                                pickupMessage={pickupMessage}
                                actionMessage={actionMessage}
                                pagination={pagination}
                                startIndex={startIndex}
                                endIndex={endIndex}
                                setPage={setPage}
                                setPerPage={setPerPage}
                            />
                        ) : (
                            <ComplaintListInternalView
                                showCaseTabs={showCaseTabs}
                                statusTab={statusTab}
                                setStatusTab={setStatusTab}
                                setPendingApproval={setPendingApproval}
                                setFilters={setFilters}
                                setDraftFilters={setDraftFilters}
                                setPage={setPage}
                                isLoading={isLoading}
                                error={error}
                                complaints={complaints}
                                sortedComplaints={sortedComplaints}
                                selectedComplaint={selectedComplaint}
                                setSelectedComplaint={setSelectedComplaint}
                                sortColumns={sortColumns}
                                sortKey={sortKey}
                                sortDir={sortDir}
                                handleSort={handleSort}
                                getComplaintStageLabel={getComplaintStageLabel}
                                getIpStatusBadgeTone={getIpStatusBadgeTone}
                                getProsecutionStatusBadgeTone={getProsecutionStatusBadgeTone}
                                getProsecutionStatusLabel={getProsecutionStatusLabel}
                                navigate={navigate}
                                canDelete={canDelete}
                                setDeleteTarget={setDeleteTarget}
                                enablePickup={enablePickup}
                                handlePickup={handlePickup}
                                pickupMessage={pickupMessage}
                                actionMessage={actionMessage}
                                pagination={pagination}
                                startIndex={startIndex}
                                endIndex={endIndex}
                                setPerPage={setPerPage}
                            />
                        )}
                    </div>
                </div>

                <ComplaintListDrawer
                    selectedComplaint={selectedComplaint}
                    setSelectedComplaint={setSelectedComplaint}
                    isPublicRole={isPublicRole}
                    getPublicComplaintStageLabel={getPublicComplaintStageLabel}
                    getComplaintStageLabel={getComplaintStageLabel}
                    formatChannelLabel={formatChannelLabel}
                    formatDateTime={formatDateTime}
                    canInlineEdit={canInlineEdit}
                    districtOptions={districtOptions}
                    saveInlineField={saveInlineField}
                />
            </div>
            {isFormOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={() => setIsFormOpen(false)}></div>
                    <div className={`app-modal-content${isPublicRole ? '' : ' app-modal-content--wide'}`}>
                        <div className="app-modal-header">
                            <div>
                                <h4>Tambah Aduan</h4>
                                <p>Lengkapkan maklumat aduan anda.</p>
                            </div>
                            <button className="app-modal-close" onClick={() => setIsFormOpen(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {isPublicRole ? (
                            <ComplaintForm
                                showSuccessMessage={false}
                                channelSource="portal"
                                onSuccess={() => {
                                    setIsFormOpen(false);
                                    fetchComplaints();
                                }}
                            />
                        ) : (
                            <ComplainFormPegawai
                                fixedCaseType={caseType}
                                onSuccess={(created) => {
                                    setIsFormOpen(false);
                                    fetchComplaints();
                                    const createdId = typeof created === 'object' ? created?.id : created;
                                    const createdCaseType = typeof created === 'object' ? created?.caseType : '';
                                    if (createdId) {
                                        if ((createdCaseType || '').toUpperCase() === 'AK') {
                                            navigate(`/app/complaints/${createdId}?step=siasatan`);
                                        } else {
                                            navigate(`/app/complaints/${createdId}`);
                                        }
                                    }
                                }}
                            />
                        )}
                    </div>
                </div>
            )}

        </div>
    );
};

export default ComplaintList;

