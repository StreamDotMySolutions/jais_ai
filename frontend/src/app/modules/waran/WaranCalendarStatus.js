import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ListPageLayout from '../../components/ListPageLayout';

const STATUS_META = {
    draf: { label: 'Draf', color: '#6b7280' },
    berjaya: { label: 'Berjaya', color: '#117a37' },
    tidak_berjaya: { label: 'Tidak Berjaya', color: '#b42318' },
    dalam_proses: { label: 'Dalam Proses', color: '#b58900' },
    kembalian: { label: 'Kembalian', color: '#64748b' },
};

const WEEKDAYS = ['Isnin', 'Selasa', 'Rabu', 'Khamis', 'Jumaat', 'Sabtu', 'Ahad'];

const toMonthKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

const toDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildMonthGrid = (monthAnchor) => {
    const startOfMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1);
    const weekdayIndex = (startOfMonth.getDay() + 6) % 7;
    const startDate = new Date(startOfMonth);
    startDate.setDate(startOfMonth.getDate() - weekdayIndex);

    return Array.from({ length: 42 }, (_, index) => {
        const next = new Date(startDate);
        next.setDate(startDate.getDate() + index);
        return next;
    });
};

const formatMonthLabel = (date) => new Intl.DateTimeFormat('ms-MY', {
    month: 'long',
    year: 'numeric',
}).format(date);

const formatDayLabel = (date) => new Intl.DateTimeFormat('ms-MY', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
}).format(date);

const formatDateDisplay = (value) => {
    if (!value) return '-';
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(parsed);
};

