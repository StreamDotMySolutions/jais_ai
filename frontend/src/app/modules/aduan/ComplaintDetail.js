import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import SearchSelect from '../../../libs/SearchSelect';

const AJ_STEPS = [
    { key: 'ppa', label: 'Tindakan Aduan' },
    { key: 'laporan', label: 'Laporan Pemeriksaan' },
    { key: 'barang', label: 'Butiran Barang Kes' },
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
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
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
    };
    const ajReportDefault = {
        arrest_status: '',
        male_count: '',
        female_count: '',
        report_no: '',
        action_datetime: '',
        offense_id: '',
        arrest_by: '',
        statement_datetime: '',
        court_date: '',
        report_notes: '',
        directive_staff_id: '',
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
        file_received_date: '',
        ip_status: '',
        ip_due_date: '',
        prosecution_date: '',
        notes: '',
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
    const [staffOptions, setStaffOptions] = useState([]);
    const [approverStaffId, setApproverStaffId] = useState('');
    const [reportSections, setReportSections] = useState({
        issuer: true,
        arrest: true,
        oyds: true,
        seizure: true,
    });
    const role = localStorage.getItem('role') || 'awam';
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
        if (!apiUrl) {
            return;
        }

        Promise.all([
            axios.get(`${apiUrl}/references/offense-types`),
            axios.get(`${apiUrl}/references/offenses`),
            axios.get(`${apiUrl}/references/khalwat-details`),
            axios.get(`${apiUrl}/references/judi-details`),
        ])
            .then(([typesRes, offenseRes, khalwatRes, judiRes]) => {
                setReferenceData({
                    offenseTypes: typesRes?.data?.data || [],
                    offenses: offenseRes?.data?.data || [],
                    khalwatDetails: khalwatRes?.data?.data || [],
                    judiDetails: judiRes?.data?.data || [],
                });
            })
            .catch(() => {
                setReferenceData({
                    offenseTypes: [],
                    offenses: [],
                    khalwatDetails: [],
                    judiDetails: [],
                });
            });
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        axios.get(`${apiUrl}/staff/options`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setStaffOptions(response?.data?.data || []);
            })
            .catch(() => {
                setStaffOptions([]);
            });
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
            classification: complaint.classification_code || '',
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
            statement_datetime: complaint.aj_statement_datetime || '',
            court_date: complaint.aj_court_date || '',
            report_notes: complaint.aj_report_notes || '',
            directive_staff_id: complaint.aj_directive_staff_id ? String(complaint.aj_directive_staff_id) : '',
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
            file_received_date: complaint.ak_file_received_date || '',
            ip_status: complaint.ak_ip_status || '',
            ip_due_date: complaint.ak_ip_due_date || '',
            prosecution_date: complaint.ak_prosecution_date || '',
            notes: complaint.ak_notes || '',
        });
        setApproverStaffId(complaint.approver_staff_id ? String(complaint.approver_staff_id) : '');
    }, [complaint]);

    const updateReportField = (field, value) => {
        setAjReport((prev) => ({ ...prev, [field]: value }));
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
                setActionMessage(err?.response?.data?.message || 'Gagal mengesahkan aduan.');
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
            payload: ajPayload,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setPayloadMessage('Maklumat AJ dikemaskini.');
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
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
                setPayloadMessage('Maklumat AK dikemaskini.');
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
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
                const updated = response?.data?.data;
                if (updated) {
                    setComplaint((prev) => prev ? { ...prev, ...updated } : prev);
                }
            })
            .catch((err) => {
                setReportMessage(err?.response?.data?.message || 'Gagal kemaskini laporan.');
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
                setAssigneeMessage('Pegawai penerima & pengesah dikemaskini.');
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

    useEffect(() => {
        setActiveStep(0);
    }, [id, currentCaseType]);
    const activeKey = steps[activeStep]?.key;
    const offenseOptions = useMemo(() => (
        referenceData.offenses.map((item) => ({
            value: String(item.id),
            label: `${item.section ? `${item.section} - ` : ''}${item.name}`,
        }))
    ), [referenceData.offenses]);
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
            <div className="app-detail-header">
                <div className="app-detail-header-block">
                    <Link className="app-back" to="/app/complaints">
                        <i className="bi bi-arrow-left"></i>
                        Kembali ke Senarai
                    </Link>
                    <span className="app-detail-kicker">No Aduan</span>
                    <div className="app-detail-number">
                        <div className="app-detail-number-main">
                            <h3>{complaint.reference_no || '-'}</h3>
                            <span className="app-status-pill">{complaint.current_stage || 'baru'}</span>
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
                <div className="app-card">
                    <h4>Maklumat Pengadu</h4>
                    <div className="app-detail-row">
                        <span>Nama</span>
                        <strong>{complaint.complainant_name || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>No Kad Pengenalan</span>
                        <strong>{complaint.identification_number || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>No HP</span>
                        <strong>{complaint.contact_number || '-'}</strong>
                    </div>
                </div>

                <div className="app-card">
                    <h4>Maklumat Aduan</h4>
                    <div className="app-detail-row">
                        <span>Tarikh & Masa</span>
                        <strong>
                            {complaint.complaint_date || '-'} {complaint.complaint_time || ''}
                        </strong>
                    </div>
                    <div className="app-detail-row">
                        <span>Daerah</span>
                        <strong>{complaint.district_name || '-'}</strong>
                    </div>
                    <div className="app-detail-row">
                        <span>Alamat</span>
                        <strong>{complaint.address || '-'}</strong>
                    </div>
                </div>
            </div>

            <div className="app-card">
                <h4>Ringkasan Aduan</h4>
                <p className="app-detail-summary">{complaint.summary || '-'}</p>
                <div className="app-detail-meta">
                    <span>Penerima Aduan:</span>
                    <strong>
                        {complaint.submitted_by?.staff?.name || complaint.submitted_by?.name || '-'}
                        {complaint.submitted_by?.staff?.staff_id ? ` (${complaint.submitted_by.staff.staff_id})` : ''}
                    </strong>
                </div>
            </div>

            {(role === 'pegawai' || role === 'admin' || role === 'system') && (
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
                    {caseTypeMessage && <div className="app-detail-note">{caseTypeMessage}</div>}
                </div>
            )}

            {(role === 'pegawai' || role === 'admin' || role === 'system') && (
                <div className="app-card">
                    <h4>Tindakan Pegawai</h4>
                    <div className="app-stepper">
                        {steps.map((step, index) => (
                            <button
                                key={step.key}
                                type="button"
                                className={`app-step ${activeStep === index ? 'active' : ''}`}
                                onClick={() => setActiveStep(index)}
                            >
                                <span>{step.label}</span>
                            </button>
                        ))}
                    </div>

                    {complaint.case_type === 'AJ' && activeKey === 'ppa' && (
                        <div className="app-tab-panel">
                            {payloadMessage && <div className="app-detail-note">{payloadMessage}</div>}
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
                                    <SearchSelect
                                        label="Kesalahan Disyaki"
                                        value={ajPayload.offense_id || ''}
                                        options={offenseOptions}
                                        placeholder="-- Pilih Kesalahan Disyaki --"
                                        onChange={(value) => setAjPayload((prev) => ({ ...prev, offense_id: value }))}
                                    />
                                </div>

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
                                        rows="3"
                                        value={ajPayload.notes || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, notes: event.target.value }))}
                                    />
                                </label>
                                <div className="app-form-actions app-span-full app-align-right">
                                    <button className="app-button" type="button" onClick={submitAjPayload}>
                                        Simpan AJ
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
                                                <select
                                                    value={approverStaffId}
                                                    onChange={(event) => setApproverStaffId(event.target.value)}
                                                    disabled={Boolean(complaint.approver_confirmed_at)}
                                                >
                                                    <option value="">-- Pilih Pegawai --</option>
                                                    {staffOptions.map((staff) => (
                                                        <option key={staff.id} value={String(staff.id)}>
                                                            {staff.staff_id ? `${staff.name} (${staff.staff_id})` : staff.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Sahkan</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.approver_confirmed_at)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="app-approver-actions">
                                        {!canApprove && (
                                            <button className="app-button app-button-ghost" type="button" onClick={submitAssignees}>
                                                Hantar Pengesahan
                                            </button>
                                        )}
                                        {canApprove && (
                                            <button className="app-button" type="button" onClick={submitApproval}>
                                                Sahkan Aduan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {assigneeMessage && <div className="app-detail-note">{assigneeMessage}</div>}
                        </div>
                    )}

                    {complaint.case_type === 'AK' && activeKey === 'tindakan' && (
                        <div className="app-tab-panel">
                            {payloadMessage && <div className="app-detail-note">{payloadMessage}</div>}
                            <div className="app-form-grid">
                                <div className="app-form-field">
                                    <SearchSelect
                                        label="Kesalahan Disyaki"
                                        value={akPayload.offense_id || ''}
                                        options={offenseOptions}
                                        placeholder="-- Pilih Kesalahan Disyaki --"
                                        onChange={(value) => setAkPayload((prev) => ({ ...prev, offense_id: value }))}
                                    />
                                </div>

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
                                </div>

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
                                    <input
                                        type="text"
                                        value={akPayload.investigator_name || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, investigator_name: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh Fail Diterima</span>
                                    <input
                                        type="date"
                                        value={akPayload.file_received_date || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, file_received_date: event.target.value }))}
                                    />
                                </label>

                                <label className="app-form-field">
                                    <span>Status IP</span>
                                    <input
                                        type="text"
                                        value={akPayload.ip_status || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, ip_status: event.target.value }))}
                                    />
                                </label>

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
                                        Simpan AK
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
                                                <select
                                                    value={approverStaffId}
                                                    onChange={(event) => setApproverStaffId(event.target.value)}
                                                    disabled={Boolean(complaint.approver_confirmed_at)}
                                                >
                                                    <option value="">-- Pilih Pegawai --</option>
                                                    {staffOptions.map((staff) => (
                                                        <option key={staff.id} value={String(staff.id)}>
                                                            {staff.staff_id ? `${staff.name} (${staff.staff_id})` : staff.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div className="app-approver-row">
                                                <span>Tarikh Sahkan</span>
                                                <span>:</span>
                                                <strong>{formatDateTime(complaint.approver_confirmed_at)}</strong>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="app-approver-actions">
                                        {!canApprove && (
                                            <button className="app-button app-button-ghost" type="button" onClick={submitAssignees}>
                                                Hantar Pengesahan
                                            </button>
                                        )}
                                        {canApprove && (
                                            <button className="app-button" type="button" onClick={submitApproval}>
                                                Sahkan Aduan
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            {assigneeMessage && <div className="app-detail-note">{assigneeMessage}</div>}
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
                                        <div className="app-form-field">
                                            <span>Pegawai Yang Mengeluarkan Arahan</span>
                                            <select
                                                value={ajReport.directive_staff_id}
                                                onChange={(event) => updateReportField('directive_staff_id', event.target.value)}
                                            >
                                                <option value="">-- Pilih Pegawai --</option>
                                                {staffOptions.map((staff) => (
                                                    <option key={staff.id} value={String(staff.id)}>
                                                        {staff.staff_id ? `${staff.name} (${staff.staff_id})` : staff.name}
                                                    </option>
                                                ))}
                                            </select>
                                            <small className="app-hint">Pilih pegawai yang memberi arahan tindakan bagi aduan ini.</small>
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
                                            <SearchSelect
                                                label="Kesalahan"
                                                value={ajReport.offense_id}
                                                options={offenseOptions}
                                                placeholder="-- Pilih Kesalahan --"
                                                onChange={(value) => updateReportField('offense_id', value)}
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

                                        <label className="app-form-field app-span-full">
                                            <span>Laporan</span>
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
                                        onClick={() => toggleReportSection('oyds')}
                                        aria-expanded={reportSections.oyds}
                                    >
                                        <h5>Maklumat OYDS</h5>
                                        <i className={`bi ${reportSections.oyds ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                    </button>
                                    {reportSections.oyds && (
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
                                                    + Add New
                                                </button>
                                            </div>
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
                                        <div className="app-report-sticky-message">
                                            {reportMessage}
                                        </div>
                                    )}
                                    <button className="app-button" type="button" onClick={submitAjReport}>
                                        Simpan Laporan
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {((complaint.case_type === 'AJ' && !['ppa', 'laporan'].includes(activeKey)) ||
                        (complaint.case_type === 'AK' && activeKey !== 'tindakan')) && (
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
