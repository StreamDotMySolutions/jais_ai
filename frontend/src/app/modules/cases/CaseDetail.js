import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';
import SharedStaffSelect from '../../components/SharedStaffSelect';
import SharedInlineAlert from '../../components/SharedInlineAlert';
import OydAttachmentSection from '../../components/OydAttachmentSection';
import SeizureAttachmentSection from '../../components/SeizureAttachmentSection';
import { useToast } from '../../components/SharedToastProvider';

const emptySeizureItem = { item_no: '', description: '', storage: '' };
const emptyPoliceReport = { report_no: '', description: '', station: '' };
const emptyOyd = { name: '', id_number: '', investigator_name: '', file_no: '' };

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
    const toast = useToast();
    const isDraft = !id || id === 'new';
    const draftComplaintId = useMemo(() => {
        const params = new URLSearchParams(location.search || '');
        return params.get('complaint_id') || '';
    }, [location.search]);
    const [caseRecord, setCaseRecord] = useState(null);
    const [form, setForm] = useState({
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
        report_notes: '',
        oyds: [emptyOyd],
        seizure_status: '',
        seizure_items: [emptySeizureItem],
        police_report_status: '',
        police_reports: [emptyPoliceReport],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLinkPanelOpen, setIsLinkPanelOpen] = useState(false);
    const [complaintKeyword, setComplaintKeyword] = useState('');
    const [complaintResults, setComplaintResults] = useState([]);
    const [isComplaintSearchLoading, setIsComplaintSearchLoading] = useState(false);
    const [isLinkingComplaint, setIsLinkingComplaint] = useState(false);
    const [linkError, setLinkError] = useState('');

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);
    const otherCaseComplaints = useMemo(() => getOtherCaseComplaints(caseRecord), [caseRecord]);
    const linkedComplaintIds = useMemo(() => new Set(
        (Array.isArray(caseRecord?.complaints) ? caseRecord.complaints : []).map((complaint) => Number(complaint.id))
    ), [caseRecord]);

    const hydrateForm = (data) => {
        setForm({
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
            report_notes: data?.report_notes || '',
            oyds: Array.isArray(data?.oyds) && data.oyds.length ? data.oyds : [emptyOyd],
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
                setError('Aduan tidak dipilih untuk kes baharu.');
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
    }, [apiUrl, id, draftComplaintId]);

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
        setIsSaving(true);
        setMessage('');
        setError('');
        const payload = {
            ...form,
            report_offense_id: form.report_offense_id || null,
            arrest_staff_id: form.arrest_staff_id || null,
        };
        const request = isDraft
            ? axios.post(`${apiUrl}/complaints/${draftComplaintId}/cases`, payload, { headers })
            : axios.put(`${apiUrl}/cases/${id}`, payload, { headers });

        request
            .then((response) => {
                const data = isDraft
                    ? (response?.data?.meta?.primary_case || response?.data?.data?.primary_case)
                    : response?.data?.data;
                setCaseRecord(data);
                hydrateForm(data);
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
                                    {caseRecord?.district_name || '-'} | {caseRecord?.case_type === 'AJ' ? 'Aduan Jenayah (AJ)' : '-'}
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
                    message="No. daftar kes hanya akan dijana selepas Simpan Kes. Jika keluar tanpa simpan, tiada rekod kes akan dibuat."
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
                                            {isLinked ? 'Sudah Dipaut' : 'Paut'}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
                <div className="app-case-linked-detail-list">
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
                                <div className="app-radio-cards app-radio-cards-2">
                                    <label className={form.arrest_status === 'ada' ? 'active' : ''}>
                                        <input
                                            type="radio"
                                            name="case_arrest_status"
                                            value="ada"
                                            checked={form.arrest_status === 'ada'}
                                            onChange={() => updateField('arrest_status', 'ada')}
                                        />
                                        <span>Ada Tangkapan</span>
                                    </label>
                                    <label className={form.arrest_status === 'tiada' ? 'active' : ''}>
                                        <input
                                            type="radio"
                                            name="case_arrest_status"
                                            value="tiada"
                                            checked={form.arrest_status === 'tiada'}
                                            onChange={() => updateField('arrest_status', 'tiada')}
                                        />
                                        <span>Tiada Tangkapan</span>
                                    </label>
                                </div>
                            </div>

                            <label className="app-form-field">
                                <span>No. Daftar Kes</span>
                                <input value={isDraft ? 'Akan dijana selepas simpan' : (caseRecord?.case_register_no || '')} readOnly disabled />
                            </label>

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
                                    <span>Tarikh / Masa <span className="complaint-required">*</span></span>
                                    <input type="datetime-local" value={form.action_datetime} onChange={(event) => updateField('action_datetime', event.target.value)} />
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
                                    />
                                </div>
                            </div>

                            <label className="app-form-field app-span-full">
                                <span>Laporan / Catatan Kes</span>
                                <textarea rows="5" value={form.report_notes} onChange={(event) => updateField('report_notes', event.target.value)} />
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
                        <div className="app-inline-radio-group">
                            {CASE_OP_CATEGORY_OPTIONS.map((option) => (
                                <label className="app-inline-radio app-inline-radio-compact" key={option}>
                                    <input
                                        type="radio"
                                        name="case_op_category"
                                        value={option}
                                        checked={form.op_category === option}
                                        onChange={() => updateField('op_category', option)}
                                    />
                                    <span>{option}</span>
                                </label>
                            ))}
                        </div>
                    </label>

                    <label className="app-form-field app-span-full">
                        <span>Status Kes OP</span>
                        <div className="app-inline-radio-group">
                            {CASE_OP_STATUS_OPTIONS.map((option) => (
                                <label className="app-inline-radio app-inline-radio-compact" key={option}>
                                    <input
                                        type="radio"
                                        name="case_op_status"
                                        value={option}
                                        checked={form.op_case_status === option}
                                        onChange={() => updateField('op_case_status', option)}
                                    />
                                    <span>{option}</span>
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

            <div className="app-report-sticky app-case-sticky-actions">
                <button type="button" className="app-button" onClick={saveCase} disabled={isSaving}>
                    {isSaving ? 'Menyimpan...' : (isDraft ? 'Simpan Kes & Jana No Kes' : 'Simpan Kes')}
                </button>
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
