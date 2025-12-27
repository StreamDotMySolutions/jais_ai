import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

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
    });
    const [referenceData, setReferenceData] = useState({
        offenseTypes: [],
        offenses: [],
        khalwatDetails: [],
        judiDetails: [],
    });
    const [activeStep, setActiveStep] = useState(0);
    const [ajPayload, setAjPayload] = useState({
        offense_id: '',
        offense_type_id: '',
        khalwat_detail_id: '',
        judi_detail_id: '',
        notes: '',
    });
    const [akPayload, setAkPayload] = useState({
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
    });
    const [actionMessage, setActionMessage] = useState('');
    const [payloadMessage, setPayloadMessage] = useState('');
    const [statusInput, setStatusInput] = useState('');
    const [caseTypeMessage, setCaseTypeMessage] = useState('');
    const role = localStorage.getItem('role') || 'awam';
    const emailOptions = [
        'bpn.siasatan@gmail.com',
        'bpn.gombak@gmail.com',
        'bpn.hululangat@gmail.com',
        'bpn.huluselangor@gmail.com',
        'bpn.klang@gmail.com',
        'bpn.kualalangat22@gmail.com',
        'bpn.kualaselangor@gmail.com',
        'bpn.sabakbernam@gmail.com',
        'jais.sepang@gmail.com',
    ];

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        axios.get(`${apiUrl}/complaints/${id}`)
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

        axios.get(`${apiUrl}/complaints`)
            .then((response) => {
                const ids = (response?.data?.data || []).map((item) => item.id);
                setSortedIds(ids);
            })
            .catch(() => {
                setSortedIds([]);
            });
    }, [apiUrl]);

    useEffect(() => {
        if (!complaint) {
            return;
        }

        setActiveStep(0);
        if (complaint.aj_payload) {
            setAjPayload((prev) => ({ ...prev, ...complaint.aj_payload }));
        }
        if (complaint.ak_payload) {
            setAkPayload((prev) => ({ ...prev, ...complaint.ak_payload }));
        }
    }, [complaint]);

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
                setComplaint((prev) => prev ? { ...prev, current_stage: response?.data?.current_stage } : prev);
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
            .then(() => {
                setPayloadMessage('Maklumat AJ dikemaskini.');
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
            .then(() => {
                setPayloadMessage('Maklumat AK dikemaskini.');
            })
            .catch((err) => {
                setPayloadMessage(err?.response?.data?.message || 'Gagal kemaskini AK.');
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

    const ajSteps = [
        { key: 'ppa', label: 'Tindakan Aduan' },
        { key: 'laporan', label: 'Laporan Pemeriksaan' },
        { key: 'barang', label: 'Butiran Barang Kes' },
        { key: 'siasatan', label: 'Butiran Siasatan' },
        { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
    ];
    const akSteps = [
        { key: 'tindakan', label: 'Tindakan Aduan' },
        { key: 'siasatan', label: 'Butiran Siasatan' },
        { key: 'pendakwaan', label: 'Butiran Pendakwaan' },
    ];
    const currentCaseType = complaint?.case_type || 'AJ';
    const steps = currentCaseType === 'AK' ? akSteps : ajSteps;
    const activeKey = steps[activeStep]?.key;

    if (isLoading) {
        return <div className="app-card">Memuatkan aduan...</div>;
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
                        <h3>{complaint.reference_no || '-'}</h3>
                        <span className="app-status-pill">{complaint.current_stage || 'baru'}</span>
                    </div>
                </div>
                <div className="app-detail-actions">
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
                            <div className="app-form-grid">
                                <label className="app-form-field">
                                    <span>Kesalahan Disyaki</span>
                                    <select
                                        value={ajPayload.offense_id}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, offense_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Kesalahan Disyaki --</option>
                                        {referenceData.offenses.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.section ? `${item.section} - ` : ''}{item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field">
                                    <span>Jenis Kesalahan</span>
                                    <select
                                        value={ajPayload.offense_type_id}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, offense_type_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Jenis Kesalahan --</option>
                                        {referenceData.offenseTypes.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field">
                                    <span>Perincian Khalwat</span>
                                    <select
                                        value={ajPayload.khalwat_detail_id}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, khalwat_detail_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Perincian --</option>
                                        {referenceData.khalwatDetails.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field">
                                    <span>Perincian Judi</span>
                                    <select
                                        value={ajPayload.judi_detail_id}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, judi_detail_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Perincian --</option>
                                        {referenceData.judiDetails.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field app-span-full">
                                    <span>Catatan Pegawai</span>
                                    <textarea
                                        rows="3"
                                        value={ajPayload.notes || ''}
                                        onChange={(event) => setAjPayload((prev) => ({ ...prev, notes: event.target.value }))}
                                    />
                                </label>
                            </div>
                            <div className="app-form-actions">
                                <button className="app-button" type="button" onClick={submitAjPayload}>
                                    Simpan AJ
                                </button>
                            </div>
                        </div>
                    )}

                    {complaint.case_type === 'AK' && activeKey === 'tindakan' && (
                        <div className="app-tab-panel">
                            <div className="app-form-grid">
                                <label className="app-form-field">
                                    <span>Kesalahan Disyaki</span>
                                    <select
                                        value={akPayload.offense_id}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, offense_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Kesalahan Disyaki --</option>
                                        {referenceData.offenses.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.section ? `${item.section} - ` : ''}{item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field">
                                    <span>Jenis Kesalahan</span>
                                    <select
                                        value={akPayload.offense_type_id}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, offense_type_id: event.target.value }))}
                                    >
                                        <option value="">-- Pilih Jenis Kesalahan --</option>
                                        {referenceData.offenseTypes.map((item) => (
                                            <option key={item.id} value={item.id}>
                                                {item.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="app-form-field">
                                    <span>Tarikh & Masa Temujanji Siasatan</span>
                                    <input
                                        type="datetime-local"
                                        value={akPayload.investigation_datetime || ''}
                                        onChange={(event) => setAkPayload((prev) => ({ ...prev, investigation_datetime: event.target.value }))}
                                    />
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
                                        {emailOptions.map((email) => (
                                            <label key={email} className="app-checkbox">
                                                <input
                                                    type="checkbox"
                                                    checked={akPayload.email_cc?.includes(email) || false}
                                                    onChange={(event) => {
                                                        const nextEmails = new Set(akPayload.email_cc || []);
                                                        if (event.target.checked) {
                                                            nextEmails.add(email);
                                                        } else {
                                                            nextEmails.delete(email);
                                                        }
                                                        setAkPayload((prev) => ({ ...prev, email_cc: Array.from(nextEmails) }));
                                                    }}
                                                />
                                                <span>{email}</span>
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
                            </div>
                            <div className="app-form-actions">
                                <button className="app-button" type="button" onClick={submitAkPayload}>
                                    Simpan AK
                                </button>
                            </div>
                        </div>
                    )}

                    {((complaint.case_type === 'AJ' && activeKey !== 'ppa') ||
                        (complaint.case_type === 'AK' && activeKey !== 'tindakan')) && (
                        <div className="app-tab-panel">
                            <div className="app-empty">Seksi ini akan ditambah seterusnya.</div>
                        </div>
                    )}

                    {payloadMessage && <div className="app-detail-note">{payloadMessage}</div>}
                </div>
            )}
        </div>
    );
};

export default ComplaintDetail;
