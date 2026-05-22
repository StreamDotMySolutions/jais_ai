import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import ListPageLayout from '../../components/ListPageLayout';
import SharedCalendar from '../../components/SharedCalendar';
import { useToast } from '../../components/SharedToastProvider';
import { getComplaintStageLabel } from './complaintStage';

const STATUS_OPTIONS = [
    { value: '', label: 'Semua Status' },
    { value: 'baru', label: 'Baru' },
    { value: 'tunggu_pengesahan', label: 'Menunggu Pengesahan' },
    { value: 'disahkan', label: 'Disahkan' },
    { value: 'dihantar_ke_daerah', label: 'Dihantar ke Daerah' },
    { value: 'dalam_tindakan', label: 'Tindakan Aduan' },
    { value: 'kiv', label: 'KIV' },
    { value: 'laporan_tindakan', label: 'Laporan Tindakan Selesai' },
    { value: 'selesai', label: 'Selesai' },
];

const CHANNEL_OPTIONS = [
    { value: '', label: 'Semua Kaedah' },
    { value: 'portal', label: 'Portal (Awam)' },
    { value: 'web', label: 'Web' },
    { value: 'whatsapp', label: 'WhatsApp AI' },
    { value: 'whatsapp_web', label: 'WhatsApp Web AI' },
    { value: 'walkin', label: 'Walk-in / Kaunter' },
    { value: 'telefon', label: 'Telefon' },
    { value: 'email', label: 'Email' },
];

const CASE_TYPE_OPTIONS = [
    { value: '', label: 'Semua Jenis Aduan' },
    { value: 'AJ', label: 'Aduan Jenayah (AJ)' },
    { value: 'AK', label: 'Aduan Keluarga (AK)' },
];

const normalizeRole = (value) => {
    const role = (value || '').toString().trim().toLowerCase();
    if (!role || role === 'null' || role === 'undefined') {
        return 'awam';
    }
    return role;
};

const getStageTone = (stage) => {
    switch ((stage || '').toString().trim().toLowerCase()) {
        case 'baru':
            return 'is-neutral';
        case 'tunggu_pengesahan':
            return 'is-warn';
        case 'disahkan':
        case 'menunggu_tindakan_pi':
            return 'is-info';
        case 'dihantar_ke_daerah':
            return 'is-primary';
        case 'dalam_tindakan':
            return 'is-warning-strong';
        case 'kiv':
            return 'is-muted';
        case 'laporan_tindakan':
        case 'selesai':
            return 'is-success';
        default:
            return 'is-neutral';
    }
};

const formatTimeLabel = (value) => {
    if (!value) return '';
    const raw = String(value).trim();
    if (!raw) return '';
    const parts = raw.split(':');
    if (parts.length < 2) return raw;
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
};