const WaranCalendarStatus = () => {
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [viewMode, setViewMode] = useState('month');
    const [focusDate, setFocusDate] = useState(() => new Date());
    const [districtOptions, setDistrictOptions] = useState([]);
    const [eventsByDate, setEventsByDate] = useState({});
    const [statusSummary, setStatusSummary] = useState([]);
    const [dateFieldOptions, setDateFieldOptions] = useState([
        { value: 'all', label: 'Semua' },
        { value: 'tarikh_bicara', label: 'Tarikh Bicara' },
        { value: 'tarikh_masa_terima', label: 'Tarikh / Masa Terima' },
    ]);
    const [total, setTotal] = useState(0);
    const [filters, setFilters] = useState({
        district: '',
        status: '',
        dateField: 'all',
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const monthAnchor = useMemo(() => (
        new Date(focusDate.getFullYear(), focusDate.getMonth(), 1)
    ), [focusDate]);
    const monthKey = useMemo(() => toMonthKey(monthAnchor), [monthAnchor]);
    const focusDateKey = useMemo(() => toDateKey(focusDate), [focusDate]);
    const monthCells = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
    const dateFieldLabel = useMemo(() => {
        const found = (dateFieldOptions || []).find((item) => item.value === filters.dateField);
        return found?.label || 'Tarikh';
    }, [dateFieldOptions, filters.dateField]);

    useEffect(() => {
        if (!apiUrl) return;
        axios.get(`${apiUrl}/districts`)
            .then((response) => setDistrictOptions(response?.data?.data || []))
            .catch(() => setDistrictOptions([]));
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        setLoading(true);
        setError('');

        axios.get(`${apiUrl}/i-waran/calendar/status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                month: monthKey,
                ...(filters.district ? { district_id: filters.district } : {}),
                ...(filters.status ? { status: filters.status } : {}),
                ...(filters.dateField ? { date_field: filters.dateField } : {}),
            },
        })
            .then((response) => {
                const payload = response?.data?.data || {};
                setEventsByDate(payload.by_date || {});
                setStatusSummary(payload.by_status || []);
                if (Array.isArray(payload.available_date_fields) && payload.available_date_fields.length > 0) {
                    setDateFieldOptions(payload.available_date_fields);
                }
                setTotal(Number(payload.total || 0));
            })
            .catch((err) => {
                setEventsByDate({});
                setStatusSummary([]);
                setTotal(0);
                setError(err?.response?.data?.message || 'Gagal memuatkan kalendar i-WARAN.');
            })
            .finally(() => setLoading(false));
    }, [apiUrl, token, monthKey, filters.district, filters.status, filters.dateField]);

    const movePrev = () => {
        setFocusDate((prev) => {
            const next = new Date(prev);
            if (viewMode === 'day') {
                next.setDate(next.getDate() - 1);
                return next;
            }
            return new Date(prev.getFullYear(), prev.getMonth() - 1, 1);
        });
    };

    const moveNext = () => {
        setFocusDate((prev) => {
            const next = new Date(prev);
            if (viewMode === 'day') {
                next.setDate(next.getDate() + 1);
                return next;
            }
            return new Date(prev.getFullYear(), prev.getMonth() + 1, 1);
        });
    };

    const goToday = () => {
        const now = new Date();
        setFocusDate(new Date(now.getFullYear(), now.getMonth(), now.getDate()));
    };

    const dayEvents = eventsByDate[focusDateKey] || [];
    const headerCount = viewMode === 'day' ? dayEvents.length : total;

    return (
        <ListPageLayout
            eyebrow="i-WARAN"
            title="Kalendar i-WARAN"
            description="Paparan kalendar umum i-WARAN. Pilih parameter tarikh yang diperlukan dan data dipaparkan ikut status."
            actions={(
                <>
                    <button className="app-button app-button-ghost" type="button" onClick={() => navigate('/app/i-waran')}>
                        <i className="bi bi-arrow-left"></i>
                        Kembali Senarai
                    </button>
                    <div className="app-waran-calendar-switch">
                        <button
                            className={`app-button ${viewMode === 'month' ? '' : 'app-button-ghost'}`}
                            type="button"
                            onClick={() => setViewMode('month')}
                        >
                            Bulan
                        </button>
                        <button
                            className={`app-button ${viewMode === 'day' ? '' : 'app-button-ghost'}`}
                            type="button"
                            onClick={() => setViewMode('day')}
                        >
                            Hari
                        </button>
                    </div>
                    <button className="app-button app-button-ghost" type="button" onClick={movePrev}>
                        <i className="bi bi-chevron-left"></i>
                    </button>
                    <button className="app-button app-button-ghost" type="button" onClick={goToday}>
                        Hari Ini
                    </button>
                    <button className="app-button app-button-ghost" type="button" onClick={moveNext}>
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </>
            )}
        >
            <div className="app-card app-filter">
                <div className="app-filter-row">
                    <div className="app-filter-field">
                        <label>Parameter Tarikh</label>
                        <select value={filters.dateField} onChange={(event) => setFilters((prev) => ({ ...prev, dateField: event.target.value }))}>
                            {(dateFieldOptions || []).map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                    <div className="app-filter-field">
                        <label>Daerah</label>
                        <select value={filters.district} onChange={(event) => setFilters((prev) => ({ ...prev, district: event.target.value }))}>
                            <option value="">Semua Daerah</option>
                            {(districtOptions || []).map((district) => (
                                <option key={district.id} value={district.id}>{district.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="app-filter-field">
                        <label>Status</label>
                        <select value={filters.status} onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}>
                            <option value="">Semua Status</option>
                            {Object.entries(STATUS_META).map(([value, item]) => (
                                <option key={value} value={value}>{item.label}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {error ? <div className="app-inline-alert app-inline-alert-error">{error}</div> : null}

            <div className="app-card app-waran-calendar">
                <div className="app-waran-calendar-head">
                    <h4>{viewMode === 'day' ? formatDayLabel(focusDate) : formatMonthLabel(monthAnchor)}</h4>
                    <span>{headerCount} rekod · {dateFieldLabel}</span>
                </div>

                <div className="app-waran-calendar-kv">
                    <div className="app-waran-calendar-kv-item">
                        <span>Parameter Tarikh</span>
                        <strong>{dateFieldLabel}</strong>
                    </div>
                    <div className="app-waran-calendar-kv-item">
                        <span>Paparan</span>
                        <strong>{viewMode === 'day' ? 'Hari' : 'Bulan'}</strong>
                    </div>
                    <div className="app-waran-calendar-kv-item">
                        <span>Jumlah Rekod</span>
                        <strong>{headerCount}</strong>
                    </div>
                </div>

                {viewMode === 'day' && (
                    <div className="app-waran-calendar-day-filter">
                        <label>Pilih Tarikh</label>
                        <input
                            type="date"
                            value={focusDateKey}
                            onChange={(event) => {
                                const value = event.target.value;
                                if (!value) return;
                                const next = new Date(`${value}T00:00:00`);
                                if (!Number.isNaN(next.getTime())) {
                                    setFocusDate(next);
                                }
                            }}
                        />
                    </div>
                )}

                <div className="app-waran-calendar-legend">
                    {statusSummary.map((row) => {
                        const meta = STATUS_META[row.status] || { label: row.label || row.status, color: '#334155' };
                        return (
                            <span key={row.status} className="app-waran-calendar-legend-item">
                                <i style={{ background: meta.color }}></i>
                                {meta.label}: {row.total}
                            </span>
                        );
                    })}
                </div>

                {viewMode === 'month' && (
                    <div className="app-waran-calendar-grid">
                        {WEEKDAYS.map((day) => (
                            <div key={day} className="app-waran-calendar-weekday">{day}</div>
                        ))}
                        {monthCells.map((cellDate) => {
                            const dateKey = toDateKey(cellDate);
                            const isCurrentMonth = cellDate.getMonth() === monthAnchor.getMonth();
                            const events = eventsByDate[dateKey] || [];
                            const visibleEvents = events.slice(0, 3);
                            const moreCount = events.length - visibleEvents.length;
                            return (
                                <div key={dateKey} className={`app-waran-calendar-cell${isCurrentMonth ? '' : ' is-muted'}`}>
                                    <div className="app-waran-calendar-date">{cellDate.getDate()}</div>
                                    <div className="app-waran-calendar-events">
                                        {loading ? <span className="app-waran-calendar-loading"></span> : null}
                                        {!loading && visibleEvents.map((event) => {
                                            const meta = STATUS_META[event.status] || { label: event.status_label || event.status, color: '#334155' };
                                            return (
                                                <button
                                                    key={`${event.id}-${event.status}-${event.no_kes}`}
                                                    type="button"
                                                    className="app-waran-calendar-event"
                                                    style={{ borderLeftColor: meta.color }}
                                                    title={`${meta.label} · ${event.no_kes}`}
                                                    onClick={() => navigate(`/app/i-waran/${event.id}`)}
                                                >
                                                    <span className="app-waran-calendar-event-kv">
                                                        <small>Status</small>
                                                        <strong>{meta.label}</strong>
                                                    </span>
                                                    <span className="app-waran-calendar-event-kv">
                                                        <small>No. Kes</small>
                                                        <em>{event.no_kes}</em>
                                                    </span>
                                                </button>
                                            );
                                        })}
                                        {!loading && moreCount > 0 ? <span className="app-waran-calendar-more">+{moreCount} lagi</span> : null}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'day' && (
                    <div className="app-waran-calendar-day-list">
                        {loading && <span className="app-waran-calendar-loading"></span>}
                        {!loading && dayEvents.length === 0 && (
                            <div className="app-empty">Tiada rekod untuk tarikh ini.</div>
                        )}
                        {!loading && dayEvents.map((event) => {
                            const meta = STATUS_META[event.status] || { label: event.status_label || event.status, color: '#334155' };
                            return (
                                <button
                                    key={`${event.id}-${event.status}-${event.no_kes}`}
                                    type="button"
                                    className="app-waran-calendar-day-item"
                                    onClick={() => navigate(`/app/i-waran/${event.id}`)}
                                >
                                    <div className="app-waran-calendar-day-grid">
                                        <span>Status</span>
                                        <strong>{meta.label}</strong>
                                        <span>No. Kes</span>
                                        <strong>{event.no_kes}</strong>
                                        <span>Daerah</span>
                                        <strong>{event.district_name || '-'}</strong>
                                        <span>Tarikh</span>
                                        <strong>{formatDateDisplay(event.date)}</strong>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        </ListPageLayout>
    );
};

export default WaranCalendarStatus;
