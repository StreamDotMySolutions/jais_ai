import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import SearchSelect from '../../../libs/SearchSelect';
import SharedStaffSelect from '../../components/SharedStaffSelect';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';
import SharedInlineAlert from '../../components/SharedInlineAlert';
import SharedInlineEditText from '../../components/SharedInlineEditText';
import SharedIpStatusSelect from '../../components/SharedIpStatusSelect';
import SharedMahkamahSelect from '../../components/SharedMahkamahSelect';
import SharedProsecutionStatusSelect from '../../components/SharedProsecutionStatusSelect';
import { useToast } from '../../components/SharedToastProvider';
import BORANG5_OFFICER_TEMPLATES from './borang5OfficerTemplates';
import LAPORAN_TINDAKAN_TEMPLATES from './laporanTindakanTemplates';
import { getComplaintStageLabel } from './complaintStage';
import useOffenseOptions from '../../hooks/useOffenseOptions';

const AJ_STEPS = [
    { key: 'ppa', label: 'Tindakan Aduan' },
    { key: 'laporan', label: 'Laporan Pemeriksaan' },
    { key: 'siasatan', label: 'Butiran Siasatan' },
    { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
];
const AK_STEPS = [
    { key: 'tindakan', label: 'Tindakan Aduan' },
    { key: 'siasatan', label: 'Butiran Siasatan' },
    { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
];

const ComplaintDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const toast = useToast();
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
        report_no: '',
        action_datetime: '',
        offense_id: '',
        arrest_by: '',
        arrest_staff_id: '',
        statement_datetime: '',
        court_date: '',
        report_notes: '',
        directive_staff_id: '',
        directive_at: '',
        directive_notes: '',
        handover_at: '',
        handover_notes: '',
        oyds: [
            { name: '', id_number: '', investigator_name: '', file_no: '' },
        ],
        seizure_status: '',
        seizure_items: [
            { item_no: '', description: '', storage: '' },
        ],
    };
    const akPayloadDefault = {
        offense_id: '',
        offense_type_id: '',
        email_cc: [],
        investigation_datetime: '',
        investigator_name: '',
        investigator_staff_id: '',
        file_received_date: '',
        ip_status: '',
        ip_due_date: '',
        prosecution_date: '',
        notes: '',
        supervisor_staff_id: '',
    };
    const [ajPayload, setAjPayload] = useState(ajPayloadDefault);
    const [ajReport, setAjReport] = useState(ajReportDefault);
    const [akPayload, setAkPayload] = useState(akPayloadDefault);
    const [actionMessage, setActionMessage] = useState('');
    const [payloadMessage, setPayloadMessage] = useState('');
    const [reportMessage, setReportMessage] = useState('');
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
        complaint_date: '',
        complaint_time: '',
        incident_date: '',
        incident_time: '',
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
    const role = localStorage.getItem('role') || 'awam';
    const isPegawaiRole = ['pegawai', 'pegawai_hq', 'pegawai_daerah', 'admin', 'system'].includes(role);
    const emailRecipients = [
        { label: 'bpn.siasatan@gmail.com', email: 'bpn.siasatan@gmail.com' },
        { label: 'bpn.gombak@gmail.com', email: 'bpn.gombak@gmail.com' },
        { label: 'bpn.hululangat@gmail.com', email: 'bpn.hululangat@gmail.com' },
        { label: 'bpn.huluselangor@gmail.com', email: 'bpn.huluselangor@gmail.com' },
        { label: 'bpn.klang@gmail.com', email: 'bpn.klang@gmail.com' },
        { label: 'bpn.kualalangat22@gmail.com', email: 'bpn.kualalangat22@gmail.com' },
        { label: 'bpn.kualaselangor@gmail.com', email: 'bpn.kualaselangor@gmail.com' },
        { label: 'bpn.sabakbernam@gmail.com', email: 'bpn.sabakbernam@gmail.com' },
        { label: 'jais.sepang@gmail.com', email: 'jais.sepang@gmail.com' },
    ];

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
            complaint_date: complaint.complaint_date || '',
            complaint_time: (complaint.complaint_time || '').slice(0, 5),
            incident_date: complaint.incident_date || '',
            incident_time: (complaint.incident_time || '').slice(0, 5),
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
        const token = localStorage.getItem('token');
        const endpoint = role === 'awam' ? `${apiUrl}/complaints/my` : `${apiUrl}/complaints`;
        axios.get(endpoint, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: { per_page: 500 },
        })
            .then((response) => {
                const ids = (response?.data?.data || []).map((item) => item.id);
                setSortedIds(ids);
            })
            .catch(() => {
                setSortedIds([]);
            });
    }, [apiUrl, role]);

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
            report_no: complaint.aj_report_no || '',
            action_datetime: complaint.aj_action_datetime || '',
            offense_id: complaint.aj_report_offense_id ? String(complaint.aj_report_offense_id) : '',
            arrest_by: complaint.aj_arrest_by || '',
            arrest_staff_id: complaint.aj_arrest_staff_id ? String(complaint.aj_arrest_staff_id) : '',
            statement_datetime: complaint.aj_statement_datetime || '',
            court_date: complaint.aj_court_date || '',
            report_notes: complaint.aj_report_notes || '',
            directive_staff_id: complaint.aj_directive_staff_id ? String(complaint.aj_directive_staff_id) : '',
            directive_at: complaint.aj_directive_at || '',
            directive_notes: complaint.aj_directive_notes || '',
            handover_at: complaint.handover_at || '',
            handover_notes: complaint.handover_notes || '',
            oyds: (complaint.oyds || []).length
                ? complaint.oyds.map((row) => ({
                    name: row.name || '',
                    id_number: row.id_number || '',
                    investigator_name: row.investigator_name || '',
                    file_no: row.file_no || '',
                }))
                : ajReportDefault.oyds,
            seizure_status: complaint.aj_seizure_status || '',
            seizure_items: (complaint.seizure_items || []).length
                ? complaint.seizure_items.map((row) => ({
                    item_no: row.item_no || '',
                    description: row.description || '',
                    storage: row.storage || '',
                }))
                : ajReportDefault.seizure_items,
        });
        setAkPayload({
            ...akPayloadDefault,
            offense_id: complaint.ak_offense_id ? String(complaint.ak_offense_id) : '',
            offense_type_id: complaint.ak_offense_type || '',
            email_cc: complaint.ak_email_cc || [],
            investigation_datetime: complaint.ak_investigation_datetime || '',
            investigator_name: complaint.ak_investigator_name || '',
            investigator_staff_id: complaint.ak_investigator_staff_id ? String(complaint.ak_investigator_staff_id) : '',
            file_received_date: complaint.ak_file_received_date || '',
            ip_status: complaint.ak_ip_status || '',
            ip_due_date: complaint.ak_ip_due_date || '',
            prosecution_date: complaint.ak_prosecution_date || '',
            notes: complaint.ak_notes || '',
            supervisor_staff_id: complaint.ak_supervisor_staff_id ? String(complaint.ak_supervisor_staff_id) : '',
        });
        setApproverStaffId(complaint.approver_staff_id ? String(complaint.approver_staff_id) : '');
    }, [complaint]);

    useEffect(() => {
        // Keep report offense in sync with AJ "Kesalahan Disyaki".
        if (!ajPayload.offense_id) {
            return;
        }
        setAjReport((prev) => {
            if (!prev) return prev;
            if (String(prev.offense_id || '') === String(ajPayload.offense_id || '')) {
                return prev;
            }
            return { ...prev, offense_id: ajPayload.offense_id };
        });
    }, [ajPayload.offense_id]);

    const updateReportField = (field, value) => {
        setAjReport((prev) => ({ ...prev, [field]: value }));
    };

    const insertLaporanTindakanTemplate = () => {
        const offenseId = ajPayload.offense_id || ajReport.offense_id || '';
        if (!offenseId) {
            toast.error('Sila pilih Kesalahan Disyaki dahulu.');
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

    const addOyds = () => {
        setAjReport((prev) => ({
            ...prev,
            oyds: [...prev.oyds, { name: '', id_number: '', investigator_name: '', file_no: '' }],
        }));
    };

    const removeOyds = (index) => {
        setAjReport((prev) => {
            const next = prev.oyds.filter((_, i) => i !== index);
            return { ...prev, oyds: next.length ? next : [{ name: '', id_number: '', investigator_name: '', file_no: '' }] };
        });
    };

    const updateSeizureItem = (index, field, value) => {
        setAjReport((prev) => {
            const next = [...prev.seizure_items];
            next[index] = { ...next[index], [field]: value };
            return { ...prev, seizure_items: next };
        });
    };

    const addSeizureItem = () => {
        setAjReport((prev) => ({
            ...prev,
            seizure_items: [...prev.seizure_items, { item_no: '', description: '', storage: '' }],
        }));
    };

    const removeSeizureItem = (index) => {
        setAjReport((prev) => {
            const next = prev.seizure_items.filter((_, i) => i !== index);
            return { ...prev, seizure_items: next.length ? next : [{ item_no: '', description: '', storage: '' }] };
        });
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
                setActionMessage('Aduan telah disahkan.');
                toast.success('Aduan telah disahkan.');
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
                        .then(() => {
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
                        .then(() => {
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
        const nextReport = {
            ...ajReport,
            // Kesalahan untuk laporan pemeriksaan ikut "Tindakan Aduan" (Kesalahan Disyaki).
            offense_id: ajPayload.offense_id || '',
        };
        axios.post(`${apiUrl}/complaints/${id}/aj-report`, {
            report: nextReport,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setReportMessage('Laporan pemeriksaan dikemaskini.');
                toast.success('Laporan pemeriksaan dikemaskini.');
                setAjReport(nextReport);
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

    const submitAssignees = () => {
        if (!apiUrl) {
            return;
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
                setAssigneeMessage('Maklumat aduan telah dihantar kepada pengesah untuk pengesahan.');
            })
            .catch((err) => {
                setAssigneeMessage(err?.response?.data?.message || 'Gagal kemaskini pegawai.');
            });
    };

    const handleNext = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex === -1 || currentIndex === sortedIds.length - 1) {
            return;
        }
        const nextId = sortedIds[currentIndex + 1];
        navigate(`/app/complaints/${nextId}`);
    };

    const handlePrev = () => {
        const currentIndex = sortedIds.indexOf(Number(id));
        if (currentIndex <= 0) {
            return;
        }
        const prevId = sortedIds[currentIndex - 1];
        navigate(`/app/complaints/${prevId}`);
    };

    const currentCaseType = complaint?.case_type || 'AJ';
    const localUserName = (localStorage.getItem('user_name') || '').trim().toLowerCase();
    const localStaffId = localStorage.getItem('staff_id') || '';
    const approverName = (complaint?.approverStaff?.name || '').trim().toLowerCase();
    const canApprove = Boolean(
        !complaint?.approver_confirmed_at
        && (
            approvalMeta.is_assigned_approver
            || (localStaffId && String(complaint?.approver_staff_id || '') === String(localStaffId))
            || (localUserName && approverName && localUserName === approverName)
        )
    );
    const steps = currentCaseType === 'AK' ? AK_STEPS : AJ_STEPS;
    const isApproved = currentCaseType === 'AK'
        ? true
        : Boolean(complaint?.approver_confirmed_at);
    const lockedStepKeys = useMemo(() => {
        if (currentCaseType === 'AK') {
            return [];
        }
        return ['laporan', 'siasatan', 'pendakwaan'];
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
        <div className="app-detail">
            <div className="app-detail-header" ref={detailHeaderRef}>
                <div className="app-detail-header-block">
                    <Link className="app-back" to="/app/complaints">
                        <i className="bi bi-arrow-left"></i>
                        Kembali ke Senarai
                    </Link>
                    <span className="app-detail-kicker">No Aduan</span>
                    <div className="app-detail-number">
                        <div className="app-detail-number-main">
                            <h3>{complaint.reference_no || '-'}</h3>
                            <div className="app-detail-status-row">
                                <span className="app-detail-status-label">Status Aduan :</span>
                                <span className="app-status-pill">{getComplaintStageLabel(complaint.current_stage || 'baru')}</span>
                            </div>
                        </div>
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
                            <i className="bi bi-arrow-right-short app-detail-button-sep" aria-hidden="true"></i>
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
                                Tindakan Aduan
                            </button>
                            <i className="bi bi-arrow-right-short app-detail-button-sep" aria-hidden="true"></i>
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
                                    <h5>Butir-butir Pemberi Maklumat / Pengadu</h5>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Nama</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.complainant_name}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('complainant_name', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">No Kad Pengenalan</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.identification_number}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('identification_number', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">No HP</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.contact_number}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            maxLength={255}
                                            onConfirm={(next) => saveBasicField('contact_number', next)}
                                        />
                                    </span>
                                </div>
                            </div>

                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>Maklumat Kejadian</h5>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Tarikh Kejadian</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.incident_date}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            inputType="date"
                                            onConfirm={(next) => saveBasicField('incident_date', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Masa Kejadian</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.incident_time ? String(complaint.incident_time).slice(0, 5) : ''}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            inputType="time"
                                            onConfirm={(next) => saveBasicField('incident_time', next)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv">
                                    <span className="app-kv-label">Daerah</span>
                                    <span className="app-kv-value">
                                        <SharedInlineEditText
                                            value={complaint.district_id ? String(complaint.district_id) : ''}
                                            placeholder="-"
                                            canEdit={isPegawaiRole}
                                            mode="select"
                                            options={districtOptions.map((d) => ({ value: String(d.id), label: d.name }))}
                                            formatDisplay={() => complaint.district_name || '-'}
                                            onConfirm={(next) => saveBasicField('district_id', next ? String(next) : null)}
                                        />
                                    </span>
                                </div>
                                <div className="app-kv app-kv--stack">
                                    <span className="app-kv-label">Alamat</span>
                                    <div className="app-kv-stack">
                                        <span className="app-kv-value">
                                            <SharedInlineEditText
                                                value={complaint.address}
                                                placeholder="-"
                                                canEdit={isPegawaiRole}
                                                mode="textarea"
                                                maxLength={1000}
                                                onConfirm={(next) => saveBasicField('address', next)}
                                            />
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {basicEditing && (
                        <div className="app-basic-kv">
                            <div className="app-basic-kv-col">
                                <div className="app-card-subheader">
                                    <h5>Butir-butir Pemberi Maklumat / Pengadu</h5>
                                </div>
                                <div className="app-form-grid app-form-grid-single">
                                    <label className="app-form-field">
                                        <span>Nama</span>
                                        <input
                                            type="text"
                                            value={basicDraft.complainant_name}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, complainant_name: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>No Kad Pengenalan</span>
                                        <input
                                            type="text"
                                            value={basicDraft.identification_number}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, identification_number: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>No HP</span>
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
                                    <h5>Maklumat Kejadian</h5>
                                </div>
                                <div className="app-form-grid">
                                    <label className="app-form-field">
                                        <span>Tarikh</span>
                                        <input
                                            type="date"
                                            value={basicDraft.complaint_date}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, complaint_date: event.target.value }))}
                                        />
                                    </label>
                                    <label className="app-form-field">
                                        <span>Masa</span>
                                        <input
                                            type="time"
                                            value={basicDraft.complaint_time}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, complaint_time: event.target.value }))}
                                        />
                                    </label>
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
                                    <label className="app-form-field app-span-full">
                                        <span>Alamat</span>
                                        <textarea
                                            rows="4"
                                            value={basicDraft.address}
                                            onChange={(event) => setBasicDraft((prev) => ({ ...prev, address: event.target.value }))}
                                        />
                                    </label>
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

                        <div className="app-detail-meta">
                            <span>Kaedah Aduan:</span>
                            <strong>{formatChannelLabel(complaint.channel)}</strong>
                        </div>
                        <div className="app-detail-meta">
                            <span>Penerima Aduan:</span>
                            <strong>
                                {complaint.submitted_by?.staff?.name || complaint.submitted_by?.name || '-'}
                                {complaint.submitted_by?.staff?.staff_id ? ` (${complaint.submitted_by.staff.staff_id})` : ''}
                            </strong>
                        </div>
                    </div>

                    {isPegawaiRole && (
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
                        <p>Pilih kategori aduan untuk menentukan kes atau keluarga.</p>
                    </div>
                    <div className="app-case-toggle">
                        <label className={complaint.case_type === 'AJ' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_type"
                                value="AJ"
                                checked={complaint.case_type === 'AJ'}
                                onChange={() => updateCaseType('AJ')}
                            />
                            <span>KES - Aduan Jenayah (AJ)</span>
                        </label>
                        <label className={complaint.case_type === 'AK' ? 'active' : ''}>
                            <input
                                type="radio"
                                name="case_type"
                                value="AK"
                                checked={complaint.case_type === 'AK'}
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
                                        {['FFA', 'KIV', 'NFA', 'OP'].map((label) => (
                                            <label key={label} className={ajPayload.classification === label ? 'active' : ''}>
                                                <input
                                                    type="radio"
                                                    name="aj_classification"
                                                    value={label}
                                                    checked={ajPayload.classification === label}
                                                    onChange={() => setAjPayload((prev) => ({ ...prev, classification: label }))}
                                                />
                                                <span>{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                    <small className="app-hint">Pilih satu klasifikasi untuk rekod tindakan.</small>
                                </div>

                                <div className="app-form-field">
                                    <SharedOffenseSelect
                                        apiUrl={apiUrl}
                                        value={ajPayload.offense_id || ''}
                                        label=""
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
                                    <small className="app-hint">
                                        Jika pilih <strong>Kesalahan Boleh Tangkap</strong>, aduan akan masuk ke menu <strong>KES</strong> selepas simpan tindakan.
                                    </small>
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
                                                <strong>{complaint.received_by?.name || localStorage.getItem('user_name') || 'Pegawai'}</strong>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Terima</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.received_at)}</strong>
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

                    {complaint.case_type === 'AK' && activeKey === 'tindakan' && (
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
                                    <SharedOffenseSelect
                                        apiUrl={apiUrl}
                                        value={akPayload.offense_id || ''}
                                        label=""
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
                                            name="ak_offense_type"
                                            value="BT"
                                            checked={akPayload.offense_type_id === 'BT'}
                                            onChange={() => setAkPayload((prev) => ({ ...prev, offense_type_id: 'BT' }))}
                                        />
                                        <span>Kesalahan Boleh Tangkap</span>
                                    </label>
                                    <label className="app-inline-radio">
                                        <input
                                            type="radio"
                                            name="ak_offense_type"
                                            value="TBT"
                                            checked={akPayload.offense_type_id === 'TBT'}
                                            onChange={() => setAkPayload((prev) => ({ ...prev, offense_type_id: 'TBT' }))}
                                        />
                                        <span>Kesalahan Tak Boleh Tangkap</span>
                                    </label>
                                    <small className="app-hint">
                                        Jika pilih <strong>Kesalahan Boleh Tangkap</strong>, aduan akan masuk ke menu <strong>KES</strong> selepas disahkan (approve).
                                    </small>
                                </div>
                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAkPayload}>
                                        Simpan
                                    </button>
                                </div>

                                <div className="app-approver-card app-span-full">
                                    <div className="app-approver-grid">
                                        <div className="app-approver-block">
                                            <div className="app-approver-row">
                                                <span>Penerima Aduan</span>
                                                <span>:</span>
                                                <strong>{complaint.received_by?.name || localStorage.getItem('user_name') || 'Pegawai'}</strong>
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
                                        {!complaint.approver_confirmed_at && !canApprove && (
                                            <button className="app-button app-button-ghost" type="button" onClick={submitAssignees}>
                                                Hantar Pengesahan
                                            </button>
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

                                <label className="app-form-field app-span-full">
                                    <span>Email Salinan Aduan</span>
                                    <div className="app-checkbox-grid">
                                        {emailRecipients.map((item) => (
                                            <label key={item.email} className="app-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={akPayload.email_cc?.includes(item.email) || false}
                                                    onChange={(event) => {
                                                        const nextEmails = new Set(akPayload.email_cc || []);
                                                        if (event.target.checked) {
                                                            nextEmails.add(item.email);
                                                        } else {
                                                            nextEmails.delete(item.email);
                                                        }
                                                        setAkPayload((prev) => ({ ...prev, email_cc: Array.from(nextEmails) }));
                                                    }}
                                                />
                                                <span>{item.label || item.email}</span>
                                            </label>
                                        ))}
                                    </div>
                                </label>

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

                    {complaint.case_type === 'AJ' && activeKey === 'laporan' && (
                        <div className="app-tab-panel">
                            <div className="app-report-stack">
                                <div className="app-report-section">
                                    <button
                                        className="app-report-toggle"
                                        type="button"
                                        onClick={() => toggleReportSection('issuer')}
                                        aria-expanded={reportSections.issuer}
                                    >
                                        <h5>Maklumat Pengeluar Arahan</h5>
                                        <i className={`bi ${reportSections.issuer ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    </button>
                                        {reportSections.issuer && (
                                            <div className="app-form-grid app-report-grid app-report-grid-2">
                                                <div className="app-form-field">
                                                    <span>Pegawai Yang Mengeluarkan Arahan</span>
                                                    <SharedStaffSelect
                                                        apiUrl={apiUrl}
                                                        value={ajReport.directive_staff_id}
                                                        onChange={(value) => updateReportField('directive_staff_id', value)}
                                                    />
                                                    <small className="app-hint">Pilih pegawai yang memberi arahan tindakan bagi aduan ini.</small>
                                                </div>

                                                <div className="app-form-field">
                                                    <span>Pegawai Penangkap</span>
                                                    <SharedStaffSelect
                                                        apiUrl={apiUrl}
                                                        value={ajReport.arrest_staff_id || ''}
                                                        onChange={(value) => updateReportField('arrest_staff_id', value)}
                                                        placeholder="-- Pilih Pegawai Penangkap --"
                                                    />
                                                    <small className="app-hint">Pilih pegawai yang membuat tangkapan (jika ada).</small>
                                                </div>

                                                <label className="app-form-field">
                                                    <span>Tarikh / Masa Maklum Aduan</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={ajReport.directive_at || ''}
                                                        onChange={(event) => updateReportField('directive_at', event.target.value)}
                                                    />
                                                </label>

                                                <label className="app-form-field">
                                                    <span>Tarikh / Masa Serahan</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={ajReport.handover_at || ''}
                                                        onChange={(event) => updateReportField('handover_at', event.target.value)}
                                                    />
                                                </label>

                                                <label className="app-form-field app-span-full">
                                                    <span>Minit / Arahan Tindakan</span>
                                                    <textarea
                                                        rows="3"
                                                        value={ajReport.directive_notes || ''}
                                                        onChange={(event) => updateReportField('directive_notes', event.target.value)}
                                                    />
                                                </label>

                                                <label className="app-form-field app-span-full">
                                                    <span>Catatan Serahan</span>
                                                    <textarea
                                                        rows="3"
                                                        value={ajReport.handover_notes || ''}
                                                        onChange={(event) => updateReportField('handover_notes', event.target.value)}
                                                    />
                                                </label>
                                            </div>
                                    )}
                                </div>

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
                                        <div className="app-form-grid app-report-grid">
                                            <div className="app-form-field app-span-full">
                                                <div className="app-radio-cards">
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

                                        <label className="app-form-field">
                                            <span>No. Report / Balai Polis</span>
                                            <input
                                                type="text"
                                                value={ajReport.report_no}
                                                onChange={(event) => updateReportField('report_no', event.target.value)}
                                            />
                                        </label>

                                        <label className="app-form-field">
                                            <span>Tarikh / Masa Tindakan</span>
                                            <input
                                                type="datetime-local"
                                                value={ajReport.action_datetime}
                                                onChange={(event) => updateReportField('action_datetime', event.target.value)}
                                            />
                                        </label>

                                        <div className="app-form-field">
                                            <span>Kesalahan</span>
                                            <SharedOffenseSelect
                                                apiUrl={apiUrl}
                                                value={ajPayload.offense_id || ajReport.offense_id}
                                                label=""
                                                onChange={() => {}}
                                                disabled
                                            />
                                        </div>

                                        <label className="app-form-field">
                                            <span>Tarikh / Masa Diambil Keterangan</span>
                                            <input
                                                type="datetime-local"
                                                value={ajReport.statement_datetime}
                                                onChange={(event) => updateReportField('statement_datetime', event.target.value)}
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

                                        <div className="app-form-field app-tangkapan-grid">
                                            <span>Jumlah Tangkapan</span>
                                            <div className="app-tangkapan-fields">
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
                                            </div>
                                        </div>

                                        <div className="app-form-field">
                                            <span>Tangkapan Oleh</span>
                                            {['Pegawai Penguatkuasa Agama', 'Pegawai Masjid', 'Pegawai Polis', 'Orang Awam'].map((label) => (
                                                <label className="app-inline-radio" key={label}>
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

                                        <div className="app-form-field app-span-full">
                                            <span>Maklumat OYDS</span>
                                            <small className="app-hint">
                                                Masukkan maklumat OYDS terlebih dahulu untuk memudahkan penjanaan laporan.
                                            </small>
                                            <div className="app-inline-table app-oyds-table app-inline-clean">
                                                <div className="app-inline-table-header">
                                                    <span>Nama OYDS</span>
                                                    <span>No. K/P atau Passport</span>
                                                    <span>Nama Pegawai Penyiasat</span>
                                                    <span>Nombor Daftar Fail</span>
                                                </div>
                                                {ajReport.oyds.map((row, index) => (
                                                    <div className="app-inline-table-row" key={`oyds-${index}`}>
                                                        <input
                                                            type="text"
                                                            value={row.name}
                                                            onChange={(event) => updateOyds(index, 'name', event.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={row.id_number}
                                                            onChange={(event) => updateOyds(index, 'id_number', event.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={row.investigator_name}
                                                            onChange={(event) => updateOyds(index, 'investigator_name', event.target.value)}
                                                        />
                                                        <input
                                                            type="text"
                                                            value={row.file_no}
                                                            onChange={(event) => updateOyds(index, 'file_no', event.target.value)}
                                                        />
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
                                                <span>Laporan</span>
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
                                                <label className="app-inline-radio">
                                                    <input
                                                        type="radio"
                                                        name="aj_seizure_status"
                                                        value="ada"
                                                        checked={ajReport.seizure_status === 'ada'}
                                                        onChange={() => updateReportField('seizure_status', 'ada')}
                                                    />
                                                    <span>Ada Barang Sitaan</span>
                                                </label>
                                                <label className="app-inline-radio">
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

                                            {ajReport.seizure_status === 'ada' && (
                                                <div className="app-inline-section">
                                                    <div className="app-inline-header">
                                                        <h5>Maklumat Barang Kes</h5>
                                                        <button type="button" className="app-button app-button-ghost" onClick={addSeizureItem}>
                                                            + Tambah Barang
                                                        </button>
                                                    </div>
                                                    <div className="app-inline-table app-barang-table">
                                                        <div className="app-inline-table-header">
                                                            <span>No. Barang</span>
                                                            <span>Maklumat Barang</span>
                                                            <span>Stor Simpanan</span>
                                                            <span></span>
                                                        </div>
                                                        {ajReport.seizure_items.map((row, index) => (
                                                            <div className="app-inline-table-row" key={`barang-${index}`}>
                                                                <input
                                                                    type="text"
                                                                    value={row.item_no}
                                                                    onChange={(event) => updateSeizureItem(index, 'item_no', event.target.value)}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.description}
                                                                    onChange={(event) => updateSeizureItem(index, 'description', event.target.value)}
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.storage}
                                                                    onChange={(event) => updateSeizureItem(index, 'storage', event.target.value)}
                                                                />
                                                                <button
                                                                    type="button"
                                                                    className="app-link app-link-danger"
                                                                    onClick={() => removeSeizureItem(index)}
                                                                >
                                                                    Buang
                                                                </button>
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
                        (complaint.case_type === 'AK' && !['tindakan', 'siasatan'].includes(activeKey))) && (
                        <div className="app-tab-panel">
                            <div className="app-empty">Seksi ini akan ditambah seterusnya.</div>
                        </div>
                    )}

                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;
