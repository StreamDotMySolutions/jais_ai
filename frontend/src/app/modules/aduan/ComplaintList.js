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
import useOffenseOptions from '../../hooks/useOffenseOptions';
import useMahkamahOptions from '../../hooks/useMahkamahOptions';

const getListScope = ({ isPublicRole, fetchEndpoint }) => {
    if (isPublicRole) {
        return 'my';
    }
    if (fetchEndpoint === '/complaints/pending-approval') {
        return 'pending-approval';
    }
    if (fetchEndpoint === '/complaints/pickup-queue') {
        return 'pickup-queue';
    }
    if (fetchEndpoint === '/complaints/my-pic') {
        return 'my-pic';
    }
    return 'index';
};

const parseSearchSyntax = (input) => {
    const raw = (input || '').toString().trim();
    if (!raw) {
        return { text: '', tokens: {} };
    }

    const tokens = {};
    const chunks = [];
    const pattern = /([a-zA-Z_]+):("([^"]+)"|[^\s]+)/g;
    let lastIndex = 0;
    let match;

    while ((match = pattern.exec(raw)) !== null) {
        chunks.push(raw.slice(lastIndex, match.index));
        lastIndex = pattern.lastIndex;

        const key = (match[1] || '').toLowerCase();
        const value = (match[3] || match[2] || '').replace(/^"|"$/g, '').trim();
        if (!value) continue;
        tokens[key] = value;
    }
    chunks.push(raw.slice(lastIndex));

    const text = chunks.join(' ').replace(/\s+/g, ' ').trim();
    return { text, tokens };
};

const parseDateRange = (value) => {
    const raw = (value || '').toString().trim();
    if (!raw) return { from: '', to: '' };
    if (raw.includes('..')) {
        const [from, to] = raw.split('..');
        return { from: (from || '').trim(), to: (to || '').trim() };
    }
    return { from: raw, to: raw };
};

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
    if (value === 'whatsapp') return 'WhatsApp AI';
    if (value === 'whatsapp_web') return 'WhatsApp Web AI';
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

