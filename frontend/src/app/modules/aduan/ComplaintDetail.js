import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import SearchSelect from '../../../libs/SearchSelect';
import SharedStaffSelect from '../../components/SharedStaffSelect';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';
import SharedInlineAlert from '../../components/SharedInlineAlert';
import SharedInlineEditText from '../../components/SharedInlineEditText';
import SharedIpStatusSelect from '../../components/SharedIpStatusSelect';
import SharedMahkamahSelect from '../../components/SharedMahkamahSelect';
import SharedProsecutionStatusSelect from '../../components/SharedProsecutionStatusSelect';
import SharedAttachmentSection from '../../components/SharedAttachmentSection';
import OydAttachmentSection from '../../components/OydAttachmentSection';
import SeizureAttachmentSection from '../../components/SeizureAttachmentSection';
import { useToast } from '../../components/SharedToastProvider';
import BORANG5_OFFICER_TEMPLATES from './borang5OfficerTemplates';
import LAPORAN_TINDAKAN_TEMPLATES from './laporanTindakanTemplates';
import { getComplaintStageLabel, getPublicComplaintStageLabel } from './complaintStage';
import useOffenseOptions from '../../hooks/useOffenseOptions';

const AJ_STEPS = [
    { key: 'ppa', label: 'Maklumat Aduan' },
    { key: 'laporan_tindakan', label: 'Jana Tindakan' },
    { key: 'laporan_pemeriksaan', label: 'Laporan Tindakan' },
    { key: 'siasatan', label: 'Butiran Siasatan' },
    { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
];

const COUNT_SELECT_OPTIONS = [
    { value: '1', label: '1' },
    { value: '2', label: '2' },
    { value: '3', label: '3' },
];
const AK_STEPS = [
    { key: 'tindakan', label: 'Maklumat Aduan' },
    { key: 'siasatan', label: 'Butiran Siasatan' },
    { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
];

const AJ_CURRENT_STATUS_OPTIONS = [
    'Selesai Dengan Kes',
    'Selesai Tanpa Kes',
    'KIV - Dalam siasatan',
    'NFA - Melebihi 10 hari',
    'NFA - Maklumat Palsu',
    'Belum menerima maklum balas',
    'Other',
];

const AJ_OP_CATEGORY_OPTIONS = [
    'PP Unit Gerakan',
    'PP Unit Perundangan & Kesalahan',
    'Other',
];

const AJ_OP_CASE_STATUS_OPTIONS = [
    'Siasatan Pegawai Penyiasat',
    'Dalam pemantauan / siasatan',
    'Selesai - Tangkapan dan Proses biasa',
    'Selesai - Minit KPP untuk ditutup',
    'Selesai - Dipanjangkan aduan ke Bahagian lain',
    'Selesai - Tiada bidangkuasa',
    'Selesai - Tiada alasan mencukupi untuk bertindak',
    'Other',
];

const LOCKED_BASIC_EDIT_CHANNELS = ['portal', 'web', 'whatsapp', 'whatsapp_web'];

const ComplaintDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const toast = useToast();
    const token = localStorage.getItem('token');
    const detailHeaderRef = useRef(null);
    const { items: offenseItems } = useOffenseOptions({ apiUrl });
    const [complaint, setComplaint] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [sortedIds, setSortedIds] = useState([]);
    const [approvalMeta, setApprovalMeta] = useState({
        approvals_count: 0,
        approvals_required: 2,
        has_approved: false,
        is_assigned_approver: false,
    });
    const [referenceData, setReferenceData] = useState({
        offenseTypes: [],
        offenses: [],
        khalwatDetails: [],
        judiDetails: [],
    });
    const [activeStep, setActiveStep] = useState(0);
    const ajPayloadDefault = {
        offense_id: '',
        offense_type_id: '',
        khalwat_detail_id: '',
        judi_detail_id: '',
        notes: '',
        classification: '',
        supervisor_staff_id: '',
        ip_status: '',
        ip_due_date: '',
        kpp_due_date: '',
        jpss_due_date: '',
        investigation_notes: '',
        prosecution_status: '',
        prosecutor_staff_id: '',
        mahkamah_id: '',
        fine: '',
        prosecution_notes: '',
        fir_no: '',
    };
    const ajReportDefault = {
        arrest_status: '',
        male_count: '',
        female_count: '',
        other_count: '',
        report_no: '',
        action_datetime: '',
        offense_id: '',
        arrest_by: '',
        arrest_staff_id: '',
        statement_datetime: '',
        court_date: '',
        report_notes: '',
        directive_staff_id: '',
        handover_staff_id: '',
        directive_at: '',
        directive_notes: '',
        handover_at: '',
        handover_notes: '',
        oyds: [
            { id: null, name: '', id_number: '', investigator_name: '', file_no: '', media: [] },
        ],
        seizure_status: '',
        seizure_items: [
            { id: null, item_no: '', description: '', storage: '', media: [] },
        ],
    };
    const ajActionReportDefault = {
        directive_staff_id: '',
        handover_staff_id: '',
        directive_at: '',
        directive_notes: '',
        handover_at: '',
        handover_notes: '',
        current_status: '',
        case_register_no: '',
        op_category: '',
        op_case_status: '',
        op_notes: '',
        file_no: '',
        history_entries: [
            { classification: '', action_date: '', action_time: '', note: '' },
        ],
    };
    const akPayloadDefault = {
        offense_id: '',
        offense_type_id: '',
        investigation_datetime: '',
        investigator_name: '',
        investigator_staff_id: '',
        file_received_date: '',
        ip_status: '',
        ip_due_date: '',
        prosecution_date: '',
        charge_recommendations: [
            { portfolio: '', name: '', offense_id: '' },
        ],
        notes: '',
        supervisor_staff_id: '',
        prosecution_status: '',
        prosecution_notes: '',
        prosecutor_staff_id: '',
        hearing_date: '',
        mahkamah_id: '',
        court_decision: '',
        prosecution_charges: [
            { accused_name: '', id_number: '', offense_id: '', case_no: '' },
        ],
    };
    const [ajPayload, setAjPayload] = useState(ajPayloadDefault);
    const [ajReport, setAjReport] = useState(ajReportDefault);
    const [ajActionReport, setAjActionReport] = useState(ajActionReportDefault);
    const [akPayload, setAkPayload] = useState(akPayloadDefault);
    const [actionMessage, setActionMessage] = useState('');
    const [payloadMessage, setPayloadMessage] = useState('');
    const [reportMessage, setReportMessage] = useState('');
    const [actionReportMessage, setActionReportMessage] = useState('');
    const [statusInput, setStatusInput] = useState('');
    const [caseTypeMessage, setCaseTypeMessage] = useState('');
    const [assigneeMessage, setAssigneeMessage] = useState('');
    const [approverStaffId, setApproverStaffId] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [basicEditing, setBasicEditing] = useState(false);
    const [basicSaving, setBasicSaving] = useState(false);
    const [basicMessage, setBasicMessage] = useState('');
    const [addressExpanded, setAddressExpanded] = useState(false);
    const [summaryExpanded, setSummaryExpanded] = useState(false);
    const [basicDraft, setBasicDraft] = useState({
        complainant_name: '',
        identification_number: '',
        contact_number: '',
        informant_name: '',
        informant_identification_number: '',
        informant_contact_number: '',
        complainant_occupation: '',
        complaint_date: '',
        complaint_time: '',
        incident_date: '',
        incident_time: '',
        ak_subtype: '',
        ak_partner_name: '',
        ak_cerai_count: '',
        ak_cerai_talaq_count: '',
        ak_poligami_marriage_count: '',
        ak_poligami_wife_count: '',
        ak_event_date: '',
        ak_event_place: '',
        ak_event_time: '',
        ak_event_location: '',
        ak_rujuk_date: '',
        district_id: '',
        address: '',
        summary: '',
        borang5_statement: '',
        offense_id: '',
    });
    const [reportSections, setReportSections] = useState({
        issuer: true,
        arrest: true,
        oyds: true,
        seizure: true,
    });
    const [oydUploadDrafts, setOydUploadDrafts] = useState({});
    const [seizureUploadDrafts, setSeizureUploadDrafts] = useState({});
    const [timeTick, setTimeTick] = useState(Date.now());
    const role = localStorage.getItem('role') || 'awam';
    const localUserName = (localStorage.getItem('user_name') || '').trim().toLowerCase();
    const localStaffId = localStorage.getItem('staff_id') || '';
    const isPublicRole = ['awam', 'user'].includes(role);
    const isPegawaiRole = ['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'].includes(role);
    const complaintChannelNormalized = (complaint?.channel || '').toString().trim().toLowerCase();
    const shouldHideInformantSection = ['portal', 'whatsapp', 'whatsapp_web'].includes(complaintChannelNormalized);
    const isBasicEditLockedBySource = LOCKED_BASIC_EDIT_CHANNELS.includes(complaintChannelNormalized);
    const isWalkInInformant = ['walkin', 'walk-in', 'kaunter'].includes(complaintChannelNormalized);
    const receiverName = complaint?.received_by?.name || complaint?.receivedBy?.name || '';
    const receiverStaff = complaint?.received_by?.staff || complaint?.receivedBy?.staff || null;
    const effectiveInformantName = (complaint?.informant_name || '').trim()
        || (isWalkInInformant ? (complaint?.complainant_name || '') : receiverName)
        || '';
    const effectiveInformantIdNumber = (complaint?.informant_identification_number || '').trim()
        || (isWalkInInformant
            ? (complaint?.identification_number || '')
            : (receiverStaff?.staff_id || receiverStaff?.ic_number || ''))
        || '';
    const effectiveInformantContactNumber = (complaint?.informant_contact_number || '').trim()
        || (isWalkInInformant
            ? (complaint?.contact_number || '')
            : (receiverStaff?.phone || ''))
        || '';
    const canEditBasicComplaint = isPegawaiRole && !isBasicEditLockedBySource;
    const autoClassificationGuardRef = useRef({});
    const suppressUnloadReleaseRef = useRef(false);
    const autoPickupGuardRef = useRef({});
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
        if (!value) {
            return '--/--/----';
        }
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
    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem('token');
        axios.get(`${apiUrl}/complaints/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setComplaint(response?.data?.data || null);
                setApprovalMeta(response?.data?.meta || {
                    approvals_count: 0,
                    approvals_required: 2,
                    has_approved: false,
                });
            })
            .catch((err) => {
                setError(err?.message || 'Gagal mendapatkan aduan.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [apiUrl, id]);

    useEffect(() => {
        const el = detailHeaderRef.current;
        if (!el) return;

        const apply = () => {
            const h = Math.ceil(el.getBoundingClientRect().height || 0);
            document.documentElement.style.setProperty('--app-detail-header-sticky-h', `${h}px`);
        };

        apply();

        let ro = null;
        if (typeof ResizeObserver !== 'undefined') {
            ro = new ResizeObserver(() => apply());
            ro.observe(el);
        }

        window.addEventListener('resize', apply);
        return () => {
            window.removeEventListener('resize', apply);
            if (ro) {
                ro.disconnect();
            }
        };
    }, [complaint?.reference_no, complaint?.current_stage, sortedIds.length]);

    useEffect(() => {
        if (!canEditBasicComplaint && basicEditing) {
            setBasicEditing(false);
        }
    }, [basicEditing, canEditBasicComplaint]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        Promise.all([
            axios.get(`${apiUrl}/references/offense-types`),
            axios.get(`${apiUrl}/references/khalwat-details`),
            axios.get(`${apiUrl}/references/judi-details`),
        ])
            .then(([typesRes, khalwatRes, judiRes]) => {
                setReferenceData({
                    offenseTypes: typesRes?.data?.data || [],
                    khalwatDetails: khalwatRes?.data?.data || [],
                    judiDetails: judiRes?.data?.data || [],
                });
            })
            .catch(() => {
                setReferenceData({
                    offenseTypes: [],
                    khalwatDetails: [],
                    judiDetails: [],
                });
            });
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/districts`)
            .then((response) => {
                setDistrictOptions(response?.data?.data || []);
            })
            .catch(() => setDistrictOptions([]));
    }, [apiUrl]);

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.origin !== window.location.origin) {
                return;
            }
            if (event.data?.type === 'appointment-slot' && event.data?.value) {
                setAkPayload((prev) => ({ ...prev, investigation_datetime: event.data.value }));
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        if (!complaint) {
            return;
        }
        setBasicDraft({
            complainant_name: complaint.complainant_name || '',
            identification_number: complaint.identification_number || '',
            contact_number: complaint.contact_number || '',
            informant_name: complaint.informant_name || '',
            informant_identification_number: complaint.informant_identification_number || '',
            informant_contact_number: complaint.informant_contact_number || '',
            complainant_occupation: complaint.complainant_occupation || '',
            complaint_date: complaint.complaint_date || '',
            complaint_time: (complaint.complaint_time || '').slice(0, 5),
            incident_date: complaint.incident_date || '',
            incident_time: (complaint.incident_time || '').slice(0, 5),
            ak_subtype: complaint.ak_subtype || '',
            ak_partner_name: complaint.ak_partner_name || '',
            ak_cerai_count: complaint.ak_cerai_count ? String(complaint.ak_cerai_count) : '',
            ak_cerai_talaq_count: complaint.ak_cerai_talaq_count ? String(complaint.ak_cerai_talaq_count) : '',
            ak_poligami_marriage_count: complaint.ak_poligami_marriage_count ? String(complaint.ak_poligami_marriage_count) : '',
            ak_poligami_wife_count: complaint.ak_poligami_wife_count ? String(complaint.ak_poligami_wife_count) : '',
            ak_event_date: complaint.ak_event_date || '',
            ak_event_place: complaint.ak_event_place || '',
            ak_event_time: (complaint.ak_event_time || '').slice(0, 5),
            ak_event_location: complaint.ak_event_location || '',
            ak_rujuk_date: complaint.ak_rujuk_date || '',
            district_id: complaint.district_id ? String(complaint.district_id) : '',
            address: complaint.address || '',
            summary: complaint.summary || '',
            borang5_statement: complaint.borang5_statement || '',
            offense_id: complaint.case_type === 'AK'
                ? (complaint.ak_offense_id ? String(complaint.ak_offense_id) : '')
                : (complaint.aj_offense_id ? String(complaint.aj_offense_id) : ''),
        });
        setAddressExpanded(false);
        setSummaryExpanded(false);
    }, [complaint]);

    const saveBasicField = async (fieldName, value) => {
        if (!apiUrl || !id) return;
        const token = localStorage.getItem('token');
        const payload = { [fieldName]: value };
        const response = await axios.post(`${apiUrl}/complaints/${id}/basic`, payload, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        const updated = response?.data?.data;
        if (updated) {
            setComplaint((prev) => (prev ? { ...prev, ...updated } : prev));
        }
        const msg = response?.data?.message || 'Maklumat aduan dikemaskini.';
        toast.success(msg);
        return updated;
    };

    useEffect(() => {
        const timer = window.setInterval(() => setTimeTick(Date.now()), 30 * 1000);
        return () => window.clearInterval(timer);
    }, []);

    const complaintSubmittedAt = useMemo(() => {
        const datePart = (complaint?.complaint_date || '').toString().trim();
        if (!datePart) return null;

        const timePartRaw = (complaint?.complaint_time || '').toString().trim();
        const hasSeconds = timePartRaw.split(':').length >= 3;
        const timePart = timePartRaw
            ? (hasSeconds ? timePartRaw : `${timePartRaw}:00`)
            : '00:00:00';
        const dt = new Date(`${datePart}T${timePart}`);
        if (Number.isNaN(dt.getTime())) return null;
        return dt;
    }, [complaint?.complaint_date, complaint?.complaint_time]);

    const kivDeadlineAt = useMemo(() => {
        if (!complaintSubmittedAt) return null;
        return new Date(complaintSubmittedAt.getTime() + (10 * 24 * 60 * 60 * 1000));
    }, [complaintSubmittedAt]);

    const nfaDeadlineAt = useMemo(() => {
        if (!complaintSubmittedAt) return null;
        return new Date(complaintSubmittedAt.getTime() + (24 * 60 * 60 * 1000));
    }, [complaintSubmittedAt]);

    const kivRemainingMs = useMemo(() => {
        if (!kivDeadlineAt) return null;
        return kivDeadlineAt.getTime() - timeTick;
    }, [kivDeadlineAt, timeTick]);

    const nfaRemainingMs = useMemo(() => {
        if (!nfaDeadlineAt) return null;
        return nfaDeadlineAt.getTime() - timeTick;
    }, [nfaDeadlineAt, timeTick]);

    const formatKivCountdown = useCallback((ms) => {
        if (ms == null) return '';
        if (ms <= 0) return 'Tempoh tamat (auto NFA)';
        const dayMs = 24 * 60 * 60 * 1000;
        const daysLeft = Math.ceil(ms / dayMs);
        return `${daysLeft} hari lagi`;
    }, []);

    const formatNfaCountdown = useCallback((ms) => {
        if (ms == null) return '';
        if (ms <= 0) return 'Tempoh 24 jam tamat';
        const totalMinutes = Math.ceil(ms / (60 * 1000));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        if (hours <= 0) return `${minutes} minit lagi`;
        return `${hours}j ${minutes}m lagi`;
    }, []);

    useEffect(() => {
        if (!isPegawaiRole || !id) return;
        if (ajPayload.classification !== 'KIV') return;
        if (kivRemainingMs == null || kivRemainingMs > 0) return;

        const key = `kiv-expired-${id}`;
        if (autoClassificationGuardRef.current[key]) return;
        autoClassificationGuardRef.current[key] = true;

        setAjPayload((prev) => {
            if (prev.classification !== 'KIV') return prev;
            return { ...prev, classification: 'NFA' };
        });
        toast.info('Tempoh KIV tamat. Klasifikasi ditukar kepada NFA. Sila klik Simpan.');
    }, [ajPayload.classification, id, isPegawaiRole, kivRemainingMs, toast]);

    const saveBasic = () => {
        if (!apiUrl || !id || basicSaving) {
            return;
        }
        const token = localStorage.getItem('token');
        setBasicSaving(true);
        setBasicMessage('');
        axios.post(`${apiUrl}/complaints/${id}/basic`, {
            ...basicDraft,
            district_id: basicDraft.district_id || null,
            offense_id: basicDraft.offense_id || null,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
                const msg = response?.data?.message || 'Maklumat aduan dikemaskini.';
                setBasicMessage(msg);
                toast.success(msg);
                setBasicEditing(false);
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal kemaskini maklumat aduan.';
                setBasicMessage(msg);
                toast.error(msg);
            })
            .finally(() => setBasicSaving(false));
    };

    const formatBorang5TemplateDate = (isoDate) => {
        if (!isoDate) return '';
        // Expect ISO yyyy-mm-dd from DB/UI; render as dd.mm.yyyy to match existing JAIS templates.
        const match = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '';
        return `${match[3]}.${match[2]}.${match[1]}`;
    };

    const formatBorang5TemplateTime = (hhmm) => {
        if (!hhmm) return '';
        const match = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return '';
        const hh = match[1].padStart(2, '0');
        return `${hh}.${match[2]}`; // 24h with dot, keep existing suffix (PAGI/PETANG) if template has it
    };

    const hydrateBorang5Template = (rawText) => {
        if (!rawText) return '';
        let text = String(rawText);

        // Borang 5 uses "Tarikh/Masa Aduan" (complaint_date/time) for PADA/JAM like current public flow.
        const dateDot = formatBorang5TemplateDate(basicDraft.complaint_date);
        const timeDot = formatBorang5TemplateTime(basicDraft.complaint_time);
        const address = (basicDraft.address || '').trim();

        if (dateDot) {
            // Placeholder: "PADA __________"
            text = text.replace(/PADA\s+__________/i, `PADA ${dateDot}`);
            // Replace the first explicit date after "PADA".
            text = text.replace(/PADA\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})/i, `PADA ${dateDot}`);
        }

        if (timeDot) {
            // Placeholder: "JAM _____" or "JAM LEBIH KURANG _____"
            text = text.replace(/(JAM\s+(?:LEBIH\s+KURANG\s+)?)_____/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\s+KURANG\s+JAM\s+)_____/i, `$1${timeDot}`);
            // Common: "JAM LEBIH KURANG 02.35", "JAM 04.50", "LEBIH KURANG JAM 6.00"
            text = text.replace(/(JAM\s+(?:LEBIH\s+KURANG\s+)?)\d{1,2}(?:[.:]\d{2})?/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\s+KURANG\s+JAM\s+)\d{1,2}(?:[.:]\d{2})?/i, `$1${timeDot}`);
        }

        if (address) {
            // Replace the value after the location labels (first line only).
            text = text.replace(/(LOKASI KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(LOKASI KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
        }

        return text.trim();
    };

    const hydrateLaporanTindakanTemplate = (rawText) => {
        if (!rawText) return '';
        let text = String(rawText);

        // Laporan Tindakan usually refers to "Tarikh / Masa Tindakan" (action_datetime).
        // Fallback to "Tarikh / Masa Maklum Aduan" (directive_at) then complaint date/time.
        const dt = (ajReport?.action_datetime || ajReport?.directive_at || '').toString().trim();
        const dateIso = dt.includes('T') ? dt.split('T')[0] : '';
        const timeHhmm = dt.includes('T') ? (dt.split('T')[1] || '').slice(0, 5) : '';

        const dateDot = formatBorang5TemplateDate(dateIso || basicDraft.complaint_date);
        const timeDot = formatBorang5TemplateTime(timeHhmm || basicDraft.complaint_time);
        const address = (basicDraft.address || '').trim();

        if (dateDot) {
            text = text.replace(/PADA\s+__________/i, `PADA ${dateDot}`);
            text = text.replace(/PADA\s+(\d{1,2}[./-]\d{1,2}[./-]\d{4}|\d{4}-\d{2}-\d{2})/i, `PADA ${dateDot}`);
        }

        if (timeDot) {
            text = text.replace(/(JAM\s+(?:LEBIH\s+KURANG\s+)?)_____/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\s+KURANG\s+JAM\s+)_____/i, `$1${timeDot}`);
            text = text.replace(/(JAM\s+(?:LEBIH\s+KURANG\s+)?)\d{1,2}(?:[.:]\d{2})?/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\s+KURANG\s+JAM\s+)\d{1,2}(?:[.:]\d{2})?/i, `$1${timeDot}`);
        }

        if (address) {
            text = text.replace(/(LOKASI KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\s*:)\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(LOKASI KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\s*:)\s*[^\n]*/gi, `$1 ${address}`);
        }

        return text.trim();
    };

    const normalizeLaporanTindakanPlaceholders = (rawText) => {
        if (!rawText) return '';
        let text = String(rawText);

        // Ensure OYDS field lines always use consistent placeholders.
        // Keep numbering prefix if present (e.g. "1) OYDS (L) : ...").
        text = text.replace(/^\s*(\d+\)\s*)?OYDS\s*\(\s*([LP])\s*\)\s*BERNAMA\s*:\s*.*$/gmi, '$1OYDS ($2) : _______');
        text = text.replace(/^\s*(\d+\)\s*)?OYDS\(\s*([LP])\s*\)\s*BERNAMA\s*:\s*.*$/gmi, '$1OYDS ($2) : _______');
        text = text.replace(/^\s*(\d+\)\s*)?OYDS\s*\(\s*([LP])\s*\)\s*:\s*.*$/gmi, '$1OYDS ($2) : _______');
        text = text.replace(/^\s*OYDS\s*:\s*.*$/gmi, 'OYDS : _______');

        // Normalize ID/phone labels in templates (optional but helps consistency).
        text = text.replace(/^\s*NO\.?\s*(?:K\/?P|KP|KAD PENGENALAN)\s*:?\s*.*$/gmi, 'NO. K/P : __________');
        text = text.replace(/^\s*NO\.?\s*PASSPORT\s*:?\s*.*$/gmi, 'NO. PASSPORT : __________');
        text = text.replace(/^\s*NO\.?\s*TEL(?:EFON)?\s*:?\s*.*$/gmi, 'NO. TELEFON : __________');

        // Normalize clothing line
        text = text.replace(/^\s*PAKAIAN\s*:?\s*.*$/gmi, 'PAKAIAN : _______');
        text = text.replace(/^.*KETIKA\s+ITU\s+KELIHATAN\s+BERPAKAIAN.*$/gmi, 'PAKAIAN : _______');

        return text.trim();
    };

    const resolveTemplateKeyFromOffense = (offense) => {
        const code = (offense?.code || '').toString().toUpperCase();
        const section = (offense?.section || '').toString().toUpperCase();

        let num = '';
        let isEpais = false;

        const ejss = code.match(/^EJSS-(\d+)/);
        const epaisNum = code.match(/^EPAIS-(\d+)/);
        if (ejss) {
            num = ejss[1];
        } else if (epaisNum) {
            num = epaisNum[1];
            isEpais = true;
        } else if (code.startsWith('EPAIS-')) {
            isEpais = true;
        }

        if (!num) {
            const match = section.match(/\b(?:SEC|SEKSYEN)\s*([0-9]+)/);
            if (match) {
                num = match[1];
                isEpais = isEpais || section.includes('EPAIS');
            }
        }

        if (num === '32' || num === '33' || num === '34') return 'seksyen_32_33_34';
        if (isEpais && num) return `epais_${num}`;
        if (num) return `seksyen_${num}`;
        return '';
    };

    const formatOffenseLabel = (offense) => {
        if (!offense) return '';
        const code = (offense.code || '').toString().trim();
        const section = (offense.section || '').toString().trim();
        const name = (offense.name || '').toString().trim();
        const parts = [];
        if (code) parts.push(code);
        if (section) parts.push(section);
        const head = parts.length ? `${parts.join(' / ')}` : '';
        if (head && name) return `${head} - ${name}`;
        return name || head;
    };

    const applyBorang5OfficerTemplate = (templateKey, offense) => {
        const tpl = BORANG5_OFFICER_TEMPLATES.find((item) => item.key === templateKey)
            || BORANG5_OFFICER_TEMPLATES.find((item) => item.key === 'generic');
        if (!tpl) return;

        const existing = (basicDraft.borang5_statement || '').trim();
        const nextText = hydrateBorang5Template((tpl.text || '').replace('{{OFFENSE}}', formatOffenseLabel(offense)));

        if (existing && existing !== nextText) {
            const ok = window.confirm('Butiran Aduan (Borang 5) akan diganti dengan template yang dipilih. Teruskan?');
            if (!ok) return;
        }

        setBasicDraft((prev) => ({ ...prev, borang5_statement: nextText }));
    };

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        let cancelled = false;
        const authToken = localStorage.getItem('token');
        const endpoint = isPublicRole ? `${apiUrl}/complaints/my` : `${apiUrl}/complaints`;

        const loadSortedIds = async () => {
            try {
                const collectedIds = [];
                let page = 1;
                let lastPage = 1;

                while (page <= lastPage) {
                    const response = await axios.get(endpoint, {
                        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
                        params: { per_page: 500, page },
                    });
                    const pageIds = (response?.data?.data || []).map((item) => item.id);
                    collectedIds.push(...pageIds);
                    lastPage = Number(response?.data?.meta?.last_page || 1);
                    page += 1;
                }

                if (!cancelled) {
                    setSortedIds(collectedIds);
                }
            } catch (_error) {
                if (!cancelled) {
                    setSortedIds([]);
                }
            }
        };

        loadSortedIds();

        return () => {
            cancelled = true;
        };
    }, [apiUrl, isPublicRole]);

    useEffect(() => {
        if (!complaint) {
            return;
        }

        setAjPayload({
            ...ajPayloadDefault,
            offense_id: complaint.aj_offense_id ? String(complaint.aj_offense_id) : '',
            offense_type_id: complaint.aj_offense_type || '',
            khalwat_detail_id: complaint.aj_khalwat_detail_id ? String(complaint.aj_khalwat_detail_id) : '',
            judi_detail_id: complaint.aj_judi_detail_id ? String(complaint.aj_judi_detail_id) : '',
            notes: complaint.aj_notes || '',
            classification: complaint.aj_ppa_classification || '',
            supervisor_staff_id: complaint.aj_supervisor_staff_id ? String(complaint.aj_supervisor_staff_id) : '',
            ip_status: complaint.aj_ip_status || '',
            ip_due_date: complaint.aj_ip_due_date || '',
            kpp_due_date: complaint.aj_kpp_due_date || '',
            jpss_due_date: complaint.aj_jpss_due_date || '',
            investigation_notes: complaint.aj_investigation_notes || '',
            prosecution_status: complaint.aj_prosecution_status || '',
            prosecutor_staff_id: complaint.aj_prosecutor_staff_id ? String(complaint.aj_prosecutor_staff_id) : '',
            mahkamah_id: complaint.aj_mahkamah_id ? String(complaint.aj_mahkamah_id) : '',
            fine: complaint.aj_fine || '',
            prosecution_notes: complaint.aj_prosecution_notes || '',
            fir_no: complaint.aj_fir_no || '',
        });
        setAjReport({
            ...ajReportDefault,
            arrest_status: complaint.aj_arrest_status || '',
            male_count: complaint.aj_male_count ?? '',
            female_count: complaint.aj_female_count ?? '',
            other_count: complaint.aj_other_count ?? '',
            report_no: complaint.aj_report_no || '',
            action_datetime: complaint.aj_action_datetime || '',
            offense_id: complaint.aj_report_offense_id
                ? String(complaint.aj_report_offense_id)
                : (complaint.aj_offense_id ? String(complaint.aj_offense_id) : ''),
            arrest_by: complaint.aj_arrest_by || '',
            arrest_staff_id: complaint.aj_arrest_staff_id ? String(complaint.aj_arrest_staff_id) : '',
            statement_datetime: complaint.aj_statement_datetime || '',
            court_date: complaint.aj_court_date || '',
            report_notes: complaint.aj_report_notes || '',
            directive_staff_id: complaint.aj_directive_staff_id ? String(complaint.aj_directive_staff_id) : '',
            handover_staff_id: complaint.aj_handover_staff_id ? String(complaint.aj_handover_staff_id) : '',
            directive_at: complaint.aj_directive_at || '',
            directive_notes: complaint.aj_directive_notes || '',
            handover_at: complaint.handover_at || '',
            handover_notes: complaint.handover_notes || '',
            oyds: (complaint.oyds || []).length
                ? complaint.oyds.map((row) => ({
                    id: row.id,
                    name: row.name || '',
                    id_number: row.id_number || '',
                    investigator_name: row.investigator_name || '',
                    file_no: row.file_no || '',
                    media: row.media || [],
                }))
                : ajReportDefault.oyds,
            seizure_status: complaint.aj_seizure_status || '',
            seizure_items: (complaint.seizure_items || []).length
                ? complaint.seizure_items.map((row) => ({
                    id: row.id,
                    item_no: row.item_no || '',
                    description: row.description || '',
                    storage: row.storage || '',
                    media: row.media || [],
                }))
                : ajReportDefault.seizure_items,
        });
        const existingHistoryEntries = (complaint.action_updates || []).length
            ? complaint.action_updates.map((row) => ({
                classification: row.classification || '',
                action_date: row.action_date || '',
                action_time: row.action_time || '',
                note: row.note || '',
            }))
            : [];
        const derivedInitialHistory = existingHistoryEntries.length
            ? existingHistoryEntries
            : (complaint.aj_ppa_classification
                ? [{
                    classification: complaint.aj_ppa_classification || '',
                    action_date: complaint.complaint_date || '',
                    action_time: (complaint.complaint_time || '').slice(0, 5),
                    note: complaint.aj_notes || '',
                }]
                : ajActionReportDefault.history_entries);
        setAjActionReport({
            ...ajActionReportDefault,
            directive_staff_id: complaint.aj_directive_staff_id ? String(complaint.aj_directive_staff_id) : '',
            handover_staff_id: complaint.aj_handover_staff_id ? String(complaint.aj_handover_staff_id) : '',
            directive_at: complaint.aj_directive_at || '',
            directive_notes: complaint.aj_directive_notes || '',
            handover_at: complaint.handover_at || '',
            handover_notes: complaint.handover_notes || '',
            current_status: complaint.aj_current_status || '',
            case_register_no: complaint.case_register_no || '',
            op_category: complaint.aj_op_category || '',
            op_case_status: complaint.aj_op_case_status || '',
            op_notes: complaint.aj_op_notes || '',
            file_no: complaint.aj_file_no || '',
            history_entries: derivedInitialHistory,
        });
        setAkPayload({
            ...akPayloadDefault,
            offense_id: complaint.ak_offense_id ? String(complaint.ak_offense_id) : '',
            offense_type_id: complaint.ak_offense_type || '',
            investigation_datetime: complaint.ak_investigation_datetime || '',
            investigator_name: complaint.ak_investigator_name || '',
            investigator_staff_id: complaint.ak_investigator_staff_id ? String(complaint.ak_investigator_staff_id) : '',
            file_received_date: complaint.ak_file_received_date || '',
            ip_status: complaint.ak_ip_status || '',
            ip_due_date: complaint.ak_ip_due_date || '',
            prosecution_date: complaint.ak_prosecution_date || '',
            charge_recommendations: (complaint.ak_charge_recommendations || []).length
                ? complaint.ak_charge_recommendations.map((row) => ({
                    portfolio: row?.portfolio || '',
                    name: row?.name || '',
                    offense_id: row?.offense_id ? String(row.offense_id) : '',
                }))
                : [{ portfolio: '', name: '', offense_id: '' }],
            notes: complaint.ak_notes || '',
            supervisor_staff_id: complaint.ak_supervisor_staff_id ? String(complaint.ak_supervisor_staff_id) : '',
            prosecution_status: complaint.ak_prosecution_status || '',
            prosecution_notes: complaint.ak_prosecution_notes || '',
            prosecutor_staff_id: complaint.ak_prosecutor_staff_id ? String(complaint.ak_prosecutor_staff_id) : '',
            hearing_date: complaint.ak_hearing_date || '',
            mahkamah_id: complaint.ak_mahkamah_id ? String(complaint.ak_mahkamah_id) : '',
            court_decision: complaint.ak_court_decision || '',
            prosecution_charges: (complaint.ak_prosecution_charges || []).length
                ? complaint.ak_prosecution_charges.map((row) => ({
                    accused_name: row?.accused_name || '',
                    id_number: row?.id_number || '',
                    offense_id: row?.offense_id ? String(row.offense_id) : '',
                    case_no: row?.case_no || '',
                }))
                : [{ accused_name: '', id_number: '', offense_id: '', case_no: '' }],
        });
        setApproverStaffId(complaint.approver_staff_id ? String(complaint.approver_staff_id) : '');
    }, [complaint]);

    const updateReportField = (field, value) => {
        setAjReport((prev) => {
            if (field === 'arrest_status' && value === 'tiada') {
                return {
                    ...prev,
                    arrest_status: value,
                    male_count: '',
                    female_count: '',
                    other_count: '',
                    arrest_by: '',
                };
            }
            return { ...prev, [field]: value };
        });
    };

    const updateActionReportField = (field, value) => {
        setAjActionReport((prev) => ({ ...prev, [field]: value }));
    };

    const updateActionHistoryRow = (index, field, value) => {
        setAjActionReport((prev) => ({
            ...prev,
            history_entries: prev.history_entries.map((row, rowIndex) => (
                rowIndex === index ? { ...row, [field]: value } : row
            )),
        }));
    };

    const addActionHistoryRow = () => {
        setAjActionReport((prev) => ({
            ...prev,
            history_entries: [
                ...prev.history_entries,
                { classification: '', action_date: '', action_time: '', note: '' },
            ],
        }));
    };

    const removeActionHistoryRow = (index) => {
        setAjActionReport((prev) => {
            if (prev.history_entries.length <= 1) {
                return {
                    ...prev,
                    history_entries: [{ classification: '', action_date: '', action_time: '', note: '' }],
                };
            }

            return {
                ...prev,
                history_entries: prev.history_entries.filter((_, rowIndex) => rowIndex !== index),
            };
        });
    };

    const insertLaporanTindakanTemplate = () => {
        const offenseId = ajReport.offense_id || ajPayload.offense_id || '';
        if (!offenseId) {
            toast.error('Sila pilih Kesalahan dahulu.');
            return;
        }

        const offense = (offenseItems || []).find((item) => String(item.id) === String(offenseId));
        const suggestedKey = resolveTemplateKeyFromOffense(offense) || 'generic';
        const tpl = (LAPORAN_TINDAKAN_TEMPLATES || []).find((item) => item.key === suggestedKey)
            || (LAPORAN_TINDAKAN_TEMPLATES || []).find((item) => item.key === 'generic');

        if (!tpl) {
            toast.error('Template laporan tindakan tidak ditemui.');
            return;
        }

        const raw = (tpl.text || '').replace('{{OFFENSE}}', formatOffenseLabel(offense));
        const nextText = hydrateLaporanTindakanTemplate(normalizeLaporanTindakanPlaceholders(raw));
        const existing = (ajReport.report_notes || '').toString().trim();

        if (existing && existing !== nextText) {
            const ok = window.confirm('Laporan akan diganti dengan template yang dicadangkan. Teruskan?');
            if (!ok) return;
        }

        updateReportField('report_notes', nextText);
        toast.success('Template laporan dimasukkan.');
    };

    const updateOyds = (index, field, value) => {
        setAjReport((prev) => {
            const next = [...prev.oyds];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, oyds: next };
        });
    };

    const isOydRowEmpty = (row) => {
        const values = [
            row?.name,
            row?.id_number,
            row?.investigator_name,
            row?.file_no,
        ];
        return !values.some((value) => String(value || '').trim() !== '');
    };

    const ensureOydRecord = async (index, options = {}) => {
        const { allowEmpty = false } = options;
        const row = ajReport.oyds?.[index];
        if (!row || !apiUrl || !id) return null;
        if (row.id) return row.id;
        if (!allowEmpty && isOydRowEmpty(row)) return null;

        try {
            const payload = {
                name: row.name || '',
                id_number: row.id_number || '',
                investigator_name: row.investigator_name || '',
                file_no: row.file_no || '',
            };
            const response = await axios.post(
                `${apiUrl}/complaints/${id}/oyds`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const created = response?.data?.data;
            if (created?.id) {
                setAjReport((prev) => {
                    const next = [...(prev.oyds || [])];
                    if (!next[index]) return prev;
                    next[index] = {
                        ...next[index],
                        ...created,
                        media: created.media || next[index].media || [],
                    };
                    return { ...prev, oyds: next };
                });
                return created.id;
            }
            return null;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gagal cipta OYDS.');
            return null;
        }
    };

    const saveOydOnBlur = async (index) => {
        const row = ajReport.oyds?.[index];
        if (!row || !apiUrl || !id) return;
        if (!row.id) {
            await ensureOydRecord(index, { allowEmpty: false });
            return;
        }

        const payload = {
            name: row.name || '',
            id_number: row.id_number || '',
            investigator_name: row.investigator_name || '',
            file_no: row.file_no || '',
        };

        try {
            await axios.put(
                `${apiUrl}/complaints/${id}/oyds/${row.id}`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } },
            );
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gagal simpan maklumat OYDS.');
        }
    };

    const addOyds = () => {
        setAjReport((prev) => ({
            ...prev,
            oyds: [...prev.oyds, { id: null, name: '', id_number: '', investigator_name: '', file_no: '', media: [] }],
        }));
    };

    const removeOyds = (index) => {
        setAjReport((prev) => {
            const next = prev.oyds.filter((_, i) => i !== index);
            return { ...prev, oyds: next.length ? next : [{ id: null, name: '', id_number: '', investigator_name: '', file_no: '', media: [] }] };
        });
    };

    const onRemoveOyds = async (index) => {
        const ok = window.confirm('Padam row OYDS ini?');
        if (!ok) return;

        const row = ajReport.oyds?.[index];
        if (row?.id) {
            try {
                await axios.delete(`${apiUrl}/complaints/${id}/oyds/${row.id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                toast.success('OYDS dipadam.');
            } catch (error) {
                toast.error(error?.response?.data?.message || 'Gagal padam OYDS.');
                return;
            }
        }

        removeOyds(index);
    };

    const getOydDraftKey = (row, index) => (row?.id ? `id-${row.id}` : `idx-${index}`);

    const getOydDraft = (row, index) => {
        const key = getOydDraftKey(row, index);
        return oydUploadDrafts[key] || { category: 'ic', files: [], icImage: null, scanning: false };
    };

    const updateOydDraft = (row, index, patch) => {
        const key = getOydDraftKey(row, index);
        setOydUploadDrafts((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || { category: 'ic', files: [] }), ...patch },
        }));
    };



    const updateSeizureItem = (index, field, value) => {
        setAjReport((prev) => {
            const next = [...prev.seizure_items];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, seizure_items: next };
        });
    };

    const isSeizureRowEmpty = (row) => {
        const values = [
            row?.item_no,
            row?.description,
            row?.storage,
        ];
        return !values.some((value) => String(value || '').trim() !== '');
    };

    const ensureSeizureItemRecord = async (index, options = {}) => {
        const { allowEmpty = false } = options;
        const row = ajReport.seizure_items?.[index];
        if (!row || !apiUrl || !id) return null;
        if (row.id) return row.id;
        if (!allowEmpty && isSeizureRowEmpty(row)) return null;

        try {
            const payload = {
                item_no: row.item_no || '',
                description: row.description || '',
                storage: row.storage || '',
            };
            const response = await axios.post(
                `${apiUrl}/complaints/${id}/seizure-items`,
                payload,
                { headers: { Authorization: `Bearer ${token}` } },
            );
            const created = response?.data?.data;
            if (created?.id) {
                setAjReport((prev) => {
                    const next = [...(prev.seizure_items || [])];
                    if (!next[index]) return prev;
                    next[index] = {
                        ...next[index],
                        ...created,
                        media: created.media || next[index].media || [],
                    };
                    return { ...prev, seizure_items: next };
                });
                return created.id;
            }
            return null;
        } catch (error) {
            toast.error(error?.response?.data?.message || 'Gagal cipta Barang Kes.');
            return null;
        }
    };

    const addSeizureItem = () => {
        setAjReport((prev) => ({
            ...prev,
            seizure_items: [...prev.seizure_items, { id: null, item_no: '', description: '', storage: '', media: [] }],
        }));
    };

    const removeSeizureItem = (index) => {
        setAjReport((prev) => {
            const next = prev.seizure_items.filter((_, i) => i !== index);
            return { ...prev, seizure_items: next.length ? next : [{ id: null, item_no: '', description: '', storage: '', media: [] }] };
        });
    };

    const getSeizureDraftKey = (row, index) => (row?.id ? `id-${row.id}` : `idx-${index}`);

    const getSeizureDraft = (row, index) => {
        const key = getSeizureDraftKey(row, index);
        return seizureUploadDrafts[key] || { category: 'bukti', files: [] };
    };

    const updateSeizureDraft = (row, index, patch) => {
        const key = getSeizureDraftKey(row, index);
        setSeizureUploadDrafts((prev) => ({
            ...prev,
            [key]: { ...(prev[key] || { category: 'bukti', files: [] }), ...patch },
        }));
    };

    const openAppointmentCalendar = () => {
        const baseDate = akPayload.investigation_datetime
            ? new Date(akPayload.investigation_datetime)
            : new Date();
        const dateKey = baseDate.toLocaleDateString('en-CA', { timeZone: 'Asia/Kuala_Lumpur' });
        const url = `/app/appointments/popup?date=${dateKey}`;
        window.open(url, 'temujanjiKalendar', 'width=1100,height=780,scrollbars=yes');
    };

    const toggleReportSection = (key) => {
        setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    const submitApproval = () => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionMessage('');
        axios.post(`${apiUrl}/complaints/${id}/approve`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const msg = response?.data?.message || 'Aduan telah disahkan.';
                setActionMessage(msg);
                toast.success(msg);
                setApprovalMeta((prev) => ({
                    ...prev,
                    approvals_count: response?.data?.approvals_count ?? prev.approvals_count,
                    has_approved: true,
                }));
                const updated = response?.data?.data;
                setComplaint((prev) => {
                    if (!prev) {
                        return prev;
                    }
                    if (updated) {
                        return { ...prev, ...updated };
                    }
                    return { ...prev, current_stage: response?.data?.current_stage };
                });
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal mengesahkan aduan.';
                setActionMessage(msg);
                toast.error(msg);
            });
    };

    const submitStatus = () => {
        if (!apiUrl || !statusInput) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionMessage('');
        axios.post(`${apiUrl}/complaints/${id}/status`, {
            status: statusInput,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setActionMessage('Status berjaya dikemaskini.');
                setComplaint((prev) => prev ? { ...prev, current_stage: response?.data?.current_stage } : prev);
            })
            .catch((err) => {
                setActionMessage(err?.response?.data?.message || 'Gagal kemaskini status.');
            });
    };

    const updateCaseType = (nextType) => {
        if (!apiUrl || !nextType || nextType === complaint?.case_type) {
            return;
        }
        const token = localStorage.getItem('token');
        setCaseTypeMessage('');
        axios.post(`${apiUrl}/complaints/${id}/case-type`, {
            case_type: nextType,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                setComplaint((prev) => prev ? { ...prev, case_type: nextType } : prev);
                setActiveStep(0);
                setCaseTypeMessage('Kategori aduan dikemaskini.');
            })
            .catch((err) => {
                setCaseTypeMessage(err?.response?.data?.message || 'Gagal kemaskini kategori.');
            });
    };

    const submitAjPayload = () => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setPayloadMessage('');
        axios.post(`${apiUrl}/complaints/${id}/aj`, {
            // Keep fir_no consistent with reference_no (Zoho field is effectively No Aduan).
            payload: { ...ajPayload, fir_no: complaint?.reference_no || ajPayload.fir_no || '' },
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setPayloadMessage('Maklumat telah dikemaskini.');
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }

                // Save Borang 5 statement (kept in complaints table) together with the selected offense.
                if (id) {
                    return axios.post(`${apiUrl}/complaints/${id}/basic`, {
                        borang5_statement: basicDraft.borang5_statement || '',
                        offense_id: ajPayload.offense_id || null,
                    }, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    })
                        .then((basicResponse) => {
                            const latest = basicResponse?.data?.data;
                            if (latest) {
                                setComplaint((prev) => prev ? { ...prev, ...latest } : prev);
                            }
                            toast.success('Maklumat telah dikemaskini.');
                        })
                        .catch(() => {
                            toast.error('Gagal kemaskini maklumat.');
                        });
                }
                return undefined;
            })
            .catch((err) => {
                setPayloadMessage(err?.response?.data?.message || 'Gagal kemaskini AJ.');
            });
    };

    const submitAkPayload = () => {
        if (!apiUrl) {
            return;
        }
        if (!akPayload.offense_id) {
            const msg = 'Sila pilih Kesalahan Disyaki dahulu.';
            setPayloadMessage(msg);
            toast.error(msg);
            return;
        }
        const token = localStorage.getItem('token');
        setPayloadMessage('');
        axios.post(`${apiUrl}/complaints/${id}/ak`, {
            payload: akPayload,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setPayloadMessage('Maklumat telah dikemaskini.');
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }

                if (id) {
                    return axios.post(`${apiUrl}/complaints/${id}/basic`, {
                        borang5_statement: basicDraft.borang5_statement || '',
                        offense_id: akPayload.offense_id || null,
                    }, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    })
                        .then((basicResponse) => {
                            const latest = basicResponse?.data?.data;
                            if (latest) {
                                setComplaint((prev) => prev ? { ...prev, ...latest } : prev);
                            }
                            toast.success('Maklumat telah dikemaskini.');
                        })
                        .catch(() => {
                            toast.error('Gagal kemaskini maklumat.');
                        });
                }
                return undefined;
            })
            .catch((err) => {
                setPayloadMessage(err?.response?.data?.message || 'Gagal kemaskini AK.');
            });
    };

    const submitAjReport = () => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setReportMessage('');
        axios.post(`${apiUrl}/complaints/${id}/aj-report`, {
            report: ajReport,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setReportMessage('Laporan pemeriksaan dikemaskini.');
                toast.success('Laporan pemeriksaan dikemaskini.');
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal kemaskini laporan.';
                setReportMessage(msg);
                toast.error(msg);
            });
    };

    const submitAjActionReport = () => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        setActionReportMessage('');
        axios.post(`${apiUrl}/complaints/${id}/aj-action-report`, {
            report: {
                ...ajActionReport,
                history_entries: (ajActionReport.history_entries || []).map((row) => ({
                    classification: row.classification || '',
                    action_date: row.action_date || null,
                    action_time: row.action_time || '',
                    note: row.note || '',
                })),
            },
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
                const msg = response?.data?.message || 'Laporan tindakan dikemaskini.';
                setActionReportMessage(msg);
                toast.success(msg);
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal kemaskini laporan tindakan.';
                setActionReportMessage(msg);
                toast.error(msg);
            });
    };

    const submitAssignees = () => {
        if (!apiUrl) {
            return;
        }
        if ((complaint?.case_type || 'AJ') === 'AJ') {
            const missingFields = [];
            const classification = (ajPayload.classification || '').toString().trim();
            const offenseId = (ajPayload.offense_id || '').toString().trim();
            const borang5Statement = (basicDraft.borang5_statement || '').toString().trim();

            if (!classification) {
                missingFields.push('Klasifikasi');
            }
            if (!offenseId) {
                missingFields.push('Kesalahan Disyaki');
            }
            if (!borang5Statement) {
                missingFields.push('Butiran Aduan (Borang 5)');
            }

            if (missingFields.length > 0) {
                const msg = `Sila isi medan wajib dahulu: ${missingFields.join(', ')}. Kemudian klik Simpan sebelum Hantar Pengesahan.`;
                setAssigneeMessage(msg);
                toast.error(msg);
                return;
            }

            const savedClassification = (complaint?.aj_ppa_classification || '').toString().trim();
            const savedOffenseId = complaint?.aj_offense_id ? String(complaint.aj_offense_id) : '';
            const savedBorang5 = (complaint?.borang5_statement || '').toString().trim();
            const hasUnsavedAjChanges =
                classification !== savedClassification
                || offenseId !== savedOffenseId
                || borang5Statement !== savedBorang5;

            if (hasUnsavedAjChanges) {
                const msg = 'Sila klik Simpan dahulu untuk rekodkan Klasifikasi, Kesalahan Disyaki dan Butiran Aduan (Borang 5), kemudian baru Hantar Pengesahan.';
                setAssigneeMessage(msg);
                toast.error(msg);
                return;
            }
        }
        const token = localStorage.getItem('token');
        setAssigneeMessage('');
        axios.post(`${apiUrl}/complaints/${id}/assignees`, {
            approver_staff_id: approverStaffId || null,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setComplaint((prev) => prev ? { ...prev, ...response?.data?.data } : prev);
                const msg = response?.data?.message || 'Maklumat aduan telah dihantar kepada pengesah untuk pengesahan. Status: Menunggu Pengesahan.';
                setAssigneeMessage(msg);
                toast.success(msg);
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || 'Gagal kemaskini pegawai.';
                setAssigneeMessage(msg);
                toast.error(msg);
            });
    };

    const canReleaseIntakeLock = useCallback(() => {
        const receiverName = (complaint?.received_by?.name || complaint?.receivedBy?.name || '').trim().toLowerCase();
        return Boolean(
            apiUrl
            && complaint
            && complaint.current_stage === 'baru'
            && localUserName
            && receiverName
            && receiverName === localUserName
        );
    }, [apiUrl, complaint, localUserName]);

    const releaseIntakeLockQuietly = useCallback(() => {
        if (!canReleaseIntakeLock()) {
            return;
        }

        fetch(`${apiUrl}/complaints/${id}/release-intake`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            body: '{}',
            keepalive: true,
        }).catch(() => {});
    }, [apiUrl, canReleaseIntakeLock, id, token]);

    const handleNavigateBackToList = useCallback(() => {
        suppressUnloadReleaseRef.current = true;
        releaseIntakeLockQuietly();
        navigate('/app/complaints');
    }, [navigate, releaseIntakeLockQuietly]);

    const handleNext = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex === -1 || currentIndex === sortedIds.length - 1) {
            return;
        }
        suppressUnloadReleaseRef.current = true;
        releaseIntakeLockQuietly();
        const nextId = sortedIds[currentIndex + 1];
        navigate(`/app/complaints/${nextId}`);
    };

    const handlePrev = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex <= 0) {
            return;
        }
        suppressUnloadReleaseRef.current = true;
        releaseIntakeLockQuietly();
        const prevId = sortedIds[currentIndex - 1];
        navigate(`/app/complaints/${prevId}`);
    };

    const currentCaseType = complaint?.case_type || 'AJ';
    const akSubtype = (complaint?.ak_subtype || '').toLowerCase();
    const isAkFamilyDetail = currentCaseType === 'AK' && ['nikah', 'cerai', 'rujuk', 'poligami'].includes(akSubtype);
    const akEventNoun = ['nikah', 'poligami'].includes(akSubtype) ? 'Nikah' : 'Cerai';
    const akDetailSectionTitle = akSubtype === 'rujuk'
        ? 'Rujuk'
        : akSubtype === 'poligami'
            ? 'Poligami'
            : akEventNoun;
    const isCaseTypeLocked = Boolean(complaint?.approver_confirmed_at) || complaint?.current_stage === 'disahkan';
    const isAwaitingApproval = complaint?.current_stage === 'tunggu_pengesahan' && !complaint?.approver_confirmed_at;
    const approverName = (complaint?.approverStaff?.name || '').trim().toLowerCase();
    const canApprove = Boolean(
        !complaint?.approver_confirmed_at
        && (
            approvalMeta.is_assigned_approver
            || (localStaffId && String(complaint?.approver_staff_id || '') === String(localStaffId))
            || (localUserName && approverName && localUserName === approverName)
        )
    );
    const isAkFirstIntakeSave = currentCaseType === 'AK'
        && complaint?.current_stage === 'baru'
        && !complaint?.approver_confirmed_at;
    const steps = currentCaseType === 'AK' ? AK_STEPS : AJ_STEPS;
    const isApproved = currentCaseType === 'AK'
        ? true
        : Boolean(complaint?.approver_confirmed_at);
    const lockedStepKeys = useMemo(() => {
        if (currentCaseType === 'AK') {
            return [];
        }
        return ['laporan_tindakan', 'laporan_pemeriksaan', 'siasatan', 'pendakwaan'];
    }, [currentCaseType]);
    const isStepLocked = useCallback((key) => (!isApproved && lockedStepKeys.includes(key)), [isApproved, lockedStepKeys]);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const stepFromQuery = (params.get('step') || '').trim();
        if (!stepFromQuery) {
            setActiveStep(0);
            return;
        }
        const foundIndex = steps.findIndex((s) => s.key === stepFromQuery);
        setActiveStep(foundIndex >= 0 ? foundIndex : 0);
    }, [id, currentCaseType, location.search, steps]);

    const activeKey = steps[activeStep]?.key;
    useEffect(() => {
        if (activeKey && isStepLocked(activeKey)) {
            setActiveStep(0);
        }
    }, [activeKey, isStepLocked]);

    useEffect(() => {
        if (!apiUrl || !token || !id || !complaint || !isPegawaiRole) {
            return;
        }

        const guardKey = String(id);
        const receiverName = (complaint?.received_by?.name || complaint?.receivedBy?.name || '').trim();
        if ((complaint.current_stage || '') !== 'baru' || receiverName) {
            return;
        }
        if (autoPickupGuardRef.current[guardKey]) {
            return;
        }

        autoPickupGuardRef.current[guardKey] = true;

        axios.post(`${apiUrl}/complaints/${id}/pickup`, {}, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((response) => {
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => (prev ? { ...prev, ...updated } : prev));
                }
            })
            .catch((err) => {
                const msg = err?.response?.data?.message || '';
                if (msg) {
                    setActionMessage(msg);
                }
            });
    }, [apiUrl, complaint, id, isPegawaiRole, token]);

    useEffect(() => {
        if (!apiUrl || !token || !id || !complaint) {
            return undefined;
        }

        const reloadKey = `complaint-intake-reload-${id}`;
        const navigationEntry = window.performance?.getEntriesByType?.('navigation')?.[0];
        const isReload = navigationEntry?.type === 'reload';
        const reloadMarker = sessionStorage.getItem(reloadKey);
        const receiverName = (complaint?.received_by?.name || complaint?.receivedBy?.name || '').trim().toLowerCase();

        if (
            isReload
            && reloadMarker
            && complaint.current_stage === 'baru'
            && localUserName
            && !receiverName
        ) {
            axios.post(`${apiUrl}/complaints/${id}/pickup`, {}, {
                headers: { Authorization: `Bearer ${token}` },
            })
                .then((response) => {
                    const updated = response?.data?.data;
                    if (updated) {
                        setComplaint((prev) => (prev ? { ...prev, ...updated } : prev));
                    }
                })
                .catch(() => {
                    // Silent restore attempt. User can still continue manually if needed.
                })
                .finally(() => {
                    sessionStorage.removeItem(reloadKey);
                });
        } else if (reloadMarker) {
            sessionStorage.removeItem(reloadKey);
        }

        const handlePageHide = () => {
            if (!canReleaseIntakeLock() || suppressUnloadReleaseRef.current) {
                return;
            }

            sessionStorage.setItem(reloadKey, String(Date.now()));
            releaseIntakeLockQuietly();
        };

        window.addEventListener('pagehide', handlePageHide);
        return () => {
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [apiUrl, canReleaseIntakeLock, complaint, id, localUserName, releaseIntakeLockQuietly, token]);
    // NOTE: For offenses, prefer SharedOffenseSelect (it loads options from API).
    const offenseOptions = useMemo(() => ([]), []);
    const offenseTypeOptions = useMemo(() => (
        referenceData.offenseTypes.map((item) => ({
            value: String(item.id),
            label: item.name,
        }))
    ), [referenceData.offenseTypes]);
    const khalwatOptions = useMemo(() => (
        referenceData.khalwatDetails.map((item) => ({
            value: String(item.id),
            label: item.name,
        }))
    ), [referenceData.khalwatDetails]);
    const judiOptions = useMemo(() => (
        referenceData.judiDetails.map((item) => ({
            value: String(item.id),
            label: item.name,
        }))
    ), [referenceData.judiDetails]);

    if (isLoading) {
        return (
            <div className="app-detail">
                <div className="app-card app-detail-skeleton">
                    <div className="app-skeleton-stack">
                        <span className="app-skeleton-line app-skeleton-line--md"></span>
                        <span className="app-skeleton-line app-skeleton-line--lg"></span>
                    </div>
                </div>
                <div className="app-detail-grid">
                    <div className="app-card">
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--md"></span>
                            <span className="app-skeleton-line"></span>
                            <span className="app-skeleton-line"></span>
                        </div>
                    </div>
                    <div className="app-card">
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--md"></span>
                            <span className="app-skeleton-line"></span>
                            <span className="app-skeleton-line"></span>
                        </div>
                    </div>
                </div>
                <div className="app-card">
                    <div className="app-skeleton-stack">
                        <span className="app-skeleton-line app-skeleton-line--md"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                    </div>
                </div>
                <div className="app-card">
                    <div className="app-skeleton-stack">
                        <span className="app-skeleton-line app-skeleton-line--md"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return <div className="app-card">{error}</div>;
    }

    if (!complaint) {
        return <div className="app-card">Aduan tidak ditemui.</div>;
    }

    return (
        <div className="app-detail app-aduan-detail">
            <div className="app-detail-header" ref={detailHeaderRef}>
                <div className="app-detail-header-block">
                    <button
                        type="button"
                        className="app-back app-back-button"
                        onClick={handleNavigateBackToList}
                    >
                        <i className="bi bi-arrow-left"></i>
                        Kembali ke Senarai
                    </button>
                    <span className="app-detail-kicker">No Aduan</span>
                    <div className="app-detail-number">
                        <div className="app-detail-number-main">
                            <h6>{complaint.reference_no || '-'}</h6>
                            <div className="app-detail-status-row">
                                <span className="app-detail-status-label">Status Aduan :</span>
                                <span className="app-status-pill">
                                    {isPublicRole
                                        ? getPublicComplaintStageLabel(complaint.current_stage || 'baru', complaint)
                                        : getComplaintStageLabel(complaint.current_stage || 'baru')}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="app-detail-actions">
                    <div className="app-detail-actions-row">
                        <button
                            className="app-button app-button-ghost"
                            type="button"
                            onClick={handlePrev}
                            disabled={sortedIds.indexOf(Number(id)) <= 0}
                        >
                            <i className="bi bi-arrow-left"></i>
                            Sebelum
                        </button>
                        <button
                            className="app-button"
                            type="button"
                            onClick={handleNext}
                            disabled={sortedIds.indexOf(Number(id)) === sortedIds.length - 1}
                        >
                            Seterusnya
                            <i className="bi bi-arrow-right"></i>
                        </button>
                    </div>
                </div>
            </div>

            <div className="app-detail-grid">
                <div className="app-card app-span-full">
                    <div className="app-card-header has-submeta">
                        <h4>Maklumat Aduan</h4>
                        <div className="app-detail-submeta app-detail-submeta--inline" aria-label="Maklumat penghantaran aduan">
                            <div className="app-detail-submeta-item">
                                <span className="app-detail-submeta-label">Tahun</span>
                                <strong>{complaint.complaint_year || '-'}</strong>
                            </div>
                            <div className="app-detail-submeta-item">
                                <span className="app-detail-submeta-label">Tarikh</span>
                                <strong>{complaint.complaint_date || '-'}</strong>
                            </div>
                            <div className="app-detail-submeta-item">
                                <span className="app-detail-submeta-label">Masa</span>
                                <strong>{complaint.complaint_time ? String(complaint.complaint_time).slice(0, 5) : '-'}</strong>
                            </div>
                            <div className="app-detail-submeta-item">
                                <span className="app-detail-submeta-label">Kaedah Aduan</span>
                                <strong>{formatChannelLabel(complaint.channel)}</strong>
                            </div>
                            <div className="app-detail-submeta-item">
                                <span className="app-detail-submeta-label">Dihantar</span>
                                <strong>{complaint.submitted_at ? formatDateTime(complaint.submitted_at) : '-'}</strong>
                            </div>
                        </div>
                        {isPegawaiRole && isBasicEditLockedBySource && (
                            <div className="app-detail-note">
                                Aduan dari portal atau WhatsApp AI hanya boleh disemak. Kemaskini asas dikunci untuk pegawai.
                            </div>
                        )}
                        {String(complaint?.channel || '').toLowerCase() === 'portal' && (
                            <div className="app-detail-note app-detail-note--soft">
                                <strong>Persetujuan Pengadu:</strong>{' '}
                                {complaint?.consent_accepted ? 'Diterima' : 'Tidak direkodkan'}
                                {complaint?.consent_accepted_at ? ` pada ${formatDateTime(complaint.consent_accepted_at)}` : ''}
                            </div>
                        )}
                    </div>

                    {!basicEditing && basicMessage && (
                        <SharedInlineAlert
                            type="success"
                            message={basicMessage}
                            dismissible
                            onClose={() => setBasicMessage('')}
                        />
                    )}

                    {!basicEditing && (
                        <div className="app-basic-kv">
                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>Butir-butir Pengadu</h5>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Nama Pengadu</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.complainant_name}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('complainant_name', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">No K/P Pengadu</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.identification_number}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('identification_number', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Pekerjaan Pengadu</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.complainant_occupation}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('complainant_occupation', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">No Telefon Pengadu</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.contact_number}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('contact_number', next)}
                                        />
                                    </span>
                                </div>
                            </div>

                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>{isAkFamilyDetail ? `Maklumat Tambahan ${akDetailSectionTitle}` : 'Maklumat Kejadian'}</h5>
                                </div>
                                {currentCaseType === 'AK' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Subkategori Keluarga</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_subtype || ''}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                mode="select"
                                                options={[
                                                    { value: 'nikah', label: 'Nikah' },
                                                    { value: 'cerai', label: 'Cerai' },
                                                    { value: 'rujuk', label: 'Rujuk' },
                                                    { value: 'poligami', label: 'Poligami' },
                                                ]}
                                                formatDisplay={() => {
                                                    const value = (complaint.ak_subtype || '').toLowerCase();
                                                    if (value === 'nikah') return 'Nikah';
                                                    if (value === 'cerai') return 'Cerai';
                                                    if (value === 'rujuk') return 'Rujuk';
                                                    if (value === 'poligami') return 'Poligami';
                                                    return '-';
                                                }}
                                                onConfirm={(next) => saveBasicField('ak_subtype', next || null)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {isAkFamilyDetail && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Nama Pasangan</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_partner_name}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                maxLength={255}
                                                onConfirm={(next) => saveBasicField('ak_partner_name', next)}
                                            />
                                        </span>
                                    </div>
                                )}
                                <div className="app-kv">
                                    <span className="app-kv-label">{isAkFamilyDetail ? `Tarikh ${akEventNoun}` : 'Tarikh Kejadian'}</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={isAkFamilyDetail ? complaint.ak_event_date : complaint.incident_date}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            inputType="date"
                                            onConfirm={(next) => saveBasicField(isAkFamilyDetail ? 'ak_event_date' : 'incident_date', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">{isAkFamilyDetail ? `Masa ${akEventNoun}` : 'Masa Kejadian'}</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={isAkFamilyDetail
                                                ? (complaint.ak_event_time ? String(complaint.ak_event_time).slice(0, 5) : '')
                                                : (complaint.incident_time ? String(complaint.incident_time).slice(0, 5) : '')}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            inputType="time"
                                            onConfirm={(next) => saveBasicField(isAkFamilyDetail ? 'ak_event_time' : 'incident_time', next)}
                                        />
                                    </span>
                                </div>
                                {isAkFamilyDetail && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">{`Tempat ${akEventNoun}`}</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_event_place}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                maxLength={255}
                                                onConfirm={(next) => saveBasicField('ak_event_place', next)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {akSubtype === 'rujuk' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Tarikh Rujuk</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_rujuk_date}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                inputType="date"
                                                onConfirm={(next) => saveBasicField('ak_rujuk_date', next)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {['cerai', 'rujuk'].includes((complaint?.ak_subtype || '').toLowerCase()) && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Bilangan Perceraian</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_cerai_count ? String(complaint.ak_cerai_count) : ''}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                mode="select"
                                                options={COUNT_SELECT_OPTIONS}
                                                onConfirm={(next) => saveBasicField('ak_cerai_count', next || null)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {akSubtype === 'cerai' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Bilangan Talaq</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_cerai_talaq_count ? String(complaint.ak_cerai_talaq_count) : ''}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                mode="select"
                                                options={COUNT_SELECT_OPTIONS}
                                                onConfirm={(next) => saveBasicField('ak_cerai_talaq_count', next || null)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {akSubtype === 'poligami' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Bilangan Perkahwinan</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_poligami_marriage_count ? String(complaint.ak_poligami_marriage_count) : ''}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                inputType="number"
                                                onConfirm={(next) => saveBasicField('ak_poligami_marriage_count', next || null)}
                                            />
                                        </span>
                                    </div>
                                )}
                                {akSubtype === 'poligami' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Bilangan Isteri</span>
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.ak_poligami_wife_count ? String(complaint.ak_poligami_wife_count) : ''}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                inputType="number"
                                                onConfirm={(next) => saveBasicField('ak_poligami_wife_count', next || null)}
                                            />
                                        </span>
                                    </div>
                                )}
                                <div className="app-kv">
                                    <span className="app-kv-label">Daerah</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.district_id ? String(complaint.district_id) : ''}
                                            placeholder="-"
                                            canEdit={canEditBasicComplaint}
                                            mode="select"
                                            options={districtOptions.map((d) => ({ value: String(d.id), label: d.name }))}
                                            formatDisplay={() => complaint.district_name || '-'}
                                            onConfirm={(next) => saveBasicField('district_id', next ? String(next) : null)}
                                        />
                                    </span>
                                </div>
                                {!isAkFamilyDetail && (
                                    <div className="app-kv app-kv--stack">
                                        <span className="app-kv-label">{isAkFamilyDetail ? `Lokasi ${akEventNoun}` : 'Alamat'}</span>
                                        <div className="app-kv-stack">
                                            <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={isAkFamilyDetail ? complaint.ak_event_location : complaint.address}
                                                placeholder="-"
                                                canEdit={canEditBasicComplaint}
                                                mode="textarea"
                                                fullWidth
                                                maxLength={1000}
                                                    onConfirm={(next) => saveBasicField(isAkFamilyDetail ? 'ak_event_location' : 'address', next)}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {basicEditing && (
                        <div className="app-basic-kv">
                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>Butir-butir Pengadu</h5>
                                </div>
                                <div className="app-form-grid app-form-grid-single">
                                    <label className="app-form-field">
                                        <span>Nama Pengadu</span>
                                        <input
                                            type="text"
                                            value={basicDraft.complainant_name}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, complainant_name: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>No K/P Pengadu</span>
                                        <input
                                            type="text"
                                            value={basicDraft.identification_number}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, identification_number: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>Pekerjaan Pengadu</span>
                                        <input
                                            type="text"
                                            value={basicDraft.complainant_occupation}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, complainant_occupation: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>No Telefon Pengadu</span>
                                        <input
                                            type="text"
                                            value={basicDraft.contact_number}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, contact_number: event.target.value }))}
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>{isAkFamilyDetail ? `Maklumat Tambahan ${akDetailSectionTitle}` : 'Maklumat Kejadian'}</h5>
                                </div>
                                <div className="app-form-grid">
                                    {currentCaseType === 'AK' && (
                                        <label className="app-form-field app-span-full">
                                            <span>Subkategori Keluarga</span>
                                            <select
                                                value={basicDraft.ak_subtype}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_subtype: event.target.value }))}
                                            >
                                                <option value="">-- Pilih Subkategori --</option>
                                                <option value="nikah">Nikah</option>
                                                <option value="cerai">Cerai</option>
                                                <option value="rujuk">Rujuk</option>
                                                <option value="poligami">Poligami</option>
                                            </select>
                                        </label>
                                    )}
                                    {isAkFamilyDetail && (
                                        <label className="app-form-field app-span-full">
                                            <span>Nama Pasangan</span>
                                            <input
                                                type="text"
                                                value={basicDraft.ak_partner_name}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_partner_name: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                    {['cerai', 'rujuk'].includes((basicDraft.ak_subtype || '').toLowerCase()) && (
                                        <label className="app-form-field app-span-full">
                                            <span>Bilangan Perceraian</span>
                                            <select
                                                value={basicDraft.ak_cerai_count}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_cerai_count: event.target.value }))}
                                            >
                                                <option value="">-- Pilih Bilangan Perceraian --</option>
                                                {COUNT_SELECT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {(basicDraft.ak_subtype || '').toLowerCase() === 'cerai' && (
                                        <label className="app-form-field app-span-full">
                                            <span>Bilangan Talaq</span>
                                            <select
                                                value={basicDraft.ak_cerai_talaq_count}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_cerai_talaq_count: event.target.value }))}
                                            >
                                                <option value="">-- Pilih Bilangan Talaq --</option>
                                                {COUNT_SELECT_OPTIONS.map((option) => (
                                                    <option key={option.value} value={option.value}>{option.label}</option>
                                                ))}
                                            </select>
                                        </label>
                                    )}
                                    {(basicDraft.ak_subtype || '').toLowerCase() === 'poligami' && (
                                        <label className="app-form-field">
                                            <span>Bilangan Perkahwinan</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={basicDraft.ak_poligami_marriage_count}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_poligami_marriage_count: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                    {(basicDraft.ak_subtype || '').toLowerCase() === 'poligami' && (
                                        <label className="app-form-field">
                                            <span>Bilangan Isteri</span>
                                            <input
                                                type="number"
                                                min="1"
                                                value={basicDraft.ak_poligami_wife_count}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_poligami_wife_count: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                    <label className="app-form-field">
                                        <span>{isAkFamilyDetail ? `Tarikh ${akEventNoun}` : 'Tarikh'}</span>
                                        <input
                                            type="date"
                                            value={isAkFamilyDetail ? basicDraft.ak_event_date : basicDraft.complaint_date}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, [isAkFamilyDetail ? 'ak_event_date' : 'complaint_date']: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>{isAkFamilyDetail ? `Masa ${akEventNoun}` : 'Masa'}</span>
                                        <input
                                            type="time"
                                            value={isAkFamilyDetail ? basicDraft.ak_event_time : basicDraft.complaint_time}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, [isAkFamilyDetail ? 'ak_event_time' : 'complaint_time']: event.target.value }))}
                                        />
                                    </label>
                                    {isAkFamilyDetail && (
                                        <label className="app-form-field app-span-full">
                                            <span>{`Tempat ${akEventNoun}`}</span>
                                            <input
                                                type="text"
                                                value={basicDraft.ak_event_place}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_event_place: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                    {basicDraft.ak_subtype === 'rujuk' && (
                                        <label className="app-form-field app-span-full">
                                            <span>Tarikh Rujuk</span>
                                            <input
                                                type="date"
                                                value={basicDraft.ak_rujuk_date}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, ak_rujuk_date: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                    <label className="app-form-field app-span-full">
                                        <span>Daerah</span>
                                        <select
                                            value={basicDraft.district_id}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, district_id: event.target.value }))}
                                        >
                                            <option value="">-- Pilih Daerah --</option>
                                            {districtOptions.map((d) => (
                                                <option key={d.id} value={String(d.id)}>{d.name}</option>
                                            ))}
                                        </select>
                                    </label>
                                {!isAkFamilyDetail && (
                                        <label className="app-form-field app-span-full">
                                            <span>{isAkFamilyDetail ? `Lokasi ${akEventNoun}` : 'Alamat'}</span>
                                            <textarea
                                                rows="4"
                                                value={isAkFamilyDetail ? basicDraft.ak_event_location : basicDraft.address}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, [isAkFamilyDetail ? 'ak_event_location' : 'address']: event.target.value }))}
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="app-card-section">
                        <div className="app-card-subheader">
                            <h5>Ringkasan Aduan (Pengadu)</h5>
                        </div>

                        {!basicEditing && (
                            <div className="app-detail-stack">
                                <div
                                    className={`app-readonly-textarea ${summaryExpanded ? '' : 'is-clamped'}`}
                                    role="textbox"
                                    aria-readonly="true"
                                >
                                    {complaint.summary || '-'}
                                </div>
                                {complaint.summary && complaint.summary.length > 140 && (
                                    <button
                                        type="button"
                                        className="app-link app-link-button app-link-subtle"
                                        onClick={() => setSummaryExpanded((prev) => !prev)}
                                    >
                                        {summaryExpanded ? 'Tutup' : 'Baca lagi'}
                                    </button>
                                )}
                            </div>
                        )}

                        {basicEditing && (
                            <div className="app-form-field">
                                <textarea
                                    rows="6"
                                    value={basicDraft.summary}
                                    onChange={(event) => setBasicDraft((prev) => ({ ...prev, summary: event.target.value }))}
                                />
                            </div>
                        )}

                        {isAkFamilyDetail && (
                            <div className="app-card-subsection">
                                <div className="app-card-subheader">
                                    <h5>{`Lampiran Dokumen ${akDetailSectionTitle}`}</h5>
                                </div>
                                <SharedAttachmentSection
                                    apiUrl={apiUrl}
                                    token={token}
                                    recordId={complaint.id}
                                    attachments={complaint.attachments || []}
                                    canUpload={false}
                                    canDelete={false}
                                    getDownloadUrl={({ apiUrl: baseUrl, attachment }) => {
                                        if (attachment?.download_url) {
                                            return attachment.download_url;
                                        }
                                        if (!baseUrl || !complaint?.id || !attachment?.id) {
                                            return '';
                                        }
                                        return `${baseUrl}/complaints/${complaint.id}/attachments/${attachment.id}/download`;
                                    }}
                                />
                            </div>
                        )}

                        <div className="app-detail-meta">
                            <span>Kaedah Aduan:</span>
                            <strong>{formatChannelLabel(complaint.channel)}</strong>
                        </div>
                        {!shouldHideInformantSection && (
                            <>
                                <div className="app-card-subheader">
                                    <h5>Butir-butir Pemberi Maklumat</h5>
                                </div>
                                {!basicEditing && (
                                    <div className="app-detail-stack">
                                        <div className="app-kv">
                                            <span className="app-kv-label">Nama Pemberi Maklumat</span>
                                            <span className="app-kv-value">
                                                <SharedInlineEditText
                                                    value={effectiveInformantName}
                                                    placeholder="-"
                                                    canEdit={canEditBasicComplaint}
                                                    maxLength={255}
                                                    onConfirm={(next) => saveBasicField('informant_name', next)}
                                                />
                                            </span>
                                        </div>
                                        <div className="app-kv">
                                            <span className="app-kv-label">No K/P Pemberi Maklumat</span>
                                            <span className="app-kv-value">
                                                <SharedInlineEditText
                                                    value={effectiveInformantIdNumber}
                                                    placeholder="-"
                                                    canEdit={canEditBasicComplaint}
                                                    maxLength={255}
                                                    onConfirm={(next) => saveBasicField('informant_identification_number', next)}
                                                />
                                            </span>
                                        </div>
                                        <div className="app-kv">
                                            <span className="app-kv-label">No Telefon Pemberi Maklumat</span>
                                            <span className="app-kv-value">
                                                <SharedInlineEditText
                                                    value={effectiveInformantContactNumber}
                                                    placeholder="-"
                                                    canEdit={canEditBasicComplaint}
                                                    maxLength={255}
                                                    onConfirm={(next) => saveBasicField('informant_contact_number', next)}
                                                />
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {basicEditing && (
                                    <div className="app-form-grid app-form-grid-single">
                                        <label className="app-form-field">
                                            <span>Nama Pemberi Maklumat</span>
                                            <input
                                                type="text"
                                                value={basicDraft.informant_name}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, informant_name: event.target.value }))}
                                            />
                                        </label>
                                        <label className="app-form-field">
                                            <span>No K/P Pemberi Maklumat</span>
                                            <input
                                                type="text"
                                                value={basicDraft.informant_identification_number}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, informant_identification_number: event.target.value }))}
                                            />
                                        </label>
                                        <label className="app-form-field">
                                            <span>No Telefon Pemberi Maklumat</span>
                                            <input
                                                type="text"
                                                value={basicDraft.informant_contact_number}
                                                onChange={(event) => setBasicDraft((prev) => ({ ...prev, informant_contact_number: event.target.value }))}
                                            />
                                        </label>
                                    </div>
                                )}
                            </>
                        )}
                        {!isPublicRole && (
                            <div className="app-detail-meta">
                                <span>Penerima Aduan:</span>
                                <strong>{complaint.received_by?.name || '-'}</strong>
                            </div>
                        )}
                    </div>

                    {canEditBasicComplaint && (
                        <div className="app-card-footer-actions">
                            {!basicEditing && (
                                <button
                                    type="button"
                                    className="app-button app-button-ghost"
                                    onClick={() => {
                                        setBasicMessage('');
                                        setBasicEditing(true);
                                    }}
                                >
                                    Kemaskini
                                </button>
                            )}
                            {basicEditing && (
                                <>
                                    <button
                                        type="button"
                                        className="app-button app-button-outline"
                                        onClick={() => {
                                            setBasicMessage('');
                                            setBasicEditing(false);
                                        }}
                                        disabled={basicSaving}
                                    >
                                        Batal
                                    </button>
                                    <button
                                        type="button"
                                        className="app-button"
                                        onClick={saveBasic}
                                        disabled={basicSaving}
                                    >
                                        {basicSaving ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {/* Butiran Aduan (Borang 5) is handled under "Tindakan Pegawai" so it follows Kesalahan Disyaki. */}
                </div>
            </div>

            {isPegawaiRole && (
                <div className="app-card app-category-card">
                    <div>
                        <h4>Kategori Aduan</h4>
                        <p>
                            Pilih kategori aduan untuk menentukan kes atau keluarga.
                            {isCaseTypeLocked ? ' Kategori dikunci selepas aduan disahkan.' : ''}
                        </p>
                    </div>
                    <div className="app-case-toggle">
                        <label className={`${complaint.case_type === 'AJ' ? 'active' : ''} ${isCaseTypeLocked ? 'disabled' : ''}`.trim()}>
                            <input
                                type="radio"
                                name="case_type"
                                value="AJ"
                                checked={complaint.case_type === 'AJ'}
                                disabled={isCaseTypeLocked}
                                onChange={() => updateCaseType('AJ')}
                            />
                            <span>KES - Aduan Jenayah (AJ)</span>
                        </label>
                        <label className={`${complaint.case_type === 'AK' ? 'active' : ''} ${isCaseTypeLocked ? 'disabled' : ''}`.trim()}>
                            <input
                                type="radio"
                                name="case_type"
                                value="AK"
                                checked={complaint.case_type === 'AK'}
                                disabled={isCaseTypeLocked}
                                onChange={() => updateCaseType('AK')}
                            />
                            <span>KELUARGA - Aduan Keluarga (AK)</span>
                        </label>
                    </div>
                    {caseTypeMessage && (
                        <SharedInlineAlert
                            type={caseTypeMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                            message={caseTypeMessage}
                            dismissible
                            onClose={() => setCaseTypeMessage('')}
                            className=" app-detail-note"
                        />
                    )}
                </div>
            )}

            {isPegawaiRole && (
                <div className="app-card">
                    <h4>Tindakan Pegawai</h4>
                    <div className="app-stepper app-stepper--sticky">
                        {steps.map((step, index) => (
                            <button
                                key={step.key}
                                type="button"
                                className={`app-step ${activeStep === index ? 'active' : ''}`}
                                disabled={isStepLocked(step.key)}
                                title={isStepLocked(step.key) ? 'Aduan perlu disahkan terlebih dahulu.' : undefined}
                                onClick={() => setActiveStep(index)}
                            >
                                <span>{step.label}</span>
                            </button>
                        ))}
                    </div>

                    {complaint.case_type === 'AJ' && activeKey === 'ppa' && (
                        <div className="app-tab-panel">
                            <div className="app-detail-number-actions">
                                <button
                                    className="app-button app-button-ghost"
                                    type="button"
                                    onClick={() => window.open(
                                        `/app/complaints/${id}/print/borang-5`,
                                        'borang5',
                                        'width=980,height=720,scrollbars=yes,resizable=yes'
                                    )}
                                >
                                    <i className="bi bi-printer"></i>
                                    Borang 5
                                </button>
                            </div>
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                            <div className="app-form-grid">
                                <div className="app-form-field app-span-full">
                                    <h5>Klasifikasi</h5>
                                    <div className="app-radio-cards">
                                        {[
                                            { value: 'FFA', label: 'For Further Action (FFA)' },
                                            { value: 'KIV', label: 'Keep In View (KIV)' },
                                            { value: 'NFA', label: 'No Further Action (NFA)' },
                                            { value: 'OP', label: 'Out of Procedure (OP)' },
                                        ].map((option) => {
                                            const isKiv = option.value === 'KIV';
                                            const isNfa = option.value === 'NFA';
                                            const kivText = isKiv ? formatKivCountdown(kivRemainingMs) : '';
                                            const nfaText = isNfa ? formatNfaCountdown(nfaRemainingMs) : '';
                                            const showTimer = ajPayload.classification === option.value && Boolean(kivText || nfaText);
                                            const timerText = kivText || nfaText;
                                            const isDanger = (isKiv && (kivRemainingMs ?? 0) <= (8 * 24 * 60 * 60 * 1000))
                                                || (isNfa && (nfaRemainingMs ?? 1) <= 0);
                                            const isWarning = (isKiv && (kivRemainingMs ?? 0) > (8 * 24 * 60 * 60 * 1000) && (kivRemainingMs ?? 0) <= (10 * 24 * 60 * 60 * 1000))
                                                || (isNfa && (nfaRemainingMs ?? 0) > 0 && (nfaRemainingMs ?? 0) <= (6 * 60 * 60 * 1000));
                                            return (
                                            <label key={option.value} className={ajPayload.classification === option.value ? 'active' : ''}>
                                                <input
                                                    type="radio"
                                                    name="aj_classification"
                                                    value={option.value}
                                                    checked={ajPayload.classification === option.value}
                                                    onChange={() => setAjPayload((prev) => ({ ...prev, classification: option.value }))}
                                                />
                                                <span className="app-classification-option">
                                                    <span>{option.label}</span>
                                                    {showTimer && (
                                                        <span className={`app-classification-timer ${isDanger ? 'is-danger app-text-blink' : ''} ${isWarning ? 'is-warning app-text-blink' : ''}`}>
                                                            {timerText}
                                                        </span>
                                                    )}
                                                </span>
                                            </label>
                                            );
                                        })}
                                    </div>
                                    <small className="app-hint">Pilih satu klasifikasi untuk rekod tindakan.</small>
                                </div>

                                <div className="app-form-field">
                                    <SharedOffenseSelect
                                        apiUrl={apiUrl}
                                        value={ajPayload.offense_id || ''}
                                        label="Kesalahan Disyaki *"
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, offense_id: value }))}
                                        onItemSelected={(item) => {
                                            if (!item) return;
                                            const suggestedKey = resolveTemplateKeyFromOffense(item) || 'generic';
                                            applyBorang5OfficerTemplate(suggestedKey, item);
                                        }}
                                    />
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Butiran Aduan (Borang 5)</span>
                                    <small className="app-hint">Template akan diisi automatik selepas memilih Kesalahan Disyaki. Pegawai boleh ubah mengikut fakta kes.</small>
                                    <textarea
                                        className="app-textarea-250"
                                        rows="10"
                                        value={basicDraft.borang5_statement}
                                        onChange={(event) => setBasicDraft((prev) => ({ ...prev, borang5_statement: event.target.value }))}
                                        placeholder="Butiran Aduan (Borang 5)"
                                    />
                                </label>

                                <div className="app-form-field">
                                    <span>Jenis Kesalahan</span>
                                    <label className="app-inline-radio">
                                        <input
                                            type="radio"
                                            name="aj_offense_type"
                                            value="BT"
                                            checked={ajPayload.offense_type_id === 'BT'}
                                            onChange={() => setAjPayload((prev) => ({ ...prev, offense_type_id: 'BT' }))}
                                        />
                                        <span>Kesalahan Boleh Tangkap</span>
                                    </label>
                                    <label className="app-inline-radio">
                                        <input
                                            type="radio"
                                            name="aj_offense_type"
                                            value="TBT"
                                            checked={ajPayload.offense_type_id === 'TBT'}
                                            onChange={() => setAjPayload((prev) => ({ ...prev, offense_type_id: 'TBT' }))}
                                        />
                                        <span>Kesalahan Tak Boleh Tangkap</span>
                                    </label>
                                </div>

                                <div className="app-form-field">
                                    <SearchSelect
                                        label="Perincian Khalwat"
                                        value={ajPayload.khalwat_detail_id || ''}
                                        options={khalwatOptions}
                                        placeholder="-- Pilih Perincian --"
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, khalwat_detail_id: value }))}
                                    />
                                </div>

                                <div className="app-form-field">
                                    <SearchSelect
                                        label="Perincian Judi"
                                        value={ajPayload.judi_detail_id || ''}
                                        options={judiOptions}
                                        placeholder="-- Pilih Perincian --"
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, judi_detail_id: value }))}
                                    />
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan Pegawai</span>
                                    <textarea
                                        className="app-textarea-110"
                                        rows="3"
                                        value={ajPayload.notes || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, notes: event.target.value }))}
                                    />
                                </label>
                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAjPayload}>
                                        Simpan
                                    </button>
                                </div>

                                <div className="app-approver-card app-span-full">
                                    <div className="app-approver-grid">
                                        <div className="app-approver-block">
                                            <div className="app-approver-row">
                                                <span>Penerima Aduan</span>
                                                <span>:</span>
                                                <strong>{complaint.received_by?.name || '-'}</strong>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Terima</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.received_at)}</strong>
                                            </div>
                                        </div>
                                        <div className="app-approver-block">
                                            <div className="app-approver-row">
                                                <span>Pegawai Pengesah</span>
                                                <span>:</span>
                                                <SharedStaffSelect
                                                    apiUrl={apiUrl}
                                                    value={approverStaffId}
                                                    onChange={setApproverStaffId}
                                                    officeType="hq"
                                                    disabled={Boolean(complaint.approver_confirmed_at)}
                                                />
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Sahkan</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.approver_confirmed_at)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="app-approver-actions">
                                        {!complaint.approver_confirmed_at && !canApprove && !isAwaitingApproval && (
                                            <button className="app-button app-button-ghost" type="button" onClick={submitAssignees}>
                                                Hantar Pengesahan
                                            </button>
                                        )}
                                        {isAwaitingApproval && !canApprove && (
                                            <span className="app-status-pill app-status-pill-soft">
                                                Menunggu tindakan pengesah
                                            </span>
                                        )}
                                        {!complaint.approver_confirmed_at && canApprove && (
                                            <button className="app-button" type="button" onClick={submitApproval}>
                                                Sahkan Aduan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {assigneeMessage && (
                                <SharedInlineAlert
                                    type={assigneeMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={assigneeMessage}
                                    dismissible
                                    onClose={() => setAssigneeMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                        </div>
                    )}

                    {complaint.case_type === 'AK' && activeKey === 'tindakan' && (
                        <div className="app-tab-panel">
                            <div className="app-detail-number-actions">
                                <button
                                    className="app-button app-button-ghost"
                                    type="button"
                                    onClick={() => window.open(
                                        `/app/complaints/${id}/print/borang-5`,
                                        'borang5',
                                        'width=980,height=720,scrollbars=yes,resizable=yes'
                                    )}
                                >
                                    <i className="bi bi-printer"></i>
                                    Borang 5
                                </button>
                                <button
                                    className="app-button app-button-ghost"
                                    type="button"
                                    onClick={() => window.open(
                                        `/app/complaints/${id}/print/laporan-tindakan`,
                                        'laporanTindakan',
                                        'width=980,height=720,scrollbars=yes,resizable=yes'
                                    )}
                                >
                                    <i className="bi bi-printer"></i>
                                    Laporan Tindakan
                                </button>
                            </div>
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                            <div className="app-form-grid">
                                <div className="app-form-field">
                                    <SharedOffenseSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.offense_id || ''}
                                        label={<><span>Kesalahan Disyaki </span><span className="complaint-required">*</span></>}
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, offense_id: value }))}
                                        onItemSelected={(item) => {
                                            if (!item) return;
                                            const suggestedKey = resolveTemplateKeyFromOffense(item) || 'generic';
                                            applyBorang5OfficerTemplate(suggestedKey, item);
                                        }}
                                    />
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Butiran Aduan (Borang 5)</span>
                                    <small className="app-hint">Template akan diisi automatik selepas memilih Kesalahan Disyaki. Pegawai boleh ubah mengikut fakta kes.</small>
                                    <textarea
                                        className="app-textarea-250"
                                        rows="10"
                                        value={basicDraft.borang5_statement}
                                        onChange={(event) => setBasicDraft((prev) => ({ ...prev, borang5_statement: event.target.value }))}
                                        placeholder="Butiran Aduan (Borang 5)"
                                    />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAkPayload}>
                                        {isAkFirstIntakeSave ? 'Terima & Sahkan Aduan' : 'Simpan'}
                                    </button>
                                </div>

                                <div className="app-approver-card app-span-full">
                                    <div className="app-approver-grid">
                                        <div className="app-approver-block">
                                            <div className="app-approver-row">
                                                <span>Penerima Aduan</span>
                                                <span>:</span>
                                                <strong>{complaint.received_by?.name || '-'}</strong>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Terima</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.received_at)}</strong>
                                            </div>
                                        </div>
                                        <div className="app-approver-block">
                                            <div className="app-approver-row">
                                                <span>Pegawai Pengesah</span>
                                                <span>:</span>
                                                <strong>{complaint.approverStaff?.name || '-'}</strong>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Sahkan</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.approver_confirmed_at)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {assigneeMessage && (
                                <SharedInlineAlert
                                    type={assigneeMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={assigneeMessage}
                                    dismissible
                                    onClose={() => setAssigneeMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                        </div>
                    )}

                    {complaint.case_type === 'AK' && activeKey === 'siasatan' && (
                        <div className="app-tab-panel">
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                            <div className="app-form-grid">
                                <label className="app-form-field">
                                    <span>Tarikh & Masa Temujanji Siasatan</span>
                                    <input
                                        type="datetime-local"
                                        value={akPayload.investigation_datetime || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, investigation_datetime: event.target.value }))}
                                    />
                                    <div className="app-field-actions">
                                        <button
                                            className="app-button app-button-ghost"
                                            type="button"
                                            onClick={openAppointmentCalendar}
                                        >
                                            Lihat Kalendar Temujanji
                                        </button>
                                    </div>
                                </label>

                                <label className="app-form-field">
                                    <span>Nama Pegawai Penyiasat</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.investigator_staff_id || ''}
                                        onChange={(value) => setAkPayload((prev) => ({
                                            ...prev,
                                            investigator_staff_id: value,
                                            // keep legacy name for display/search; server will resolve and store official name
                                            investigator_name: prev.investigator_name,
                                        }))}
                                    />
                                    {akPayload.investigator_name && !akPayload.investigator_staff_id && (
                                        <small className="app-hint">
                                            Rekod lama: {akPayload.investigator_name}
                                        </small>
                                    )}
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Fail Diterima</span>
                                    <input
                                        type="date"
                                        value={akPayload.file_received_date || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, file_received_date: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-field">
                                    <span>Nama Penyelia Siasatan</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.supervisor_staff_id || ''}
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, supervisor_staff_id: value }))}
                                    />
                                </div>

                                <div className="app-form-field">
                                    <SharedIpStatusSelect
                                        value={akPayload.ip_status || ''}
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, ip_status: value }))}
                                        label="Status IP"
                                    />
                                </div>

                                <label className="app-form-field">
                                    <span>Tarikh Akhir Penyempurnaan IP</span>
                                    <input
                                        type="date"
                                        value={akPayload.ip_due_date || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, ip_due_date: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Dihantar ke Pendakwaan</span>
                                    <input
                                        type="date"
                                        value={akPayload.prosecution_date || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, prosecution_date: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-field app-span-full">
                                    <span>Cadangan Pertuduhan</span>
                                    <div className="app-seizure-table-wrap app-charge-recommendation-table">
                                        <div className="app-seizure-table-head">
                                            <div>Portfolio</div>
                                            <div>Nama</div>
                                            <div>Kesalahan</div>
                                            <div>&nbsp;</div>
                                        </div>

                                        <div className="app-seizure-table-body">
                                            {(akPayload.charge_recommendations || []).map((row, index) => (
                                                <div className="app-seizure-table-row" key={`ak-charge-recommendation-${index}`}>
                                                    <div className="app-seizure-table-cell">
                                                        <input
                                                            type="text"
                                                            value={row.portfolio || ''}
                                                            placeholder="Contoh: B.x"
                                                            onChange={(event) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                charge_recommendations: (prev.charge_recommendations || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, portfolio: event.target.value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell">
                                                        <input
                                                            type="text"
                                                            value={row.name || ''}
                                                            placeholder="Nama pesalah / OYDS"
                                                            onChange={(event) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                charge_recommendations: (prev.charge_recommendations || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, name: event.target.value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell">
                                                        <SharedOffenseSelect
                                                            apiUrl={apiUrl}
                                                            value={row.offense_id || ''}
                                                            label=""
                                                            onChange={(value) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                charge_recommendations: (prev.charge_recommendations || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, offense_id: value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell app-seizure-table-cell-action">
                                                        <button
                                                            type="button"
                                                            className="app-icon-button"
                                                            onClick={() => setAkPayload((prev) => {
                                                                const rows = prev.charge_recommendations || [];
                                                                if (rows.length <= 1) {
                                                                        return {
                                                                            ...prev,
                                                                            charge_recommendations: [{ portfolio: '', name: '', offense_id: '' }],
                                                                        };
                                                                    }
                                                                return {
                                                                    ...prev,
                                                                    charge_recommendations: rows.filter((_, itemIndex) => itemIndex !== index),
                                                                };
                                                            })}
                                                            aria-label="Buang Cadangan Pertuduhan"
                                                            title="Buang Cadangan Pertuduhan"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="app-link app-link-button"
                                        onClick={() => setAkPayload((prev) => ({
                                            ...prev,
                                            charge_recommendations: [
                                                ...(prev.charge_recommendations || []),
                                                { portfolio: '', name: '', offense_id: '' },
                                            ],
                                        }))}
                                    >
                                        + Add New
                                    </button>
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan</span>
                                    <textarea
                                        rows="3"
                                        value={akPayload.notes || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, notes: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAkPayload}>
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AK' && activeKey === 'pendakwaan' && (
                        <div className="app-tab-panel">
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}

                            <div className="app-form-grid">
                                <SharedProsecutionStatusSelect
                                    value={akPayload.prosecution_status || ''}
                                    onChange={(value) => setAkPayload((prev) => ({ ...prev, prosecution_status: value }))}
                                    label="Status Pendakwaan"
                                />

                                <div className="app-form-field app-span-full">
                                    <span>Pertuduhan</span>
                                    <div className="app-seizure-table-wrap app-ak-prosecution-table">
                                        <div className="app-seizure-table-head">
                                            <div>Nama Tertuduh</div>
                                            <div>Kad Pengenalan</div>
                                            <div>Kesalahan</div>
                                            <div>Nombor Kes</div>
                                            <div>&nbsp;</div>
                                        </div>

                                        <div className="app-seizure-table-body">
                                            {(akPayload.prosecution_charges || []).map((row, index) => (
                                                <div className="app-seizure-table-row" key={`ak-prosecution-charge-${index}`}>
                                                    <div className="app-seizure-table-cell">
                                                        <input
                                                            type="text"
                                                            value={row.accused_name || ''}
                                                            placeholder="Nama tertuduh"
                                                            onChange={(event) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                prosecution_charges: (prev.prosecution_charges || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, accused_name: event.target.value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell">
                                                        <input
                                                            type="text"
                                                            value={row.id_number || ''}
                                                            placeholder="No. K/P"
                                                            onChange={(event) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                prosecution_charges: (prev.prosecution_charges || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, id_number: event.target.value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell">
                                                        <SharedOffenseSelect
                                                            apiUrl={apiUrl}
                                                            value={row.offense_id || ''}
                                                            label=""
                                                            onChange={(value) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                prosecution_charges: (prev.prosecution_charges || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, offense_id: value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell">
                                                        <input
                                                            type="text"
                                                            value={row.case_no || ''}
                                                            placeholder="Nombor kes"
                                                            onChange={(event) => setAkPayload((prev) => ({
                                                                ...prev,
                                                                prosecution_charges: (prev.prosecution_charges || []).map((item, itemIndex) => (
                                                                    itemIndex === index ? { ...item, case_no: event.target.value } : item
                                                                )),
                                                            }))}
                                                        />
                                                    </div>

                                                    <div className="app-seizure-table-cell app-seizure-table-cell-action">
                                                        <button
                                                            type="button"
                                                            className="app-icon-button"
                                                            onClick={() => setAkPayload((prev) => {
                                                                const rows = prev.prosecution_charges || [];
                                                                if (rows.length <= 1) {
                                                                    return {
                                                                        ...prev,
                                                                        prosecution_charges: [{ accused_name: '', id_number: '', offense_id: '', case_no: '' }],
                                                                    };
                                                                }
                                                                return {
                                                                    ...prev,
                                                                    prosecution_charges: rows.filter((_, itemIndex) => itemIndex !== index),
                                                                };
                                                            })}
                                                            aria-label="Buang Pertuduhan"
                                                            title="Buang Pertuduhan"
                                                        >
                                                            <i className="bi bi-trash"></i>
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="app-link app-link-button"
                                        onClick={() => setAkPayload((prev) => ({
                                            ...prev,
                                            prosecution_charges: [
                                                ...(prev.prosecution_charges || []),
                                                { accused_name: '', id_number: '', offense_id: '', case_no: '' },
                                            ],
                                        }))}
                                    >
                                        + Add New
                                    </button>
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan Pendakwaan</span>
                                    <textarea
                                        rows="4"
                                        value={akPayload.prosecution_notes || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, prosecution_notes: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-field">
                                    <span>Nama Pendakwa</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.prosecutor_staff_id || ''}
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, prosecutor_staff_id: value }))}
                                        placeholder="-- Pilih Pendakwa --"
                                    />
                                </div>

                                <label className="app-form-field">
                                    <span>Tarikh Bicara</span>
                                    <input
                                        type="date"
                                        value={akPayload.hearing_date || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, hearing_date: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-field">
                                    <span>Mahkamah</span>
                                    <SharedMahkamahSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.mahkamah_id || ''}
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, mahkamah_id: value }))}
                                    />
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Keputusan Mahkamah</span>
                                    <textarea
                                        rows="4"
                                        value={akPayload.court_decision || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, court_decision: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAkPayload}>
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AJ' && activeKey === 'laporan_tindakan' && (
                        <div className="app-tab-panel">
                            <div className="app-detail-number-actions">
                                <button
                                    className="app-button app-button-ghost"
                                    type="button"
                                    onClick={() => window.open(
                                        `/app/complaints/${id}/print/tindakan-aduan`,
                                        'tindakanAduan',
                                        'width=980,height=720,scrollbars=yes,resizable=yes'
                                    )}
                                >
                                    <i className="bi bi-printer"></i>
                                    Jana Tindakan
                                </button>
                            </div>
                            {actionReportMessage && (
                                <SharedInlineAlert
                                    type={actionReportMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={actionReportMessage}
                                    dismissible
                                    onClose={() => setActionReportMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                            <div className="app-form-grid">
                                <label className="app-form-field">
                                    <span>Pegawai Yang Mengeluarkan Arahan</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={ajActionReport.directive_staff_id || ''}
                                        onChange={(value) => updateActionReportField('directive_staff_id', value)}
                                        searchable
                                        searchPlaceholder="Cari pegawai yang mengeluarkan arahan..."
                                        showDistrictLabel
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh / Masa Maklum Aduan</span>
                                    <input
                                        type="datetime-local"
                                        value={ajActionReport.directive_at || ''}
                                        onChange={(event) => updateActionReportField('directive_at', event.target.value)}
                                    />
                                </label>

                                <div className="app-form-field">
                                    <span>Pegawai Yang Menerima Arahan</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={ajActionReport.handover_staff_id || ''}
                                        onChange={(value) => updateActionReportField('handover_staff_id', value)}
                                        sameDistrictOfStaffId={ajActionReport.directive_staff_id || ''}
                                        placeholder={ajActionReport.directive_staff_id ? '-- Pilih Pegawai Daerah --' : '-- Pilih Pegawai Yang Mengeluarkan Arahan dahulu --'}
                                        disabled={!ajActionReport.directive_staff_id}
                                        searchable
                                        searchPlaceholder="Cari pegawai yang menerima arahan..."
                                    />
                                </div>

                                <label className="app-form-field">
                                    <span>Tarikh / Masa Arahan Diterima</span>
                                    <input
                                        type="datetime-local"
                                        value={ajActionReport.handover_at || ''}
                                        onChange={(event) => updateActionReportField('handover_at', event.target.value)}
                                    />
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Status Terkini</span>
                                    <div className="app-inline-radio-group">
                                        {AJ_CURRENT_STATUS_OPTIONS.map((option) => (
                                            <label className="app-inline-radio app-inline-radio-compact" key={option}>
                                                <input
                                                    type="radio"
                                                    name="aj_current_status"
                                                    value={option}
                                                    checked={ajActionReport.current_status === option}
                                                    onChange={() => updateActionReportField('current_status', option)}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Arahan Tindakan</span>
                                    <textarea
                                        rows="3"
                                        value={ajActionReport.directive_notes || ''}
                                        onChange={(event) => updateActionReportField('directive_notes', event.target.value)}
                                    />
                                </label>

                                <div className="app-form-field app-span-full">
                                    <span>Maklumat Terkini</span>
                                    <div className="app-oyds-table-wrap">
                                        <div className="app-oyds-table-head">
                                            <div>Klasifikasi</div>
                                            <div>Tarikh Klasifikasi</div>
                                            <div>Masa</div>
                                            <div>Catatan</div>
                                            <div></div>
                                        </div>
                                        {(ajActionReport.history_entries || []).map((row, index) => (
                                            <div className="app-oyds-table-row" key={`history-${index}`}>
                                                <div className="app-oyds-table-cell">
                                                    <select
                                                        value={row.classification || ''}
                                                        onChange={(event) => updateActionHistoryRow(index, 'classification', event.target.value)}
                                                    >
                                                        <option value="">-- Pilih --</option>
                                                        {['FFA', 'KIV', 'NFA', 'OP'].map((option) => (
                                                            <option key={option} value={option}>{option}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div className="app-oyds-table-cell">
                                                    <input
                                                        type="date"
                                                        value={row.action_date || ''}
                                                        onChange={(event) => updateActionHistoryRow(index, 'action_date', event.target.value)}
                                                    />
                                                </div>
                                                <div className="app-oyds-table-cell">
                                                    <input
                                                        type="time"
                                                        value={row.action_time || ''}
                                                        onChange={(event) => updateActionHistoryRow(index, 'action_time', event.target.value)}
                                                    />
                                                </div>
                                                <div className="app-oyds-table-cell">
                                                    <input
                                                        type="text"
                                                        value={row.note || ''}
                                                        onChange={(event) => updateActionHistoryRow(index, 'note', event.target.value)}
                                                    />
                                                </div>
                                                <div className="app-oyds-table-cell app-oyds-table-cell-action">
                                                    <button
                                                        type="button"
                                                        className="app-icon-button"
                                                        onClick={() => removeActionHistoryRow(index)}
                                                        aria-label="Padam history"
                                                        title="Padam history"
                                                    >
                                                        <i className="bi bi-trash"></i>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="app-inline-add">
                                            <button type="button" className="app-link" onClick={addActionHistoryRow}>
                                                + Tambah Maklumat Terkini
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <label className="app-form-field">
                                    <span>No. Daftar Kes</span>
                                    <input
                                        type="text"
                                        value={ajActionReport.case_register_no || ''}
                                        onChange={(event) => updateActionReportField('case_register_no', event.target.value)}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Nombor Fail</span>
                                    <input
                                        type="text"
                                        value={ajActionReport.file_no || ''}
                                        onChange={(event) => updateActionReportField('file_no', event.target.value)}
                                    />
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Kategori OP</span>
                                    <div className="app-inline-radio-group">
                                        {AJ_OP_CATEGORY_OPTIONS.map((option) => (
                                            <label className="app-inline-radio app-inline-radio-compact" key={option}>
                                                <input
                                                    type="radio"
                                                    name="aj_op_category"
                                                    value={option}
                                                    checked={ajActionReport.op_category === option}
                                                    onChange={() => updateActionReportField('op_category', option)}
                                                />
                                                <span>{option}</span>
                                            </label>
                                        ))}
                                    </div>
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Status Kes OP</span>
                                    <div className="app-inline-radio-group">
                                        {AJ_OP_CASE_STATUS_OPTIONS.map((option) => (
                                            <label className="app-inline-radio app-inline-radio-compact" key={option}>
                                                <input
                                                    type="radio"
                                                    name="aj_op_case_status"
                                                    value={option}
                                                    checked={ajActionReport.op_case_status === option}
                                                    onChange={() => updateActionReportField('op_case_status', option)}
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
                                        value={ajActionReport.op_notes || ''}
                                        onChange={(event) => updateActionReportField('op_notes', event.target.value)}
                                    />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAjActionReport}>
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AJ' && activeKey === 'laporan_pemeriksaan' && (
                        <div className="app-tab-panel">
                            <div className="app-detail-number-actions">
                                <button
                                    className="app-button app-button-ghost"
                                    type="button"
                                    onClick={() => window.open(
                                        `/app/complaints/${id}/print/laporan-tindakan`,
                                        'laporanTindakan',
                                        'width=980,height=720,scrollbars=yes,resizable=yes'
                                    )}
                                >
                                    <i className="bi bi-printer"></i>
                                    Laporan Tindakan
                                </button>
                            </div>
                            <div className="app-report-stack">
                                <div className="app-report-section">
                                    <button
                                        className="app-report-toggle"
                                        type="button"
                                        onClick={() => toggleReportSection('arrest')}
                                        aria-expanded={reportSections.arrest}
                                    >
                                        <h5>Status Tangkapan</h5>
                                        <i className={`bi ${reportSections.arrest ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    </button>
                                    {reportSections.arrest && (
                                        <div className="app-form-grid app-report-grid app-arrest-grid-compact">
                                            <div className="app-form-field app-span-full">
                                                <div className="app-radio-cards app-radio-cards-2">
                                                    <label className={ajReport.arrest_status === 'ada' ? 'active' : ''}>
                                                        <input
                                                            type="radio"
                                                            name="aj_arrest_status"
                                                            value="ada"
                                                            checked={ajReport.arrest_status === 'ada'}
                                                            onChange={() => updateReportField('arrest_status', 'ada')}
                                                        />
                                                        <span>Ada Tangkapan</span>
                                                    </label>
                                                    <label className={ajReport.arrest_status === 'tiada' ? 'active' : ''}>
                                                        <input
                                                            type="radio"
                                                            name="aj_arrest_status"
                                                            value="tiada"
                                                            checked={ajReport.arrest_status === 'tiada'}
                                                            onChange={() => updateReportField('arrest_status', 'tiada')}
                                                        />
                                                        <span>Tiada Tangkapan</span>
                                                    </label>
                                                </div>
                                            </div>

                                            <div className="app-arrest-row app-arrest-row-5 app-span-full">
                                                <div className="app-form-field">
                                                    <span>Kesalahan</span>
                                                    <SharedOffenseSelect
                                                        apiUrl={apiUrl}
                                                        value={ajReport.offense_id || ''}
                                                        label=""
                                                        onChange={(val) => updateReportField('offense_id', val)}
                                                    />
                                                </div>

                                                <label className="app-form-field">
                                                    <span>Tarikh / Masa Tindakan</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={ajReport.action_datetime}
                                                        onChange={(event) => updateReportField('action_datetime', event.target.value)}
                                                    />
                                                </label>

                                                <label className="app-form-field">
                                                    <span>Tarikh / Masa Diambil Keterangan</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={ajReport.statement_datetime}
                                                        onChange={(event) => updateReportField('statement_datetime', event.target.value)}
                                                    />
                                                </label>

                                                <label className="app-form-field">
                                                    <span>No. Report / Balai Polis</span>
                                                    <input
                                                        type="text"
                                                        value={ajReport.report_no}
                                                        onChange={(event) => updateReportField('report_no', event.target.value)}
                                                    />
                                                </label>
                                                <label className="app-form-field">
                                                    <span>Tarikh Sebutan (Bon Mahkamah)</span>
                                                    <input
                                                        type="date"
                                                        value={ajReport.court_date}
                                                        onChange={(event) => updateReportField('court_date', event.target.value)}
                                                    />
                                                </label>
                                            </div>
                                            {ajReport.arrest_status === 'ada' && (
                                                <div className="app-arrest-row app-arrest-row-2 app-span-full">
                                                    <div className="app-form-field app-tangkapan-grid">
                                                        <span>Jumlah Tangkapan</span>
                                                        <div className="app-tangkapan-fields app-tangkapan-fields-3">
                                                            <label>
                                                                <small>Lelaki</small>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={ajReport.male_count}
                                                                    onChange={(event) => updateReportField('male_count', event.target.value)}
                                                                />
                                                            </label>
                                                            <label>
                                                                <small>Perempuan</small>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={ajReport.female_count}
                                                                    onChange={(event) => updateReportField('female_count', event.target.value)}
                                                                />
                                                            </label>
                                                            <label>
                                                                <small>Lain-lain</small>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={ajReport.other_count}
                                                                    onChange={(event) => updateReportField('other_count', event.target.value)}
                                                                />
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
                                                                        name="aj_arrest_by"
                                                                        value={label}
                                                                        checked={ajReport.arrest_by === label}
                                                                        onChange={() => updateReportField('arrest_by', label)}
                                                                    />
                                                                    <span>{label}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="app-form-field">
                                                        <span>Pegawai Penangkap</span>
                                                        <SharedStaffSelect
                                                            apiUrl={apiUrl}
                                                            value={ajReport.arrest_staff_id || ''}
                                                            onChange={(value) => updateReportField('arrest_staff_id', value)}
                                                            placeholder="-- Pilih Pegawai Penangkap --"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                        <div className="app-form-field app-span-full">
                                            <span>Maklumat OYDS</span>
                                            <small className="app-hint">
                                                Masukkan maklumat OYDS terlebih dahulu untuk memudahkan penjanaan laporan.
                                            </small>
                                            <div className="app-oyds-table-wrap">
                                                <div className="app-oyds-table-head">
                                                    <div>Nama OYDS</div>
                                                    <div>No. K/P atau Passport</div>
                                                    <div>Nama Pegawai Penyiasat</div>
                                                    <div>Lampiran</div>
                                                    <div></div>
                                                </div>
                                                {ajReport.oyds.map((row, index) => (
                                                    <div className="app-oyds-table-row" key={`oyds-${index}`}>
                                                        <div className="app-oyds-table-cell">
                                                            <div className="app-oyds-name-row">
                                                                <input
                                                                    type="text"
                                                                    value={row.name}
                                                                    onChange={(event) => updateOyds(index, 'name', event.target.value)}
                                                                    onBlur={() => saveOydOnBlur(index)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="app-oyds-table-cell">
                                                            <input
                                                                type="text"
                                                                value={row.id_number}
                                                                onChange={(event) => updateOyds(index, 'id_number', event.target.value)}
                                                                onBlur={() => saveOydOnBlur(index)}
                                                            />
                                                        </div>

                                                        <div className="app-oyds-table-cell">
                                                            <input
                                                                type="text"
                                                                value={row.investigator_name}
                                                                onChange={(event) => updateOyds(index, 'investigator_name', event.target.value)}
                                                                onBlur={() => saveOydOnBlur(index)}
                                                            />
                                                        </div>

                                                        <div className="app-oyds-table-cell app-oyds-table-cell-attachment">
                                                            <OydAttachmentSection
                                                                compact
                                                                apiUrl={apiUrl}
                                                                token={token}
                                                                complaintId={id}
                                                                recordId={row.id}
                                                                onBeforeUpload={() => ensureOydRecord(index, { allowEmpty: true })}
                                                                attachments={row.media || []}
                                                                category={getOydDraft(row, index).category || 'ic'}
                                                                onCategoryChange={(value) => updateOydDraft(row, index, { category: value })}
                                                                onOydScanned={(scanResult) => {
                                                                    setAjReport((prev) => {
                                                                        const next = [...(prev.oyds || [])];
                                                                        if (!next[index]) return prev;
                                                                        next[index] = {
                                                                            ...next[index],
                                                                            name: scanResult?.name ?? next[index].name,
                                                                            id_number: scanResult?.id_number ?? next[index].id_number,
                                                                        };
                                                                        return { ...prev, oyds: next };
                                                                    });
                                                                }}
                                                                onAttachmentsChange={(updater) => {
                                                                    setAjReport((prev) => {
                                                                        const next = [...prev.oyds];
                                                                        const current = next[index]?.media || [];
                                                                        next[index] = {
                                                                            ...next[index],
                                                                            media: typeof updater === 'function' ? updater(current) : updater,
                                                                        };
                                                                        return { ...prev, oyds: next };
                                                                    });
                                                                }}
                                                            />
                                                        </div>
                                                        <div className="app-oyds-table-cell app-oyds-table-cell-action">
                                                            <button
                                                                type="button"
                                                                className="app-icon-button"
                                                                onClick={() => onRemoveOyds(index)}
                                                                aria-label="Padam OYDS"
                                                                title="Padam OYDS"
                                                            >
                                                                <i className="bi bi-trash"></i>
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                <div className="app-inline-add">
                                                    <button type="button" className="app-link" onClick={addOyds}>
                                                        + Tambah OYDS
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <label className="app-form-field app-span-full">
                                            <div className="app-field-inline-head">
                                                <span>LAPORAN</span>
                                                <button
                                                    type="button"
                                                    className="app-button app-button-ghost app-button-mini"
                                                    onClick={insertLaporanTindakanTemplate}
                                                >
                                                    <i className="bi bi-magic"></i>
                                                    Insert Template
                                                </button>
                                            </div>
                                            <textarea
                                                className="app-textarea-400"
                                                rows="4"
                                                value={ajReport.report_notes}
                                                onChange={(event) => updateReportField('report_notes', event.target.value)}
                                            />
                                        </label>
                                    </div>
                                    )}
                                </div>

                                <div className="app-report-section">
                                    <button
                                        className="app-report-toggle"
                                        type="button"
                                        onClick={() => toggleReportSection('seizure')}
                                        aria-expanded={reportSections.seizure}
                                    >
                                        <h5>Butiran Barang Kes</h5>
                                        <i className={`bi ${reportSections.seizure ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    </button>
                                    {reportSections.seizure && (
                                        <>
                                            <div className="app-form-field">
                                                <span>Sitaan Barang</span>
                                                <div className="app-radio-cards app-radio-cards-2">
                                                    <label className={ajReport.seizure_status === 'ada' ? 'active' : ''}>
                                                        <input
                                                            type="radio"
                                                            name="aj_seizure_status"
                                                            value="ada"
                                                            checked={ajReport.seizure_status === 'ada'}
                                                            onChange={() => updateReportField('seizure_status', 'ada')}
                                                        />
                                                        <span>Ada Barang Sitaan</span>
                                                    </label>
                                                    <label className={ajReport.seizure_status === 'tiada' ? 'active' : ''}>
                                                        <input
                                                            type="radio"
                                                            name="aj_seizure_status"
                                                            value="tiada"
                                                            checked={ajReport.seizure_status === 'tiada'}
                                                            onChange={() => updateReportField('seizure_status', 'tiada')}
                                                        />
                                                        <span>Tiada Barang Sitaan</span>
                                                    </label>
                                                </div>
                                            </div>

                                            {ajReport.seizure_status === 'ada' && (
                                                <div className="app-inline-section">
                                                    <div className="app-inline-header">
                                                        <h5>Maklumat Barang Kes</h5>
                                                        <button type="button" className="app-button app-button-ghost" onClick={addSeizureItem}>
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
                                                        {ajReport.seizure_items.map((row, index) => (
                                                            <div className="app-seizure-table-row" key={`barang-${index}`}>
                                                                <div className="app-seizure-table-cell">
                                                                    <input
                                                                        type="text"
                                                                        value={row.item_no}
                                                                        onChange={(event) => updateSeizureItem(index, 'item_no', event.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="app-seizure-table-cell">
                                                                    <input
                                                                        type="text"
                                                                        value={row.description}
                                                                        onChange={(event) => updateSeizureItem(index, 'description', event.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="app-seizure-table-cell">
                                                                    <input
                                                                        type="text"
                                                                        value={row.storage}
                                                                        onChange={(event) => updateSeizureItem(index, 'storage', event.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="app-seizure-table-cell app-seizure-table-cell-attachment">
                                                                    <SeizureAttachmentSection
                                                                        compact
                                                                        apiUrl={apiUrl}
                                                                        token={token}
                                                                        complaintId={id}
                                                                        recordId={row.id}
                                                                        onBeforeUpload={() => ensureSeizureItemRecord(index, { allowEmpty: true })}
                                                                        attachments={row.media || []}
                                                                        category={getSeizureDraft(row, index).category || 'bukti'}
                                                                        onCategoryChange={(value) => updateSeizureDraft(row, index, { category: value })}
                                                                        onAttachmentsChange={(updater) => {
                                                                            setAjReport((prev) => {
                                                                                const next = [...prev.seizure_items];
                                                                                const current = next[index]?.media || [];
                                                                                next[index] = {
                                                                                    ...next[index],
                                                                                    media: typeof updater === 'function' ? updater(current) : updater,
                                                                                };
                                                                                return { ...prev, seizure_items: next };
                                                                            });
                                                                        }}
                                                                    />
                                                                </div>
                                                                <div className="app-seizure-table-cell app-seizure-table-cell-action">
                                                                    <button
                                                                        type="button"
                                                                        className="app-icon-button"
                                                                        onClick={() => removeSeizureItem(index)}
                                                                        aria-label="Buang Barang"
                                                                        title="Buang Barang"
                                                                    >
                                                                        <i className="bi bi-trash"></i>
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                                <div className="app-report-sticky">
                                    {reportMessage && (
                                        <SharedInlineAlert
                                            type={reportMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                            message={reportMessage}
                                            dismissible
                                            onClose={() => setReportMessage('')}
                                            className=" app-report-sticky-message"
                                        />
                                    )}
                                    <button className="app-button" type="button" onClick={submitAjReport}>
                                        Simpan Laporan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AJ' && activeKey === 'siasatan' && (
                        <div className="app-tab-panel">
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}
                            <div className="app-form-grid">
                                <div className="app-form-field">
                                    <span>Nama Penyelia Siasatan</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={ajPayload.supervisor_staff_id || ''}
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, supervisor_staff_id: value }))}
                                    />
                                </div>

                                <div className="app-form-field">
                                    <SharedIpStatusSelect
                                        value={ajPayload.ip_status || ''}
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, ip_status: value }))}
                                        label="Status IP"
                                    />
                                </div>

                                <label className="app-form-field">
                                    <span>Tarikh Akhir Penyempurnaan IP</span>
                                    <input
                                        type="date"
                                        value={ajPayload.ip_due_date || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, ip_due_date: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Akhir Semakan KPP</span>
                                    <input
                                        type="date"
                                        value={ajPayload.kpp_due_date || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, kpp_due_date: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Akhir ke JPSS</span>
                                    <input
                                        type="date"
                                        value={ajPayload.jpss_due_date || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, jpss_due_date: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan Siasatan</span>
                                    <textarea
                                        rows="4"
                                        value={ajPayload.investigation_notes || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, investigation_notes: event.target.value }))}
                                    />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAjPayload}>
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AJ' && activeKey === 'pendakwaan' && (
                        <div className="app-tab-panel">
                            {payloadMessage && (
                                <SharedInlineAlert
                                    type={payloadMessage.toLowerCase().includes('gagal') ? 'error' : 'success'}
                                    message={payloadMessage}
                                    dismissible
                                    onClose={() => setPayloadMessage('')}
                                    className=" app-detail-note"
                                />
                            )}

                            <div className="app-form-grid">
                                <SharedProsecutionStatusSelect
                                    value={ajPayload.prosecution_status || ''}
                                    onChange={(value) => setAjPayload((prev) => ({ ...prev, prosecution_status: value }))}
                                    label="Status Pendakwaan"
                                />

                                <div className="app-form-field">
                                    <span>Nama Pendakwa</span>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        value={ajPayload.prosecutor_staff_id || ''}
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, prosecutor_staff_id: value }))}
                                        placeholder="-- Pilih Pendakwa --"
                                    />
                                </div>

                                <div className="app-form-field">
                                    <span>Mahkamah</span>
                                    <SharedMahkamahSelect
                                        apiUrl={apiUrl}
                                        value={ajPayload.mahkamah_id || ''}
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, mahkamah_id: value }))}
                                    />
                                </div>

                                <label className="app-form-field app-span-full">
                                    <span>Denda</span>
                                    <textarea
                                        rows="3"
                                        value={ajPayload.fine || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, fine: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan Pendakwaan</span>
                                    <textarea
                                        rows="4"
                                        value={ajPayload.prosecution_notes || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, prosecution_notes: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>No. Aduan</span>
                                    <input type="text" value={complaint.reference_no || '-'} readOnly />
                                </label>

                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAjPayload}>
                                        Simpan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {((complaint.case_type === 'AJ' && !['ppa', 'laporan', 'siasatan', 'pendakwaan'].includes(activeKey)) ||
                        (complaint.case_type === 'AK' && !['tindakan', 'siasatan', 'pendakwaan'].includes(activeKey))) && (
                        <div className="app-tab-panel">
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;
