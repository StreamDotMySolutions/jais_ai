import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';
import SharedStaffSelect from '../../components/SharedStaffSelect';
import SharedInlineAlert from '../../components/SharedInlineAlert';
import OydAttachmentSection from '../../components/OydAttachmentSection';
import SeizureAttachmentSection from '../../components/SeizureAttachmentSection';
import { useToast } from '../../components/SharedToastProvider';
import { isMaintenanceOverrideRole } from '../../utils/maintenanceOverride';

const emptySeizureItem = { item_no: '', description: '', storage: '' };
const emptyPoliceReport = { report_no: '', description: '', station: '' };
const emptyOyd = { name: '', id_number: '', investigator_name: '', file_no: '' };
const emptyInspectionForm = { form_no: '' };

const CASE_OP_CATEGORY_OPTIONS = [
    'PP Unit Gerakan',
    'PP Unit Perundangan & Kesalahan',
    'Other',
];

const CASE_OP_STATUS_OPTIONS = [
    'Siasatan Pegawai Penyiasat',
    'Dalam pemantauan / siasatan',
    'Selesai - Tangkapan dan Proses biasa',
    'Selesai - Minit KPP untuk ditutup',
    'Selesai - Dipanjangkan aduan ke Bahagian lain',
    'Selesai - Tiada bidangkuasa',
    'Selesai - Tiada alasan mencukupi untuk bertindak',
    'Other',
];

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

const formatAuditUser = (user) => user?.name || '-';

const normalizeDateTimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const getLinkedComplaintCaseLabel = (complaint, caseRecord) => {
    const complaintCaseNo = String(complaint?.case_register_no || '').trim();
    const currentCaseNo = String(caseRecord?.case_register_no || '').trim();
    if (currentCaseNo) return `No Kes: ${currentCaseNo}`;
    if (complaintCaseNo) return `No Kes: ${complaintCaseNo}`;
    return '';
};

const getOtherCaseComplaints = (caseRecord) => {
    const currentCaseNo = String(caseRecord?.case_register_no || '').trim();
    return (Array.isArray(caseRecord?.complaints) ? caseRecord.complaints : []).filter((complaint) => {
        const complaintCaseNo = String(complaint?.case_register_no || '').trim();
        return complaintCaseNo && complaintCaseNo !== currentCaseNo;
    });
};