const buildComplaintQueryParams = ({
    filters,
    districtOptions,
    page,
    perPage,
    caseType,
    isCase,
    pendingApproval,
    isPublicRole,
    fetchEndpoint,
}) => {
    const parsedKeyword = parseSearchSyntax(filters.keyword);
    const syntax = parsedKeyword.tokens || {};
    const params = {
        scope: getListScope({ isPublicRole, fetchEndpoint }),
        page,
        per_page: perPage,
    };

    if (parsedKeyword.text) {
        params.keyword = parsedKeyword.text;
    }
    if (filters.complaintNo) {
        params.reference_no = filters.complaintNo;
    } else if (syntax.no_aduan || syntax.reference_no) {
        params.reference_no = syntax.no_aduan || syntax.reference_no;
    }
    if (filters.complainant) {
        params.complainant_name = filters.complainant;
    } else if (syntax.pengadu || syntax.complainant) {
        params.complainant_name = syntax.pengadu || syntax.complainant;
    }
    if (filters.summaryText) {
        params.summary = filters.summaryText;
    } else if (syntax.ringkasan || syntax.summary) {
        params.summary = syntax.ringkasan || syntax.summary;
    }
    if (filters.status) {
        params.status = filters.status;
    } else if (syntax.status) {
        params.status = syntax.status;
    }
    if (filters.district) {
        params.district_id = filters.district;
    } else if (syntax.district || syntax.daerah) {
        const districtToken = (syntax.district || syntax.daerah || '').toString().trim();
        if (/^\d+$/.test(districtToken)) {
            params.district_id = districtToken;
        } else {
            const normalized = districtToken.toLowerCase();
            const district = districtOptions.find((d) => (d?.name || '').toLowerCase().includes(normalized));
            if (district?.id) {
                params.district_id = district.id;
            }
        }
    }
    if (filters.fromDate) {
        params.from_date = filters.fromDate;
    } else if (syntax.from) {
        params.from_date = syntax.from;
    }
    if (filters.toDate) {
        params.to_date = filters.toDate;
    } else if (syntax.to) {
        params.to_date = syntax.to;
    }
    if (filters.ipStatus) {
        params.ip_status = filters.ipStatus;
    }
    if (filters.actionStatus) {
        params.action_status = filters.actionStatus;
    } else if (syntax.action_status || syntax.status_tindakan) {
        params.action_status = syntax.action_status || syntax.status_tindakan;
    }
    if (filters.caseRegisterNo) {
        params.case_register_no = filters.caseRegisterNo;
    } else if (syntax.no_daftar_kes || syntax.case_register_no) {
        params.case_register_no = syntax.no_daftar_kes || syntax.case_register_no;
    }
    if (filters.offenseText) {
        params.offense_id = filters.offenseText;
    } else if (syntax.offense_id) {
        params.offense_id = syntax.offense_id;
    } else if (syntax.kesalahan || syntax.offense) {
        params.offense = syntax.kesalahan || syntax.offense;
    }
    if (filters.reportText) {
        params.report = filters.reportText;
    } else if (syntax.laporan || syntax.report) {
        params.report = syntax.laporan || syntax.report;
    }
    if (filters.oydText) {
        params.oyd = filters.oydText;
    } else if (syntax.oyd || syntax.maklumat_oyds) {
        params.oyd = syntax.oyd || syntax.maklumat_oyds;
    }
    if (filters.courtDate) {
        params.court_date = filters.courtDate;
    } else if (syntax.tarikh_sebutan || syntax.court_date) {
        params.court_date = syntax.tarikh_sebutan || syntax.court_date;
    }
    if (filters.investigationNotes) {
        params.investigation_notes = filters.investigationNotes;
    } else if (syntax.catatan_siasatan || syntax.investigation_notes) {
        params.investigation_notes = syntax.catatan_siasatan || syntax.investigation_notes;
    }
    if (filters.courtText) {
        params.mahkamah_id = filters.courtText;
    } else if (syntax.mahkamah_id) {
        params.mahkamah_id = syntax.mahkamah_id;
    } else if (syntax.mahkamah || syntax.court) {
        params.mahkamah = syntax.mahkamah || syntax.court;
    }
    if (filters.modifiedDate) {
        params.modified_date = filters.modifiedDate;
    } else if (syntax.modified_date || syntax.modified_time) {
        params.modified_date = syntax.modified_date || syntax.modified_time;
    }
    if (filters.modifiedUser) {
        params.modified_user = filters.modifiedUser;
    } else if (syntax.modified_user || syntax.user_kemaskini) {
        params.modified_user = syntax.modified_user || syntax.user_kemaskini;
    }
    if (filters.prosecutionStatus) {
        params.prosecution_status = filters.prosecutionStatus;
    }
    if (filters.classification) {
        params.classification = filters.classification;
    } else if (syntax.classification || syntax.klasifikasi) {
        params.classification = (syntax.classification || syntax.klasifikasi || '').toUpperCase();
    }
    if (filters.receiver) {
        params.received_by = filters.receiver;
    } else if (syntax.receiver || syntax.penerima) {
        params.received_by = syntax.receiver || syntax.penerima;
    }
    if (filters.approver) {
        params.approver = filters.approver;
    } else if (syntax.approver || syntax.pengesah) {
        params.approver = syntax.approver || syntax.pengesah;
    }
    if (filters.channel) {
        params.channel = filters.channel;
    } else if (syntax.channel || syntax.kaedah) {
        params.channel = (syntax.channel || syntax.kaedah || '').toLowerCase();
    }
    if (filters.incidentFromDate) {
        params.incident_from_date = filters.incidentFromDate;
    } else if (syntax.incident_from) {
        params.incident_from_date = syntax.incident_from;
    }
    if (filters.incidentToDate) {
        params.incident_to_date = filters.incidentToDate;
    } else if (syntax.incident_to) {
        params.incident_to_date = syntax.incident_to;
    }
    if (!filters.fromDate && !filters.toDate && syntax.date) {
        const r = parseDateRange(syntax.date);
        if (r.from) params.from_date = r.from;
        if (r.to) params.to_date = r.to;
    }
    if (!filters.incidentFromDate && !filters.incidentToDate && (syntax.incident || syntax.kejadian)) {
        const r = parseDateRange(syntax.incident || syntax.kejadian);
        if (r.from) params.incident_from_date = r.from;
        if (r.to) params.incident_to_date = r.to;
    }
    if (caseType) {
        params.case_type = caseType;
    } else if (syntax.case || syntax.case_type || syntax.kategori) {
        params.case_type = (syntax.case || syntax.case_type || syntax.kategori || '').toUpperCase();
    }
    if (isCase) {
        params.is_case = true;
        params.status = 'disahkan';
    }
    if (pendingApproval) {
        params.pending_approval = 1;
    }

    return params;
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
    const { items: offenseItems } = useOffenseOptions({ apiUrl });
    const { items: mahkamahItems } = useMahkamahOptions({ apiUrl, token: localStorage.getItem('token') });
    const [complaints, setComplaints] = useState([]);
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
    const actionStatusOptions = useMemo(() => ([
        { value: '', label: 'Semua' },
        { value: 'Selesai Dengan Kes', label: 'Selesai Dengan Kes' },
        { value: 'Selesai Tanpa Kes', label: 'Selesai Tanpa Kes' },
        { value: 'KIV - Dalam siasatan', label: 'KIV - Dalam siasatan' },
        { value: 'NFA - Melebihi 10 hari', label: 'NFA - Melebihi 10 hari' },
        { value: 'NFA - Maklumat Palsu', label: 'NFA - Maklumat Palsu' },
        { value: 'Belum menerima maklum balas', label: 'Belum menerima maklum balas' },
        { value: 'Other', label: 'Other' },
    ]), []);
    const prosecutionStatusOptions = useMemo(() => ([
        { value: '', label: 'Semua' },
        { value: 'dalam_proses', label: 'Dalam Proses' },
        { value: 'didakwa', label: 'Dalam Pendakwaan' },
        { value: 'selesai', label: 'Selesai' },
        { value: 'kiv', label: 'KIV' },
    ]), []);
    const offenseOptions = useMemo(() => (
        (offenseItems || []).map((item) => ({
            value: String(item.id),
            label: [item.section, item.name].filter(Boolean).join(' - '),
        }))
    ), [offenseItems]);
    const mahkamahOptions = useMemo(() => (
        (mahkamahItems || []).map((item) => ({
            value: String(item.id),
            label: item.nama || '',
        }))
    ), [mahkamahItems]);
    const [filters, setFilters] = useState({
        keyword: '',
        complaintNo: '',
        complainant: '',
        summaryText: '',
        caseRegisterNo: '',
        offenseText: '',
        reportText: '',
        oydText: '',
        courtDate: '',
        investigationNotes: '',
        courtText: '',
        modifiedDate: '',
        modifiedUser: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
        actionStatus: '',
        ipStatus: '',
        prosecutionStatus: '',
        classification: '',
        receiver: '',
        approver: '',
        channel: '',
        incidentFromDate: '',
        incidentToDate: '',
    });
    const [draftFilters, setDraftFilters] = useState({
        keyword: '',
        complaintNo: '',
        complainant: '',
        summaryText: '',
        caseRegisterNo: '',
        offenseText: '',
        reportText: '',
        oydText: '',
        courtDate: '',
        investigationNotes: '',
        courtText: '',
        modifiedDate: '',
        modifiedUser: '',
        status: '',
        district: '',
        fromDate: '',
        toDate: '',
        actionStatus: '',
        ipStatus: '',
        prosecutionStatus: '',
        classification: '',
        receiver: '',
        approver: '',
        channel: '',
        incidentFromDate: '',
        incidentToDate: '',
    });
    const [showFilters, setShowFilters] = useState(true);
    const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
    const [pickupMessage, setPickupMessage] = useState('');
    const [actionMessage, setActionMessage] = useState('');
    const [isExporting, setIsExporting] = useState(false);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [statusTab, setStatusTab] = useState('all');
    const [timeTick, setTimeTick] = useState(Date.now());
    const [pendingApproval, setPendingApproval] = useState(false);
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [expandedComplaintIds, setExpandedComplaintIds] = useState([]);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [selectedComplaint, setSelectedComplaint] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const canInlineEdit = !isPublicRole;
    const normalizedCaseType = (caseType || '').toUpperCase();
    const canCreateAjComplaintByRole = ['pegawai_hq', 'pegawai', 'admin', 'system'].includes(role);
    const canCreateAkComplaintByRole = ['pegawai_daerah', 'pegawai_hq', 'pegawai', 'admin', 'system'].includes(role);
    const canCreateComplaint = isPublicRole || (
        normalizedCaseType === 'AJ'
            ? canCreateAjComplaintByRole
            : normalizedCaseType === 'AK'
                ? canCreateAkComplaintByRole
                : (canCreateAjComplaintByRole || canCreateAkComplaintByRole)
    );
    const createFixedCaseType = normalizedCaseType || (role === 'pegawai_daerah' ? 'AK' : '');

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

        const params = buildComplaintQueryParams({
            filters,
            districtOptions,
            page,
            perPage,
            caseType,
            isCase,
            pendingApproval,
            isPublicRole,
            fetchEndpoint,
        });

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
            .then((response) => {
                const msg = response?.data?.message || 'Aduan berjaya diambil.';
                setPickupMessage(msg);
                toast.success(msg);
                fetchComplaints();
                if (openDetail) {
                    navigate(`/app/complaints/${complaintId}`);
                }
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal ambil aduan.';
                setPickupMessage(msg);
                toast.error(msg);
            });
    };

    const handleExportExcel = async () => {
        if (!apiUrl) {
            toast.error('API URL tidak diset.');
            return;
        }

        const token = localStorage.getItem('token');
        setIsExporting(true);

        try {
            const response = await axios.get(`${apiUrl}/complaints/export/xlsx`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params: buildComplaintQueryParams({
                    filters,
                    districtOptions,
                    page,
                    perPage,
                    caseType,
                    isCase,
                    pendingApproval,
                    isPublicRole,
                    fetchEndpoint,
                }),
                responseType: 'blob',
            });

            const disposition = response?.headers?.['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `aduan-export-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.xlsx`;
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Export Excel berjaya dijana.');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Gagal export Excel.';
            toast.error(msg);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        const timer = window.setInterval(() => setTimeTick(Date.now()), 60 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    const getClassificationAlert = (item) => {
        if (!item || item.case_type !== 'AJ') return null;
        const classification = String(item.aj_ppa_classification || '').toUpperCase();
        if (classification !== 'KIV' && classification !== 'NFA') return null;

        const datePart = (item.complaint_date || '').toString().trim();
        if (!datePart) return { text: `${classification} dipilih`, tone: 'is-warn', blink: false };

        const rawTime = (item.complaint_time || '').toString().trim();
        const timePart = rawTime ? (rawTime.split(':').length >= 3 ? rawTime : `${rawTime}:00`) : '00:00:00';
        const submittedAt = new Date(`${datePart}T${timePart}`);
        if (Number.isNaN(submittedAt.getTime())) return { text: `${classification} dipilih`, tone: 'is-warn', blink: false };

        if (classification === 'KIV') {
            const deadline = new Date(submittedAt.getTime() + (10 * 24 * 60 * 60 * 1000));
            const remainingMs = deadline.getTime() - timeTick;
            const dayMs = 24 * 60 * 60 * 1000;

            if (remainingMs <= 0) {
                return { text: 'KIV tamat (auto NFA)', tone: 'is-danger', blink: true };
            }

            const daysLeft = Math.ceil(remainingMs / dayMs);
            if (daysLeft <= 8) {
                return { text: `KIV: ${daysLeft} hari lagi`, tone: 'is-danger', blink: true };
            }

            return { text: `KIV: ${daysLeft} hari lagi`, tone: 'is-warn', blink: false };
        }

        const nfaDeadline = new Date(submittedAt.getTime() + (24 * 60 * 60 * 1000));
        const remainingMs = nfaDeadline.getTime() - timeTick;
        if (remainingMs <= 0) {
            return { text: 'NFA tamat (24 jam)', tone: 'is-danger', blink: true };
        }
        const totalMinutes = Math.ceil(remainingMs / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        const text = `NFA: ${hours}j ${minutes}m lagi`;
        if (remainingMs <= (6 * 60 * 60 * 1000)) {
            return { text, tone: 'is-warn', blink: true };
        }
        return { text, tone: 'is-info', blink: false };
    };

    useEffect(() => {
        fetchComplaints();
    }, [apiUrl, role, fetchEndpoint, caseType, isCase, page, perPage, filters, pendingApproval]);

    useEffect(() => {
        setPage(1);
        setSelectedComplaint(null);
        setExpandedComplaintIds([]);
    }, [role, fetchEndpoint, caseType, isCase]);

    const sortColumns = [
        { key: 'row_no', label: 'Bil', sortable: false },
        { key: 'aduan', label: 'Aduan', sortable: false },
        { key: 'lokasi', label: 'Daerah / Kategori', sortable: false },
        { key: 'status_group', label: 'Status / Tindakan', sortable: false },
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
        aj_current_status: (item) => item.aj_current_status || '',
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

    const toggleExpandedComplaint = (complaintId) => {
        setExpandedComplaintIds((prev) => (
            prev.includes(complaintId)
                ? prev.filter((id) => id !== complaintId)
                : [...prev, complaintId]
        ));
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
            complaintNo: '',
            complainant: '',
            summaryText: '',
            caseRegisterNo: '',
            offenseText: '',
            reportText: '',
            oydText: '',
            courtDate: '',
            investigationNotes: '',
            courtText: '',
            modifiedDate: '',
            modifiedUser: '',
            status: '',
            district: '',
            fromDate: '',
            toDate: '',
            ipStatus: '',
            prosecutionStatus: '',
            classification: '',
            receiver: '',
            approver: '',
            channel: '',
            incidentFromDate: '',
            incidentToDate: '',
            actionStatus: '',
        };
        setDraftFilters(empty);
        setFilters(empty);
        setStatusTab('all');
        setPendingApproval(false);
        setPage(1);
    };

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <div className="app-complaints app-aduan-list">
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
                onExportExcel={handleExportExcel}
                isExporting={isExporting}
            />

            {showFilters && (
                <ComplaintListFilter
                    isPublicRole={isPublicRole}
                    caseType={caseType}
                    statusOptions={statusOptions}
                    districtOptions={districtOptions}
                    actionStatusOptions={actionStatusOptions}
                    ipStatusOptions={ipStatusOptions}
                    prosecutionStatusOptions={prosecutionStatusOptions}
                    offenseOptions={offenseOptions}
                    mahkamahOptions={mahkamahOptions}
                    draftFilters={draftFilters}
                    setDraftFilters={setDraftFilters}
                    onSearch={handleSearch}
                    onReset={handleReset}
                    advancedOpen={advancedFiltersOpen}
                    setAdvancedOpen={setAdvancedFiltersOpen}
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
                                getClassificationAlert={getClassificationAlert}
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
                                expandedComplaintIds={expandedComplaintIds}
                                toggleExpandedComplaint={toggleExpandedComplaint}
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
                                fixedCaseType={createFixedCaseType}
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

