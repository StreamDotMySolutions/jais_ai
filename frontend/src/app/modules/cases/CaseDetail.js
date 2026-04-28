import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';
import SharedStaffSelect from '../../components/SharedStaffSelect';
import SharedInlineAlert from '../../components/SharedInlineAlert';
import { useToast } from '../../components/SharedToastProvider';

const emptySeizureItem = { item_no: '', description: '', storage: '' };
const emptyPoliceReport = { report_no: '', description: '', station: '' };

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

const CaseDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const toast = useToast();
    const [caseRecord, setCaseRecord] = useState(null);
    const [form, setForm] = useState({
        file_no: '',
        report_offense_id: '',
        arrest_staff_id: '',
        current_status: '',
        arrest_status: '',
        arrest_by: '',
        male_count: '',
        female_count: '',
        other_count: '',
        action_datetime: '',
        statement_datetime: '',
        court_date: '',
        report_notes: '',
        seizure_status: '',
        seizure_items: [emptySeizureItem],
        police_report_status: '',
        police_reports: [emptyPoliceReport],
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);

    const hydrateForm = (data) => {
        setForm({
            file_no: data?.file_no || '',
            report_offense_id: data?.report_offense_id ? String(data.report_offense_id) : '',
            arrest_staff_id: data?.arrest_staff_id ? String(data.arrest_staff_id) : '',
            current_status: data?.current_status || '',
            arrest_status: data?.arrest_status || '',
            arrest_by: data?.arrest_by || '',
            male_count: data?.male_count ?? '',
            female_count: data?.female_count ?? '',
            other_count: data?.other_count ?? '',
            action_datetime: normalizeDateTimeLocal(data?.action_datetime),
            statement_datetime: normalizeDateTimeLocal(data?.statement_datetime),
            court_date: data?.court_date || '',
            report_notes: data?.report_notes || '',
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
    }, [apiUrl, id]);

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
        axios.put(`${apiUrl}/cases/${id}`, {
            ...form,
            report_offense_id: form.report_offense_id || null,
            arrest_staff_id: form.arrest_staff_id || null,
        }, { headers })
            .then((response) => {
                const data = response?.data?.data;
                setCaseRecord(data);
                hydrateForm(data);
                const msg = response?.data?.message || 'Maklumat kes berjaya dikemaskini.';
                setMessage(msg);
                toast.success(msg);
            })
            .catch((err) => {
                const errors = err?.response?.data?.errors;
                const firstError = errors ? Object.values(errors)?.[0]?.[0] : '';
                setError(firstError || err?.response?.data?.message || 'Gagal simpan kes.');
            })
            .finally(() => setIsSaving(false));
    };

    if (isLoading) {
        return <div className="app-empty">Memuatkan maklumat kes...</div>;
    }

    if (error && !caseRecord) {
        return <div className="app-empty">{error}</div>;
    }

    return (
        <div className="app-case-detail">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pengurusan Kes</span>
                    <h3>{caseRecord?.case_register_no || `KES #${id}`}</h3>
                    <p>{caseRecord?.district_name || '-'} | {caseRecord?.case_type === 'AJ' ? 'Aduan Jenayah (AJ)' : '-'}</p>
                </div>
                <div className="app-complaints-actions">
                    <button type="button" className="app-button app-button-ghost" onClick={() => navigate('/app/cases')}>
                        <i className="bi bi-arrow-left"></i>
                        Senarai Kes
                    </button>
                    <button type="button" className="app-button" onClick={saveCase} disabled={isSaving}>
                        {isSaving ? 'Menyimpan...' : 'Simpan Kes'}
                    </button>
                </div>
            </div>

            {message && <SharedInlineAlert type="success" message={message} dismissible onClose={() => setMessage('')} />}
            {error && <SharedInlineAlert type="error" message={error} dismissible onClose={() => setError('')} />}

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
                                <input value={caseRecord?.case_register_no || ''} readOnly disabled />
                            </label>

                            <label className="app-form-field">
                                <span>Nombor Fail</span>
                                <input value={form.file_no} onChange={(event) => updateField('file_no', event.target.value)} />
                            </label>

                            <div className="app-arrest-row app-arrest-row-5 app-span-full">
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
                <aside className="app-card app-case-detail-card">
                    <h4>Aduan Berkaitan</h4>
                    <div className="app-case-linked-detail-list">
                        {(caseRecord?.complaints || []).map((complaint) => (
                            <button
                                type="button"
                                className="app-case-linked-detail-item"
                                key={`case-detail-complaint-${complaint.id}`}
                                onClick={() => navigate(`/app/complaints/${complaint.id}`)}
                            >
                                <strong>{complaint.reference_no || `Aduan #${complaint.id}`}</strong>
                                <span>{complaint.complainant_name || '-'}</span>
                                <small>{formatDateTime(`${complaint.complaint_date || ''}T${complaint.complaint_time || '00:00:00'}`)}</small>
                            </button>
                        ))}
                    </div>
                </aside>
            </div>

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
                            <div className="app-seizure-table-head app-case-seizure-head-no-attachment">
                                <div>No. Barang</div>
                                <div>Maklumat Barang</div>
                                <div>Stor Simpanan</div>
                                <div></div>
                            </div>
                            {form.seizure_items.map((row, index) => (
                                <div className="app-seizure-table-row app-case-seizure-row-no-attachment" key={`case-seizure-${index}`}>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.item_no || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'item_no', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.description || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'description', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.storage || ''} onChange={(event) => updateArrayRow('seizure_items', index, 'storage', event.target.value)} />
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
                            <div className="app-seizure-table-head app-case-seizure-head-no-attachment">
                                <div>No. Report</div>
                                <div>Maklumat Report</div>
                                <div>Balai Polis</div>
                                <div></div>
                            </div>
                            {form.police_reports.map((row, index) => (
                                <div className="app-seizure-table-row app-case-seizure-row-no-attachment" key={`case-police-${index}`}>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.report_no || ''} onChange={(event) => updateArrayRow('police_reports', index, 'report_no', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.description || ''} onChange={(event) => updateArrayRow('police_reports', index, 'description', event.target.value)} />
                                    </div>
                                    <div className="app-seizure-table-cell">
                                        <input value={row.station || ''} onChange={(event) => updateArrayRow('police_reports', index, 'station', event.target.value)} />
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
        </div>
    );
};

export default CaseDetail;