const ComplaintCalendar = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const role = normalizeRole(localStorage.getItem('role'));

    const [districtOptions, setDistrictOptions] = useState([]);
    const [events, setEvents] = useState([]);
    const [viewerDistrictName, setViewerDistrictName] = useState('');
    const [canDrag, setCanDrag] = useState(false);
    const [filters, setFilters] = useState({
        district: '',
        status: '',
        caseType: '',
        channel: '',
    });
    const [range, setRange] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiUrl) return;
        axios.get(`${apiUrl}/districts`)
            .then((response) => setDistrictOptions(response?.data?.data || []))
            .catch(() => setDistrictOptions([]));
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl || !range?.start || !range?.end) {
            return;
        }

        setLoading(true);
        setError('');

        axios.get(`${apiUrl}/complaints/calendar`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                start: range.start,
                end: range.end,
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.caseType ? { case_type: filters.caseType } : {}),
                ...(filters.channel ? { channel: filters.channel } : {}),
            },
        })
            .then((response) => {
                const payload = response?.data?.data || {};
                setEvents(payload.events || []);
                setViewerDistrictName(payload?.viewer?.district_name || '');
                setCanDrag(Boolean(payload?.viewer?.can_drag));
            })
            .catch((err) => {
                setEvents([]);
                setError(err?.response?.data?.message || 'Gagal memuatkan kalendar aduan.');
            })
            .finally(() => setLoading(false));
    }, [apiUrl, token, range, filters.district, filters.status, filters.caseType, filters.channel]);

    const filtersBlock = (
        <div className="app-card app-filter">
            <div className="app-filter-row">
                <div className="app-filter-field">
                    <label>Daerah</label>
                    <select value={filters.district} onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}>
                        <option value="">Semua Daerah</option>
                        {districtOptions.map((district) => (
                            <option key={district.id} value={district.id}>{district.name}</option>
                        ))}
                    </select>
                </div>
                <div className="app-filter-field">
                    <label>Status</label>
                    <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
                        {STATUS_OPTIONS.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="app-filter-field">
                    <label>Jenis Aduan</label>
                    <select value={filters.caseType} onChange={(event) => setFilters((prev) => ({ ...prev, caseType: event.target.value }))}>
                        {CASE_TYPE_OPTIONS.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
                <div className="app-filter-field">
                    <label>Kaedah</label>
                    <select value={filters.channel} onChange={(event) => setFilters((prev) => ({ ...prev, channel: event.target.value }))}>
                        {CHANNEL_OPTIONS.map((option) => (
                            <option key={option.value || 'all'} value={option.value}>{option.label}</option>
                        ))}
                    </select>
                </div>
            </div>
        </div>
    );

    const calendarEvents = useMemo(() => (
        (events || []).map((event) => {
            const stage = event?.extendedProps?.current_stage || 'baru';
            return {
                ...event,
                classNames: [`app-complaint-calendar-event`, getStageTone(stage)],
            };
        })
    ), [events]);

    return (
        <ListPageLayout
            eyebrow="FIR"
            title="Kalendar Aduan"
            description="Paparan kalendar aduan untuk semakan bulanan, mingguan, dan harian. Tarikh aduan boleh dialih untuk peranan dalaman yang dibenarkan."
            filters={filtersBlock}
            actions={(
                <>
                    {role === 'pegawai_daerah' && viewerDistrictName ? (
                        <span className="app-calendar-page-note">Daerah: {viewerDistrictName}</span>
                    ) : null}
                    <button className="app-button app-button-ghost" type="button" onClick={() => navigate('/app/complaints')}>
                        <i className="bi bi-arrow-left"></i>
                        Kembali Senarai
                    </button>
                </>
            )}
        >
            {error ? <div className="app-inline-alert app-inline-alert-error">{error}</div> : null}
            <SharedCalendar
                events={calendarEvents}
                loading={loading}
                editable={canDrag}
                onDatesSet={(info) => {
                    setRange({
                        start: info.startStr,
                        end: info.endStr,
                    });
                }}
                onEventClick={(info) => {
                    navigate(`/app/complaints/${info.event.id}`);
                }}
                onEventDrop={async (info) => {
                    await axios.post(`${apiUrl}/complaints/${info.event.id}/calendar-date`, {
                        complaint_date: info.event.startStr.slice(0, 10),
                    }, {
                        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                    });
                    toast.success('Tarikh aduan berjaya dikemaskini.');
                }}
                eventContent={(arg) => {
                    const props = arg.event.extendedProps || {};
                    const stageLabel = getComplaintStageLabel(props.current_stage || 'baru', role);
                    const timeLabel = formatTimeLabel(props.complaint_time);
                    return (
                        <a
                            className="app-complaint-calendar-event-card"
                            href={`/app/complaints/${arg.event.id}`}
                            title={`${props.reference_no || arg.event.title}\n${props.complainant_name || '-'}\n${props.district_name || '-'}`}
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="app-complaint-calendar-event-top">
                                <span className="app-complaint-calendar-event-ref">{props.reference_no || arg.event.title}</span>
                                {timeLabel ? <small>{timeLabel}</small> : null}
                            </div>
                            <div className="app-complaint-calendar-event-meta">
                                <strong>{props.district_name || '-'}</strong>
                                <span>{stageLabel || '-'}</span>
                            </div>
                        </a>
                    );
                }}
                emptyText="Tiada aduan dalam julat tarikh ini."
            />
        </ListPageLayout>
    );
};

export default ComplaintCalendar;