const CaseDetail = () => {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const role = String(localStorage.getItem('role') || '').trim().toLowerCase();
    const canViewAudit = ['admin', 'system'].includes(role);
    const toast = useToast();
    const isMaintenanceOverride = isMaintenanceOverrideRole(role);
    const isDraft = !id || id === 'new';
    const draftComplaintId = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('complaint_id') || '';
    }, [location.search]);
    const isStandaloneDraft = isDraft && !draftComplaintId;
    const [caseRecord, setCaseRecord] = useState(null);
    const [form, setForm] = useState({
        district_id: '',
        file_no: '',
        report_offense_id: '',
        arrest_staff_id: '',
        current_status: '',
        op_category: '',
        op_case_status: '',
        op_notes: '',
        arrest_status: '',
        arrest_by: '',
        male_count: '',
        female_count: '',
        other_count: '',
        action_datetime: '',
        statement_datetime: '',
        court_date: '',
        case_summary: '',
        report_notes: '',
        oyds: [emptyOyd],
        inspection_form_status: '',
        inspection_forms: [emptyInspectionForm],
        seizure_status: '',
        seizure_items: [emptySeizureItem],
        police_report_status: '',
        police_reports: [emptyPoliceReport],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [validationErrors, setValidationErrors] = useState({});
    const [isLinkPanelOpen, setIsLinkPanelOpen] = useState(false);
    const [complaintKeyword, setComplaintKeyword] = useState('');
    const [complaintResults, setComplaintResults] = useState([]);
    const [isComplaintSearchLoading, setIsComplaintSearchLoading] = useState(false);
    const [isLinkingComplaint, setIsLinkingComplaint] = useState(false);
    const [linkError, setLinkError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);
    const otherCaseComplaints = useMemo(() => getOtherCaseComplaints(caseRecord), [caseRecord]);
    const linkedComplaintIds = useMemo(() => new Set(
        (Array.isArray(caseRecord?.complaints) ? caseRecord.complaints : []).map((complaint) => Number(complaint.id))
    ), [caseRecord]);
    const selectedDraftDistrictName = useMemo(() => {
        const selected = (districtOptions || []).find((district) => String(district.id) === String(form.district_id || caseRecord?.district_id || ''));
        return selected?.name || caseRecord?.district_name || '';
    }, [districtOptions, form.district_id, caseRecord]);

    const hydrateForm = (data) => {
        setValidationErrors({});
        setForm({
            district_id: data?.district_id ? String(data.district_id) : '',
            file_no: data?.file_no || '',
            report_offense_id: data?.report_offense_id ? String(data.report_offense_id) : '',
            arrest_staff_id: data?.arrest_staff_id ? String(data.arrest_staff_id) : '',
            current_status: data?.current_status || '',
            op_category: data?.op_category || '',
            op_case_status: data?.op_case_status || '',
            op_notes: data?.op_notes || '',
            arrest_status: data?.arrest_status || '',
            arrest_by: data?.arrest_by || '',
            male_count: data?.male_count ?? '',
            female_count: data?.female_count ?? '',
            other_count: data?.other_count ?? '',
            action_datetime: normalizeDateTimeLocal(data?.action_datetime),
            statement_datetime: normalizeDateTimeLocal(data?.statement_datetime),
            court_date: data?.court_date || '',
            case_summary: data?.case_summary || '',
            report_notes: data?.report_notes || '',
            oyds: Array.isArray(data?.oyds) && data.oyds.length ? data.oyds : [emptyOyd],
            inspection_form_status: data?.inspection_form_status || '',
            inspection_forms: Array.isArray(data?.inspection_forms) && data.inspection_forms.length ? data.inspection_forms : [emptyInspectionForm],
            seizure_status: data?.seizure_status || '',
            seizure_items: Array.isArray(data?.seizure_items) && data.seizure_items.length ? data.seizure_items : [emptySeizureItem],
            police_report_status: data?.police_report_status || '',
            police_reports: Array.isArray(data?.police_reports) && data.police_reports.length ? data.police_reports : [emptyPoliceReport],
        });
    };

    const loadCase = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        if (isDraft) {
            if (!draftComplaintId) {
                if (!isMaintenanceOverride) {
                    setError('Fungsi Kes tanpa Aduan hanya dibenarkan untuk role admin/system.');
                    setIsLoading(false);
                    return;
                }
                const draftCase = {
                    id: null,
                    case_type: 'AJ',
                    case_register_no: '',
                    district_id: null,
                    district_name: '',
                    complaints: [],
                    oyds: [emptyOyd],
                    seizure_items: [emptySeizureItem],
                    police_reports: [emptyPoliceReport],
                };
                setCaseRecord(draftCase);
                hydrateForm(draftCase);
                setError('');
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            axios.get(`${apiUrl}/complaints/${draftComplaintId}`, { headers })
                .then((response) => {
                    const complaint = response?.data?.data || null;
                    if (!complaint) {
                        setError('Aduan tidak dijumpai.');
                        return;
                    }
                    const draftCase = {
                        id: null,
                        case_type: complaint.case_type || 'AJ',
                        case_register_no: '',
                        district_id: complaint.district_id || null,
                        district_name: complaint.district_name || '',
                        complaints: [complaint],
                        oyds: [emptyOyd],
                        seizure_items: [emptySeizureItem],
                        police_reports: [emptyPoliceReport],
                        report_offense_id: complaint.aj_report_offense_id || complaint.aj_offense_id || complaint.offense_id || '',
                    };
                    setCaseRecord(draftCase);
                    hydrateForm(draftCase);
                    setError('');
                })
                .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan aduan untuk kes baharu.'))
                .finally(() => setIsLoading(false));
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/cases/${id}`, { headers })
            .then((response) => {
                const data = response?.data?.data || null;
                setCaseRecord(data);
                hydrateForm(data);
                setError('');
            })
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan kes.'))
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadCase();
    }, [apiUrl, id, draftComplaintId, isMaintenanceOverride]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/districts`)
            .then((response) => {
                const data = Array.isArray(response?.data?.data) ? response.data.data : [];
                setDistrictOptions(data);
            })
            .catch(() => {
                setDistrictOptions([]);
            });
    }, [apiUrl]);

    useEffect(() => {
        if (!isLinkPanelOpen || !caseRecord) {
            return undefined;
        }
        const timer = setTimeout(() => {
            if (!apiUrl) {
                setLinkError('API URL tidak diset.');
                return;
            }

            setIsComplaintSearchLoading(true);
            setLinkError('');
            axios.get(`${apiUrl}/complaints`, {
                headers,
                params: {
                    case_type: caseRecord?.case_type || 'AJ',
                    keyword: complaintKeyword.trim() || undefined,
                    per_page: 12,
                },
            })
                .then((response) => {
                    setComplaintResults(Array.isArray(response?.data?.data) ? response.data.data : []);
                })
                .catch((err) => {
                    setLinkError(err?.response?.data?.message || 'Gagal mencari aduan.');
                })
                .finally(() => {
                    setIsComplaintSearchLoading(false);
                });
        }, 300);
        return () => clearTimeout(timer);
    }, [apiUrl, headers, isLinkPanelOpen, complaintKeyword, caseRecord]);

    const linkComplaintToCase = (complaintId) => {
        if (!apiUrl || !complaintId || isLinkingComplaint || isDraft) {
            return;
        }

        setIsLinkingComplaint(true);
        setLinkError('');
        axios.post(`${apiUrl}/complaints/${complaintId}/cases/${id}/attach`, {}, { headers })
            .then((response) => {
                const msg = response?.data?.message || 'Aduan berjaya dipautkan ke kes ini.';
                setMessage(msg);
                toast.success(msg);
                setComplaintResults([]);
                setComplaintKeyword('');
                loadCase();
            })
            .catch((err) => {
                setLinkError(err?.response?.data?.message || 'Gagal memaut aduan ke kes ini.');
            })
            .finally(() => {
                setIsLinkingComplaint(false);
            });
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        setValidationErrors((prev) => {
            if (!prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
    };

    const getRequiredValidationErrors = () => {
        const nextErrors = {};
        if (!form.arrest_status) {
            nextErrors.arrest_status = 'Status tangkapan wajib dipilih.';
        }
        if (isStandaloneDraft && !form.district_id) {
            nextErrors.district_id = 'Daerah wajib dipilih.';
        }
        if (!form.action_datetime) {
            nextErrors.action_datetime = 'Tarikh / Masa wajib diisi.';
        }
        if (!form.arrest_staff_id) {
            nextErrors.arrest_staff_id = 'Pegawai penangkap wajib dipilih.';
        }
        if (!String(form.report_notes || '').trim()) {
            nextErrors.report_notes = 'Laporan / Catatan Kes wajib diisi.';
        }
        return nextErrors;
    };

    const buildCaseSummaryTemplate = (arrestStatus) => {
        const normalizedStatus = String(arrestStatus || '').trim().toLowerCase();

        if (normalizedStatus === 'tiada') {
            return 'ANGGOTA PPA TELAH MELAKSANAKAN TINDAKAN ADUAN KE PREMIS/LOKASI KEJADIAN DAN HASIL PEMERIKSAAN MENDAPATI TIADA BERLAKU PELANGGARAN KESALAHAN DI BAWAH ENAKMEN JENAYAH SYARIAH (SELANGOR) NO.9 TAHUN 1995.';
        }

        if (normalizedStatus === 'ada') {
            return 'ANGGOTA PPA TELAH MELAKSANAKAN TINDAKAN ADUAN KE PREMIS/LOKASI KEJADIAN DAN HASIL PEMERIKSAAN MENDAPATI ADA BERLAKU PELANGGARAN KESALAHAN ENAKMEN JENAYAH SYARIAH (SELANGOR) NO.9 TAHUN 1995.';
        }

        return '';
    };

    const applyCaseSummaryTemplate = (arrestStatus = form.arrest_status, { confirmOverwrite = true, showToast = true } = {}) => {
        const nextText = buildCaseSummaryTemplate(arrestStatus);
        if (!nextText) {
            toast.error('Sila pilih Status Tangkapan dahulu.');
            return;
        }

        const existing = String(form.case_summary || '').trim();
        if (confirmOverwrite && existing && existing !== nextText) {
            const ok = window.confirm('Ringkasan KES akan diganti mengikut Status Tangkapan. Teruskan?');
            if (!ok) return;
        }

        setForm((prev) => ({ ...prev, arrest_status: arrestStatus, case_summary: nextText }));
        if (showToast) {
            toast.success('Ringkasan KES dimasukkan.');
        }
    };

    const handleArrestStatusChange = (nextStatus) => {
        const nextText = buildCaseSummaryTemplate(nextStatus);
        if (!nextText) {
            updateField('arrest_status', nextStatus);
            return;
        }

        const existing = String(form.case_summary || '').trim();
        if (existing && existing !== nextText) {
            const ok = window.confirm('Ringkasan KES akan diganti mengikut Status Tangkapan. Teruskan?');
            if (!ok) {
                return;
            }
        }

        setForm((prev) => ({
            ...prev,
            arrest_status: nextStatus,
            case_summary: nextText,
        }));
    };

    const updateArrayRow = (field, index, key, value) => {
        setForm((prev) => {
            const rows = [...(prev[field] || [])];
            rows[index] = { ...rows[index], [key]: value };
            return { ...prev, [field]: rows };
        });
    };

    const mergeArrayRow = (field, index, patch) => {
        setForm((prev) => {
            const rows = [...(prev[field] || [])];
            rows[index] = { ...rows[index], ...patch };
            return { ...prev, [field]: rows };
        });
    };

    const addArrayRow = (field, emptyRow) => {
        setForm((prev) => ({ ...prev, [field]: [...(prev[field] || []), { ...emptyRow }] }));
    };

    const removeArrayRow = (field, index, emptyRow) => {
        setForm((prev) => {
            const rows = (prev[field] || []).filter((_, itemIndex) => itemIndex !== index);
            return { ...prev, [field]: rows.length ? rows : [{ ...emptyRow }] };
        });
    };

    const saveCase = () => {
        if (!apiUrl) return;
        const nextValidationErrors = getRequiredValidationErrors();
        if (Object.keys(nextValidationErrors).length) {
            setValidationErrors(nextValidationErrors);
            const firstMessage = Object.values(nextValidationErrors)[0];
            setError(firstMessage);
            toast.error(firstMessage);
            return;
        }
        setIsSaving(true);
        setMessage('');
        setError('');
        setValidationErrors({});
        const payload = {
            ...form,
            report_offense_id: form.report_offense_id || null,
            arrest_staff_id: form.arrest_staff_id || null,
            district_id: form.district_id || null,
            inspection_forms: form.inspection_form_status === 'ada' ? form.inspection_forms : [],
        };
        if (isStandaloneDraft && !isMaintenanceOverride) {
            setError('Fungsi Kes tanpa Aduan hanya dibenarkan untuk role admin/system.');
            setIsSaving(false);
            return;
        }
        const request = isDraft
            ? (
                draftComplaintId
                    ? axios.post(`${apiUrl}/complaints/${draftComplaintId}/cases`, payload, { headers })
                    : axios.post(`${apiUrl}/cases/standalone`, payload, { headers })
            )
            : axios.put(`${apiUrl}/cases/${id}`, payload, { headers });

        request
            .then((response) => {
                const data = isDraft
                    ? (response?.data?.meta?.primary_case || response?.data?.data?.primary_case || response?.data?.data)
                    : response?.data?.data;
                setCaseRecord(data);
                hydrateForm(data);
                setValidationErrors({});
                const autoEmailSent = Boolean(response?.data?.meta?.laporan_tindakan_auto_email?.sent);
                const msg = autoEmailSent
                    ? 'Maklumat kes berjaya disimpan dan emel Laporan Tindakan berjaya dihantar.'
                    : (response?.data?.message || (isDraft ? 'Kes baharu berjaya disimpan.' : 'Maklumat kes berjaya dikemaskini.'));
                setMessage(msg);
                toast.success(msg);
                if (isDraft && data?.id) {
                    navigate(`/app/cases/${data.id}`, { replace: true });
                }
            })
            .catch((err) => {
                const errors = err?.response?.data?.errors;
                const firstError = errors ? Object.values(errors)?.[0]?.[0] : '';
                if (errors && typeof errors === 'object') {
                    setValidationErrors((prev) => ({ ...prev, ...errors }));
                }
                setError(firstError || err?.response?.data?.message || 'Gagal simpan kes.');
            })
            .finally(() => setIsSaving(false));
    };

    const ensureChildRow = async (field, index, endpoint, payloadKeys) => {
        if (isDraft) {
            toast.error('Simpan kes dahulu sebelum muat naik lampiran.');
            return null;
        }
        const row = form[field]?.[index] || {};
        if (row.id) return row.id;

        const payload = {};
        payloadKeys.forEach((key) => {
            payload[key] = row[key] || '';
        });

        const response = await axios.post(`${apiUrl}/cases/${id}/${endpoint}`, payload, { headers });
        const created = response?.data?.data || {};
        if (created?.id) {
            mergeArrayRow(field, index, created);
            return created.id;
        }
        return null;
    };

    const updateRowAttachments = (field, index, updater) => {
        setForm((prev) => {
            const rows = [...(prev[field] || [])];
            const current = Array.isArray(rows[index]?.media) ? rows[index].media : [];
            const media = typeof updater === 'function' ? updater(current) : updater;
            rows[index] = { ...rows[index], media };
            return { ...prev, [field]: rows };
        });
    };

    if (isLoading) {
        return <div className="app-empty">Memuatkan maklumat kes...</div>;
    }

    if (error && !caseRecord) {
        return <div className="app-empty">{error}</div>;
    }

    return (
        <div className="app-detail app-case-detail">
            <div className="app-detail-header">
                <div className="app-detail-header-block">
                    <button
                        type="button"
                        className="app-back app-back-button"
                        onClick={() => navigate(isDraft && draftComplaintId ? `/app/complaints/${draftComplaintId}` : '/app/cases')}
                    >
                        <i className="bi bi-arrow-left"></i>
                        {isDraft ? 'Kembali ke Aduan' : 'Kembali ke Senarai'}
                    </button>
                    <span className="app-detail-kicker">No Kes</span>
                    <div className="app-detail-number">
                        <div className="app-detail-number-main">
                            <h6>{isDraft ? 'Kes Baharu (Belum Disimpan)' : (caseRecord?.case_register_no || `KES #${id}`)}</h6>
                            <div className="app-detail-status-row">
                                <span className="app-detail-status-label">Daerah :</span>
                                <span className="app-status-pill">
                                    {selectedDraftDistrictName || '-'} | {caseRecord?.case_type === 'AJ' ? 'Aduan Jenayah (AJ)' : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {message && <SharedInlineAlert type="success" message={message} dismissible onClose={() => setMessage('')} />}
            {error && <SharedInlineAlert type="error" message={error} dismissible onClose={() => setError('')} />}
            {isDraft && (
                <SharedInlineAlert
                    type="info"
                    message={
                        isStandaloneDraft
                            ? 'No. daftar kes akan dijana selepas Simpan Kes. Draf ini boleh dibuat tanpa aduan dan anda boleh pautkan aduan kemudian jika perlu.'
                            : 'No. daftar kes hanya akan dijana selepas Simpan Kes. Jika keluar tanpa simpan, tiada rekod kes akan dibuat.'
                    }
                />
            )}
            {otherCaseComplaints.length > 0 && (
                <SharedInlineAlert type="warning">
                    <div className="app-case-existing-alert">
                        <strong>Aduan berkaitan mempunyai kes sedia ada.</strong>
                        <span>Form ini hanya memaparkan dan menyimpan maklumat untuk {caseRecord?.case_register_no || `KES #${id}`}. Maklumat tindakan daripada kes sedia ada tidak ditarik semula secara automatik.</span>
                        <div className="app-case-existing-alert-list">
                            {otherCaseComplaints.map((complaint) => (
                                <span key={`case-existing-alert-${complaint.id}`}>
                                    {complaint.reference_no || `Aduan #${complaint.id}`} - {complaint.case_register_no}
                                </span>
                            ))}
                        </div>
                    </div>
                </SharedInlineAlert>
            )}

            <section className="app-card app-case-related-card">
                <div className="app-case-related-head">
                    <h4>Aduan Berkaitan</h4>
                    {!isDraft && (
                        <button
                            type="button"
                            className="app-button app-button-ghost app-button-sm"
                            onClick={() => {
                                setIsLinkPanelOpen((prev) => !prev);
                                setLinkError('');
                            }}
                        >
                            <i className={`bi ${isLinkPanelOpen ? 'bi-x-lg' : 'bi-link-45deg'}`}></i>
                            {isLinkPanelOpen ? 'Tutup' : 'Paut Aduan'}
                        </button>
                    )}
                </div>
                {isMaintenanceOverride && !isDraft && (
                    <SharedInlineAlert
                        type="info"
                        message="Mode penyelenggaraan aktif untuk role admin/system. Lock workflow KES yang berkaitan maintenance dibenarkan."
                    />
                )}
                {isLinkPanelOpen && (
                    <div className="app-case-link-panel">
                        <div className="app-case-link-panel-head">
                            <strong>Paut aduan ke kes ini</strong>
                            <button
                                type="button"
                                className="app-icon-button"
                                aria-label="Tutup paut aduan"
                                title="Tutup"
                                onClick={() => {
                                    setIsLinkPanelOpen(false);
                                    setComplaintKeyword('');
                                    setComplaintResults([]);
                                    setLinkError('');
                                }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {linkError && <div className="app-form-error">{linkError}</div>}
                        <div className="app-filter-input app-case-link-search">
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
                        <div className="app-case-link-results">
                            {isComplaintSearchLoading && <div className="app-empty">Mencari aduan...</div>}
                            {!isComplaintSearchLoading && complaintResults.length === 0 && (
                                <div className="app-empty">Tiada aduan dijumpai.</div>
                            )}
                            {!isComplaintSearchLoading && complaintResults.map((complaint) => {
                                const isLinked = linkedComplaintIds.has(Number(complaint.id));
                                return (
                                    <div className="app-case-link-result" key={`case-link-complaint-${complaint.id}`}>
                                        <div>
                                            <strong>{complaint.reference_no || `Aduan #${complaint.id}`}</strong>
                                            <span>{complaint.complainant_name || '-'}</span>
                                            <small>{complaint.district_name || '-'} | {formatDateTime(`${complaint.complaint_date || ''}T${complaint.complaint_time || '00:00:00'}`)}</small>
                                            {complaint.case_register_no && (
                                                <small className="app-case-linked-case-no">Kes sedia ada: {complaint.case_register_no}</small>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            className="app-button app-button-ghost app-button-sm"
                                            onClick={() => linkComplaintToCase(complaint.id)}
                                            disabled={isLinked || isLinkingComplaint}
                                        >
                                            {!isLinked && isLinkingComplaint && (
                                                <span
                                                    className="spinner-border spinner-border-sm"
                                                    role="status"
                                                    aria-hidden="true"
                                                    style={{ marginRight: '.45rem' }}
                                                ></span>
                                            )}
                                            {isLinked ? 'Sudah Dipaut' : (isLinkingComplaint ? 'Memaut...' : 'Paut')}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="app-case-linked-detail-list">
                    {(!caseRecord?.complaints || caseRecord.complaints.length === 0) && (
                        <div className="app-empty">Tiada aduan berkaitan buat masa ini.</div>
                    )}
                    {(caseRecord?.complaints || []).map((complaint) => (
                        <div
                            role="button"
                            tabIndex={0}
                            className="app-case-linked-detail-item"
                            key={`case-detail-complaint-${complaint.id}`}
                            onClick={() => navigate(`/app/complaints/${complaint.id}`)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    navigate(`/app/complaints/${complaint.id}`);
                                }
                            }}
                        >
                            <strong className="app-case-linked-reference app-link app-link-button app-complaint-cell-link">
                                <span>{complaint.reference_no || `Aduan #${complaint.id}`}</span>
                                <button
                                    type="button"
                                    className="app-case-linked-new-tab"
                                    aria-label="Buka aduan dalam tab baru"
                                    title="Buka tab baru"
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        window.open(`/app/complaints/${complaint.id}`, '_blank', 'noopener,noreferrer');
                                    }}
                                >
                                    <i className="bi bi-box-arrow-up-right" aria-hidden="true"></i>
                                </button>
                            </strong>
                            <span>{complaint.complainant_name || '-'}</span>
                            <small>{formatDateTime(`${complaint.complaint_date || ''}T${complaint.complaint_time || '00:00:00'}`)}</small>
                            {getLinkedComplaintCaseLabel(complaint, caseRecord) && (
                                <small className="app-case-linked-case-no">
                                    {getLinkedComplaintCaseLabel(complaint, caseRecord)}
                                </small>
                            )}
                        </div>
                    ))}
                </div>
            </section>

            <div className="app-case-detail-grid">
                <div className="app-report-stack">
                    <section className="app-report-section">
                        <div className="app-report-toggle app-case-report-title">
                            <h5>Status Tangkapan</h5>
                        </div>
                        <div className="app-form-grid app-report-grid app-arrest-grid-compact">
                            <div className="app-form-field app-span-full">
                                <span>Status Tangkapan <span className="complaint-required">*</span></span>
                                <div className={`app-radio-cards app-radio-cards-2 ${validationErrors.arrest_status ? 'app-input-error' : ''}`}>
                                    <label className={form.arrest_status === 'ada' ? 'active' : ''}>
                                        <input
                                            type="radio"
                                            name="case_arrest_status"
                                            value="ada"
                                            checked={form.arrest_status === 'ada'}
                                            onChange={() => handleArrestStatusChange('ada')}
                                        />
                                        <span>Ada Tangkapan</span>
                                    </label>
                                    <label className={form.arrest_status === 'tiada' ? 'active' : ''}>
                                        <input
                                            type="radio"
                                            name="case_arrest_status"
                                            value="tiada"
                                            checked={form.arrest_status === 'tiada'}
                                            onChange={() => handleArrestStatusChange('tiada')}
                                        />
                                        <span>Tiada Tangkapan</span>
                                    </label>
                                </div>
                                {validationErrors.arrest_status && <small className="app-inline-note app-inline-note-error">{Array.isArray(validationErrors.arrest_status) ? validationErrors.arrest_status[0] : validationErrors.arrest_status}</small>}
                            </div>

                            <label className="app-form-field app-span-full">
                                <div className="app-field-inline-head">
                                    <span>Ringkasan KES</span>
                                    <button
                                        type="button"
                                        className="app-button app-button-ghost app-button-mini"
                                        onClick={() => applyCaseSummaryTemplate()}
                                    >
                                        <i className="bi bi-magic"></i>
                                        Guna Template
                                    </button>
                                </div>
                                <textarea rows="4" value={form.case_summary} onChange={(event) => updateField('case_summary', event.target.value)} />
                            </label>

                            <label className="app-form-field">
                                <span>No. Daftar Kes</span>
                                <input value={isDraft ? 'Akan dijana selepas simpan' : (caseRecord?.case_register_no || '')} readOnly disabled />
                            </label>

                            {isStandaloneDraft && (
                                <label className="app-form-field">
                                    <span>Daerah <span className="complaint-required">*</span></span>
                                    <select
                                        value={form.district_id}
                                        onChange={(event) => updateField('district_id', event.target.value)}
                                        className={validationErrors.district_id ? 'app-input-error' : ''}
                                    >
                                        <option value="">Pilih daerah</option>
                                        {districtOptions.map((district) => (
                                            <option key={`case-district-${district.id}`} value={district.id}>{district.name}</option>
                                        ))}
                                    </select>
                                    {validationErrors.district_id && <small className="app-inline-note app-inline-note-error">{Array.isArray(validationErrors.district_id) ? validationErrors.district_id[0] : validationErrors.district_id}</small>}
                                </label>
                            )}

                            <label className="app-form-field">
                                <span>Nombor Fail</span>
                                <input value={form.file_no} onChange={(event) => updateField('file_no', event.target.value)} />
                            </label>

                            <div className="app-arrest-row app-case-datetime-row app-span-full">
                                <div className="app-form-field">
                                    <span>Kesalahan</span>
                                    <SharedOffenseSelect
                                        apiUrl={apiUrl}
                                        value={form.report_offense_id || ''}
                                        label=""
                                        onChange={(value) => updateField('report_offense_id', value)}
                                    />
                                </div>

                                <label className="app-form-field">
                                    <span>Tarikh / Masa di Lokasi <span className="complaint-required">*</span></span>
                                    <input
                                        type="datetime-local"
                                        value={form.action_datetime}
                                        onChange={(event) => updateField('action_datetime', event.target.value)}
                                        className={validationErrors.action_datetime ? 'app-input-error' : ''}
                                    />
                                    {validationErrors.action_datetime && <small className="app-inline-note app-inline-note-error">{Array.isArray(validationErrors.action_datetime) ? validationErrors.action_datetime[0] : validationErrors.action_datetime}</small>}
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh / Masa Diambil Keterangan</span>
                                    <input type="datetime-local" value={form.statement_datetime} onChange={(event) => updateField('statement_datetime', event.target.value)} />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Sebutan (Bon Mahkamah)</span>
                                    <input type="date" value={form.court_date} onChange={(event) => updateField('court_date', event.target.value)} />
                                </label>
                            </div>

                            <div className="app-arrest-row app-arrest-row-2 app-span-full">
                                <div className="app-form-field app-tangkapan-grid">
                                    <span>Jumlah Tangkapan</span>
                                    <div className="app-tangkapan-fields app-tangkapan-fields-3">
                                        <label>
                                            <small>Lelaki</small>
                                            <input type="number" min="0" value={form.male_count} onChange={(event) => updateField('male_count', event.target.value)} />
                                        </label>
                                        <label>
                                            <small>Perempuan</small>
                                            <input type="number" min="0" value={form.female_count} onChange={(event) => updateField('female_count', event.target.value)} />
                                        </label>
                                        <label>
                                            <small>Lain-lain</small>
                                            <input type="number" min="0" value={form.other_count} onChange={(event) => updateField('other_count', event.target.value)} />
                                        </label>
                                    </div>
                                </div>

                                <div className="app-form-field">
                                    <span>Tangkapan Oleh</span>
                                    <div className="app-inline-radio-group">
                                        {['Pegawai Penguatkuasa Agama', 'Pegawai Masjid', 'Pegawai Polis', 'Orang Awam'].map((label) => (
                                            <label className="app-inline-radio app-inline-radio-compact" key={label}>
                                                <input
                                                    type="radio"
                                                    name="case_arrest_by"
                                                    value={label}
                                                    checked={form.arrest_by === label}
                                                    onChange={() => updateField('arrest_by', label)}
                                                />
                                                <span>{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="app-arrest-row app-span-full">
                                <div className="app-form-field">
                                    <span>Pegawai Penangkap <span className="complaint-required">*</span></span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={form.arrest_staff_id || ''}
                                        onChange={(value) => updateField('arrest_staff_id', value)}
                                        placeholder="-- Pilih Pegawai Penangkap --"
                                        className={validationErrors.arrest_staff_id ? 'app-input-error' : ''}
                                        searchable
                                        searchPlaceholder="Cari pegawai penangkap..."
                                        showDistrictLabel
                                    />
                                    {validationErrors.arrest_staff_id && <small className="app-inline-note app-inline-note-error">{Array.isArray(validationErrors.arrest_staff_id) ? validationErrors.arrest_staff_id[0] : validationErrors.arrest_staff_id}</small>}
                                </div>
                            </div>

                            <label className="app-form-field app-span-full">
                                <span>Laporan / Catatan Kes <span className="complaint-required">*</span></span>
                                <textarea
                                    rows="5"
                                    className={`app-case-report-notes ${validationErrors.report_notes ? 'app-input-error' : ''}`}
                                    value={form.report_notes}
                                    onChange={(event) => updateField('report_notes', event.target.value)}
                                />
                                {validationErrors.report_notes && <small className="app-inline-note app-inline-note-error">{Array.isArray(validationErrors.report_notes) ? validationErrors.report_notes[0] : validationErrors.report_notes}</small>}
                            </label>
                        </div>
                    </section>

                </div>
            </div>

            <section className="app-report-section">
                <div className="app-report-toggle app-case-report-title">
                    <h5>MAKLUMAT OYDS</h5>
                </div>
                <div className="app-inline-section">
                    <div className="app-inline-header">
                        <h5>Orang Yang Disyaki</h5>
                        <button type="button" className="app-button app-button-ghost" onClick={() => addArrayRow('oyds', emptyOyd)}>
                            + Tambah OYDS
                        </button>
                    </div>
                    <div className="app-oyds-table-wrap app-case-oyds-box">
                        {form.oyds.map((row, index) => (
                            <div className="app-case-oyd-card" key={`case-oyd-${index}`}>
                                <div className="app-case-oyd-fields">
                                    <label className="app-case-oyd-field">
                                        <span>Nama OYDS</span>
                                        <input value={row.name || ''} onChange={(event) => updateArrayRow('oyds', index, 'name', event.target.value)} />
                                    </label>
                                    <label className="app-case-oyd-field">
                                        <span>No. K/P atau Passport</span>
                                        <input value={row.id_number || ''} onChange={(event) => updateArrayRow('oyds', index, 'id_number', event.target.value)} />
                                    </label>
                                    <label className="app-case-oyd-field">
                                        <span>Nama Pegawai Penyiasat</span>
                                        <input value={row.investigator_name || ''} onChange={(event) => updateArrayRow('oyds', index, 'investigator_name', event.target.value)} />
                                    </label>
                                    <label className="app-case-oyd-field app-case-oyd-file-field">
                                        <span>No. Fail</span>
                                        <input value={row.file_no || ''} onChange={(event) => updateArrayRow('oyds', index, 'file_no', event.target.value)} />
                                    </label>
                                    <div className="app-case-oyd-remove">
                                        <button type="button" className="app-icon-button" onClick={() => removeArrayRow('oyds', index, emptyOyd)} title="Buang">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="app-case-oyd-attachments">
                                    <span>Lampiran</span>
                                    <OydAttachmentSection
                                        compact
                                        apiUrl={apiUrl}
                                        token={token}
                                        basePath={`${apiUrl}/cases/${id}`}
                                        recordId={row.id || null}
                                        attachments={row.media || []}
                                        category={row.attachment_category || 'ic'}
                                        onCategoryChange={(value) => updateArrayRow('oyds', index, 'attachment_category', value)}
                                        onAttachmentsChange={(updater) => updateRowAttachments('oyds', index, updater)}
                                        onBeforeUpload={() => ensureChildRow('oyds', index, 'oyds', ['name', 'id_number', 'investigator_name', 'file_no'])}
                                        onOydScanned={(scanResult) => {
                                            if (!scanResult) return;
                                            mergeArrayRow('oyds', index, {
                                                name: scanResult.name || row.name || '',
                                                id_number: scanResult.id_number || row.id_number || '',
                                            });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="app-report-section">
                <div className="app-report-toggle app-case-report-title">
                    <h5>BORANG AKUAN PEMERIKSAAN</h5>
                </div>
                <div className="app-form-field">
                    <span>Borang Akuan Pemeriksaan</span>
                    <div className="app-radio-cards app-radio-cards-2">
                        <label className={form.inspection_form_status === 'ada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_inspection_form_status"
                                value="ada"
                                checked={form.inspection_form_status === 'ada'}
                                onChange={() => updateField('inspection_form_status', 'ada')}
                            />
                            <span>Ada</span>
                        </label>
                        <label className={form.inspection_form_status === 'tiada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_inspection_form_status"
                                value="tiada"
                                checked={form.inspection_form_status === 'tiada'}
                                onChange={() => updateField('inspection_form_status', 'tiada')}
                            />
                            <span>Tiada</span>
                        </label>
                    </div>
                </div>

                {form.inspection_form_status === 'ada' && (
                    <div className="app-inline-section">
                        <div className="app-inline-header">
                            <h5>Maklumat Borang Akuan Pemeriksaan</h5>
                            <button type="button" className="app-button app-button-ghost" onClick={() => addArrayRow('inspection_forms', emptyInspectionForm)}>
                                + Tambah Borang
                            </button>
                        </div>
                        <div className="app-oyds-table-wrap app-seizure-table-wrap app-inspection-form-table">
                            <div className="app-seizure-table-head app-inspection-form-table-head">
                                <div>No. Borang</div>
                                <div>Lampiran</div>
                                <div></div>
                            </div>
                            {form.inspection_forms.map((row, index) => (
                                <div className="app-seizure-table-row app-inspection-form-table-row" key={`case-inspection-form-${index}`}>
                                    <div className="app-seizure-table-cell app-inspection-form-table-cell">
                                        <input
                                            value={row.form_no || ''}
                                            onChange={(event) => updateArrayRow('inspection_forms', index, 'form_no', event.target.value)}
                                        />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-attachment app-inspection-form-table-cell">
                                        <SeizureAttachmentSection
                                            compact
                                            mode="inspection_form"
                                            apiUrl={apiUrl}
                                            token={token}
                                            basePath={`${apiUrl}/cases/${id}`}
                                            recordId={row.id || null}
                                            attachments={row.media || []}
                                            category={row.attachment_category || 'dokumen'}
                                            onCategoryChange={(value) => updateArrayRow('inspection_forms', index, 'attachment_category', value)}
                                            onAttachmentsChange={(updater) => updateRowAttachments('inspection_forms', index, updater)}
                                            onBeforeUpload={() => ensureChildRow('inspection_forms', index, 'inspection-forms', ['form_no'])}
                                        />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-action app-inspection-form-table-cell">
                                        <button type="button" className="app-icon-button" onClick={() => removeArrayRow('inspection_forms', index, emptyInspectionForm)} title="Buang">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="app-report-section">
                <div className="app-report-toggle app-case-report-title">
                    <h5>BUTIRAN BARANG KES</h5>
                </div>
                <div className="app-form-field">
                    <span>Barang Sitaan</span>
                    <div className="app-radio-cards app-radio-cards-2">
                        <label className={form.seizure_status === 'ada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_seizure_status"
                                value="ada"
                                checked={form.seizure_status === 'ada'}
                                onChange={() => updateField('seizure_status', 'ada')}
                            />
                            <span>Ada Barang Sitaan</span>
                        </label>
                        <label className={form.seizure_status === 'tiada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_seizure_status"
                                value="tiada"
                                checked={form.seizure_status === 'tiada'}
                                onChange={() => updateField('seizure_status', 'tiada')}
                            />
                            <span>Tiada Barang Sitaan</span>
                        </label>
                    </div>
                </div>

                {form.seizure_status === 'ada' && (
                    <div className="app-inline-section">
                        <div className="app-inline-header">
                            <h5>Maklumat Barang Kes</h5>
                            <button type="button" className="app-button app-button-ghost" onClick={() => addArrayRow('seizure_items', emptySeizureItem)}>
                                + Tambah Barang
                            </button>
                        </div>
                        <div className="app-oyds-table-wrap app-seizure-table-wrap">
                            <div className="app-seizure-table-head">
                                <div>No. Barang</div>
                                <div>Maklumat Barang</div>
                                <div>Stor Simpanan</div>
                                <div>Lampiran</div>
                                <div></div>
                            </div>
                            {form.seizure_items.map((row, index) => (
                                <div className="app-seizure-table-row" key={`case-seizure-${index}`}>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.item_no || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'item_no', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.description || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'description', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.storage || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'storage', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-attachment">
                                        <SeizureAttachmentSection
                                            compact
                                            apiUrl={apiUrl}
                                            token={token}
                                            basePath={`${apiUrl}/cases/${id}`}
                                            recordId={row.id || null}
                                            attachments={row.media || []}
                                            category={row.attachment_category || 'bukti'}
                                            onCategoryChange={(value) => updateArrayRow('seizure_items', index, 'attachment_category', value)}
                                            onAttachmentsChange={(updater) => updateRowAttachments('seizure_items', index, updater)}
                                            onBeforeUpload={() => ensureChildRow('seizure_items', index, 'seizure-items', ['item_no', 'description', 'storage'])}
                                        />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-action">
                                        <button type="button" className="app-icon-button" onClick={() => removeArrayRow('seizure_items', index, emptySeizureItem)} title="Buang">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="app-report-section">
                <div className="app-report-toggle app-case-report-title">
                    <h5>BUTIRAN REPORT POLIS</h5>
                </div>
                <div className="app-form-field">
                    <span>Report Polis</span>
                    <div className="app-radio-cards app-radio-cards-2">
                        <label className={form.police_report_status === 'ada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_police_report_status"
                                value="ada"
                                checked={form.police_report_status === 'ada'}
                                onChange={() => updateField('police_report_status', 'ada')}
                            />
                            <span>Ada Report</span>
                        </label>
                        <label className={form.police_report_status === 'tiada' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_police_report_status"
                                value="tiada"
                                checked={form.police_report_status === 'tiada'}
                                onChange={() => updateField('police_report_status', 'tiada')}
                            />
                            <span>Tiada Report</span>
                        </label>
                    </div>
                </div>

                {form.police_report_status === 'ada' && (
                    <div className="app-inline-section">
                        <div className="app-inline-header">
                            <h5>Maklumat Report</h5>
                            <button type="button" className="app-button app-button-ghost" onClick={() => addArrayRow('police_reports', emptyPoliceReport)}>
                                + Tambah Report
                            </button>
                        </div>
                        <div className="app-oyds-table-wrap app-seizure-table-wrap">
                            <div className="app-seizure-table-head">
                                <div>No. Report</div>
                                <div>Maklumat Report</div>
                                <div>Balai Polis</div>
                                <div>Lampiran</div>
                                <div></div>
                            </div>
                            {form.police_reports.map((row, index) => (
                                <div className="app-seizure-table-row" key={`case-police-${index}`}>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.report_no || ''} onChange={(event) => updateArrayRow('police_reports', index, 'report_no', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.description || ''} onChange={(event) => updateArrayRow('police_reports', index, 'description', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.station || ''} onChange={(event) => updateArrayRow('police_reports', index, 'station', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-attachment">
                                        <SeizureAttachmentSection
                                            compact
                                            mode="police_report"
                                            apiUrl={apiUrl}
                                            token={token}
                                            basePath={`${apiUrl}/cases/${id}`}
                                            recordId={row.id || null}
                                            attachments={row.media || []}
                                            category={row.attachment_category || 'bukti'}
                                            onCategoryChange={(value) => updateArrayRow('police_reports', index, 'attachment_category', value)}
                                            onAttachmentsChange={(updater) => updateRowAttachments('police_reports', index, updater)}
                                            onBeforeUpload={() => ensureChildRow('police_reports', index, 'police-reports', ['report_no', 'description', 'station'])}
                                        />
                                    </div>
                                    <div className="app-seizure-table-cell app-seizure-table-cell-action">
                                        <button type="button" className="app-icon-button" onClick={() => removeArrayRow('police_reports', index, emptyPoliceReport)} title="Buang">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </section>

            <section className="app-report-section">
                <div className="app-report-toggle app-case-report-title">
                    <h5>STATUS OP</h5>
                </div>
                <div className="app-form-grid">
                    <label className="app-form-field app-span-full">
                        <span>Kategori OP</span>
                        <div className="app-radio-grid">
                            {CASE_OP_CATEGORY_OPTIONS.map((option) => (
                                <label className="app-radio-card is-compact app-radio-card-tall" key={option}>
                                    <input
                                        type="radio"
                                        name="case_op_category"
                                        value={option}
                                        checked={form.op_category === option}
                                        onChange={() => updateField('op_category', option)}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </label>

                    <label className="app-form-field app-span-full">
                        <span>Status Kes OP</span>
                        <div className="app-radio-grid">
                            {CASE_OP_STATUS_OPTIONS.map((option) => (
                                <label className="app-radio-card is-compact app-radio-card-tall" key={option}>
                                    <input
                                        type="radio"
                                        name="case_op_status"
                                        value={option}
                                        checked={form.op_case_status === option}
                                        onChange={() => updateField('op_case_status', option)}
                                    />
                                    {option}
                                </label>
                            ))}
                        </div>
                    </label>

                    <label className="app-form-field app-span-full">
                        <span>Catatan OP</span>
                        <textarea
                            rows="4"
                            value={form.op_notes || ''}
                            onChange={(event) => updateField('op_notes', event.target.value)}
                        />
                    </label>
                </div>
            </section>

            {!isDraft && canViewAudit && (
                <section className="app-card">
                    <div className="app-card-header">
                        <h4>Audit Rekod</h4>
                    </div>
                    <div className="app-form-grid">
                        <div className="app-form-field">
                            <span>Dicipta Oleh</span>
                            <div className="app-detail-value">{formatAuditUser(caseRecord?.created_by)}</div>
                        </div>
                        <div className="app-form-field">
                            <span>Tarikh Cipta</span>
                            <div className="app-detail-value">{formatDateTime(caseRecord?.created_at)}</div>
                        </div>
                        <div className="app-form-field">
                            <span>Dikemaskini Oleh</span>
                            <div className="app-detail-value">{formatAuditUser(caseRecord?.updated_by)}</div>
                        </div>
                        <div className="app-form-field">
                            <span>Tarikh Kemaskini</span>
                            <div className="app-detail-value">{formatDateTime(caseRecord?.updated_at)}</div>
                        </div>
                        <div className="app-form-field">
                            <span>Dipadam Oleh</span>
                            <div className="app-detail-value">{formatAuditUser(caseRecord?.deleted_by)}</div>
                        </div>
                        <div className="app-form-field">
                            <span>Tarikh Padam</span>
                            <div className="app-detail-value">{formatDateTime(caseRecord?.deleted_at)}</div>
                        </div>
                    </div>
                </section>
            )}

            <div className="app-report-sticky app-case-sticky-actions">
                <button type="button" className="app-button" onClick={saveCase} disabled={isSaving}>
                    {isSaving && (
                        <span
                            className="spinner-border spinner-border-sm"
                            role="status"
                            aria-hidden="true"
                            style={{ marginRight: '.45rem' }}
                        ></span>
                    )}
                    {isSaving ? 'Menyimpan...' : (isDraft ? 'Simpan Kes & Jana No Kes' : 'Simpan Kes')}
                </button>
                {!isDraft && (
                    <button
                        type="button"
                        className="app-button app-button-ghost"
                        onClick={() => window.open(
                            `/app/cases/${id}/print/ringkasan-kes`,
                            'ringkasanKesKes',
                            'width=1080,height=820,scrollbars=yes,resizable=yes'
                        )}
                    >
                        <i className="bi bi-printer"></i>
                        Ringkasan KES
                    </button>
                )}
                {!isDraft && (
                    <button
                        type="button"
                        className="app-button app-button-ghost"
                        onClick={() => window.open(
                            `/app/cases/${id}/print/laporan-tindakan`,
                            'laporanTindakanKes',
                            'width=980,height=720,scrollbars=yes,resizable=yes'
                        )}
                    >
                        <i className="bi bi-printer"></i>
                        Laporan Tindakan
                    </button>
                )}
            </div>
        </div>
    );
};

export default CaseDetail;
