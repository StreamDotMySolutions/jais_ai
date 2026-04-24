import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';

const WEEKDAYS = ['Isn', 'Sel', 'Rab', 'Kha', 'Jum', 'Sab', 'Aha'];
const TIME_SLOTS = [
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '13:00',
    '14:00',
    '15:00',
    '16:00',
    '17:00',
];

const formatDateKey = (date) => date.toLocaleDateString('en-CA', {
    timeZone: 'Asia/Kuala_Lumpur',
});

const formatMonthLabel = (date) => date.toLocaleDateString('ms-MY', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
});

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const startOfWeek = (date) => {
    const day = (date.getDay() + 6) % 7;
    const next = new Date(date);
    next.setDate(next.getDate() - day);
    next.setHours(0, 0, 0, 0);
    return next;
};

const endOfWeek = (date) => {
    const next = startOfWeek(date);
    next.setDate(next.getDate() + 6);
    next.setHours(23, 59, 59, 999);
    return next;
};

const normalizeRole = (value) => {
    const role = (value || '').toString().trim().toLowerCase();
    if (!role || role === 'null' || role === 'undefined') {
        return 'awam';
    }
    return role;
};

const buildCalendarDays = (baseDate) => {
    const monthStart = startOfMonth(baseDate);
    const monthEnd = endOfMonth(baseDate);
    const gridStart = startOfWeek(monthStart);
    const gridEnd = endOfWeek(monthEnd);
    const days = [];
    const cursor = new Date(gridStart);
    while (cursor <= gridEnd) {
        days.push(new Date(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return { days, monthStart, monthEnd };
};

const AppointmentCalendar = ({ isPopup = false }) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const role = normalizeRole(localStorage.getItem('role'));
    const isHqRole = ['pegawai', 'pegawai_hq', 'admin', 'system'].includes(role);
    const [searchParams] = useSearchParams();
    const focusDate = searchParams.get('date');
    const initialDate = focusDate ? new Date(focusDate) : new Date();
    const [currentDate, setCurrentDate] = useState(initialDate);
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [activeSlotDate, setActiveSlotDate] = useState(null);
    const [expandedDates, setExpandedDates] = useState({});
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [appointments, setAppointments] = useState([]);
    const [districtFilter, setDistrictFilter] = useState('');
    const [availableDistricts, setAvailableDistricts] = useState([]);
    const [viewerDistrictName, setViewerDistrictName] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const { days, monthStart, monthEnd } = useMemo(() => buildCalendarDays(currentDate), [currentDate]);
    const monthLabel = formatMonthLabel(currentDate);
    const monthKey = formatDateKey(monthStart);

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        const token = localStorage.getItem('token');
        setIsLoading(true);
        setError('');
        axios.get(`${apiUrl}/appointments`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                start_at: formatDateKey(monthStart),
                end_at: formatDateKey(monthEnd),
                ...(isHqRole && districtFilter ? { district_id: districtFilter } : {}),
            },
        })
            .then((response) => {
                const payload = response?.data || {};
                setAppointments(payload?.data || []);
                setAvailableDistricts(payload?.filters?.available_districts || []);
                setViewerDistrictName(payload?.viewer?.district_name || '');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal mendapatkan temujanji.');
                setAppointments([]);
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [apiUrl, monthKey, districtFilter, isHqRole]);

    const appointmentsByDay = useMemo(() => {
        const map = new Map();
        appointments.forEach((item) => {
            const start = new Date(item.start_at);
            const key = formatDateKey(start);
            if (!map.has(key)) {
                map.set(key, []);
            }
            map.get(key).push(item);
        });
        map.forEach((items) => {
            items.sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
        });
        return map;
    }, [appointments]);


    const handlePrev = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() - 1);
        setCurrentDate(next);
    };

    const handleNext = () => {
        const next = new Date(currentDate);
        next.setMonth(next.getMonth() + 1);
        setCurrentDate(next);
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const selectedDateKey = formatDateKey(selectedDate);
    const activeSlotKey = activeSlotDate ? formatDateKey(activeSlotDate) : null;
    const activeSlotLabel = activeSlotDate
        ? activeSlotDate.toLocaleDateString('ms-MY', {
            weekday: 'long',
            day: '2-digit',
            month: 'long',
            year: 'numeric',
            timeZone: 'Asia/Kuala_Lumpur',
        })
        : '';

    const closeEventPopover = () => setSelectedEvent(null);

    return (
        <div
            className={`app-calendar${isPopup ? ' app-calendar--popup' : ''}`}
            onClick={() => {
                setActiveSlotDate(null);
                closeEventPopover();
            }}
        >
            <div className="app-calendar-header">
                <div className="app-calendar-actions">
                    <button className="app-button app-button-ghost" type="button" onClick={handleToday}>Hari Ini</button>
                    <button className="app-icon-button" type="button" onClick={handlePrev} aria-label="Bulan sebelumnya">‹</button>
                    <button className="app-icon-button" type="button" onClick={handleNext} aria-label="Bulan seterusnya">›</button>
                </div>
                <div className="app-calendar-title">
                    {!isPopup && <h2>Kalendar Temujanji</h2>}
                    <span>{monthLabel}</span>
                    {!isPopup && isHqRole && (
                        <label className="app-calendar-filter">
                            <small>Daerah</small>
                            <select value={districtFilter} onChange={(event) => setDistrictFilter(event.target.value)}>
                                <option value="">Semua Daerah</option>
                                {availableDistricts.map((district) => (
                                    <option key={district.id} value={district.id}>
                                        {district.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                    {!isPopup && !isHqRole && viewerDistrictName && (
                        <small className="app-calendar-scope">Daerah: {viewerDistrictName}</small>
                    )}
                </div>
            </div>

            <div className="app-calendar-grid">
                <div className="app-calendar-weekdays">
                    {WEEKDAYS.map((day) => (
                        <div key={day} className="app-calendar-weekday">{day}</div>
                    ))}
                </div>
                <div className="app-calendar-days">
                    {days.map((date) => {
                        const key = formatDateKey(date);
                        const items = appointmentsByDay.get(key) || [];
                        const isExpanded = Boolean(expandedDates[key]);
                        const isCurrentMonth = date.getMonth() === currentDate.getMonth();
                        const isFocused = focusDate === key;
                        const isSelected = selectedDateKey === key;
                        const isSlotOpen = isPopup && activeSlotKey === key;
                        const eventForDay = selectedEvent?.dayKey === key ? selectedEvent?.item : null;
                        const visibleItems = isExpanded ? items : items.slice(0, 3);
                        return (
                            <div
                                key={key}
                                className={`app-calendar-cell${isCurrentMonth ? '' : ' is-muted'}${isFocused ? ' is-focused' : ''}${isSelected ? ' is-selected' : ''}${isPopup ? ' is-pickable' : ''}${isSlotOpen ? ' is-slot-open' : ''}`}
                                onClick={(event) => {
                                    event.stopPropagation();
                                    if (isPopup) {
                                        setSelectedDate(date);
                                        setActiveSlotDate(date);
                                    }
                                    closeEventPopover();
                                }}
                                role={isPopup ? 'button' : undefined}
                                tabIndex={isPopup ? 0 : undefined}
                                onKeyDown={(event) => {
                                    if (isPopup && event.key === 'Enter') {
                                        event.stopPropagation();
                                        setSelectedDate(date);
                                        setActiveSlotDate(date);
                                    }
                                }}
                            >
                                <div className="app-calendar-date">
                                    <span>{date.getDate()}</span>
                                    <button
                                        type="button"
                                        className="app-calendar-add"
                                        onClick={(event) => {
                                            if (!isPopup) {
                                                return;
                                            }
                                            event.stopPropagation();
                                            setSelectedDate(date);
                                            setActiveSlotDate(date);
                                        }}
                                        disabled={!isPopup}
                                        aria-label="Tambah temujanji"
                                        title={!isPopup ? 'Fungsi tambah temujanji belum tersedia.' : 'Tambah temujanji'}
                                    >
                                        +
                                    </button>
                                </div>
                                <div className="app-calendar-events">
                                    {visibleItems.map((item) => {
                                        const timeLabel = new Date(item.start_at).toLocaleTimeString('ms-MY', {
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: false,
                                            timeZone: 'Asia/Kuala_Lumpur',
                                        });
                                        return (
                                            <button
                                                key={item.id}
                                                type="button"
                                                className="app-calendar-event"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setSelectedEvent({ item, dayKey: key });
                                                }}
                                            >
                                                <span>{timeLabel}</span>
                                                <strong>{item.complaint?.reference_no || item.title || 'Temujanji'}</strong>
                                            </button>
                                        );
                                    })}
                                    {items.length > 3 && !isExpanded && (
                                        <button
                                            className="app-calendar-more-btn"
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setExpandedDates((prev) => ({ ...prev, [key]: true }));
                                            }}
                                        >
                                            +{items.length - 3} lagi
                                        </button>
                                    )}
                                    {items.length > 3 && isExpanded && (
                                        <button
                                            className="app-calendar-more-btn"
                                            type="button"
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                setExpandedDates((prev) => ({ ...prev, [key]: false }));
                                            }}
                                        >
                                            Tutup
                                        </button>
                                    )}
                                    {items.length === 0 && isLoading && (
                                        <span className="app-calendar-skeleton" />
                                    )}
                                </div>
                                {isPopup && activeSlotKey === key && (
                                    <div className="app-calendar-popover" role="dialog">
                                        <div className="app-calendar-popover-header">
                                            <div>
                                                <strong>Pilih Masa</strong>
                                                <span>{activeSlotLabel}</span>
                                            </div>
                                            <button
                                                className="app-calendar-close"
                                                type="button"
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    setActiveSlotDate(null);
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                        <div className="app-calendar-popover-list">
                                            {TIME_SLOTS.map((time) => {
                                                const slotKey = `${key}T${time}`;
                                                return (
                                                    <button
                                                        key={time}
                                                        type="button"
                                                        className="app-calendar-slot"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            if (!window.opener) {
                                                                return;
                                                            }
                                                            window.opener.postMessage({
                                                                type: 'appointment-slot',
                                                                value: slotKey,
                                                            }, window.location.origin);
                                                            window.close();
                                                        }}
                                                    >
                                                        {time}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                {eventForDay && (
                                    <div className="app-calendar-event-popover" role="dialog" onClick={(event) => event.stopPropagation()}>
                                        <div className="app-calendar-event-head">
                                            <div>
                                                <strong>{eventForDay.complaint?.reference_no || eventForDay.title || 'Temujanji'}</strong>
                                                <span>
                                                    {new Date(eventForDay.start_at).toLocaleString('ms-MY', {
                                                        day: '2-digit',
                                                        month: '2-digit',
                                                        year: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit',
                                                        hour12: false,
                                                        timeZone: 'Asia/Kuala_Lumpur',
                                                    })}
                                                </span>
                                            </div>
                                            <button className="app-calendar-close" type="button" onClick={closeEventPopover}>×</button>
                                        </div>
                                        <div className="app-calendar-event-body">
                                            <div className="app-calendar-event-block">
                                                <div className="app-calendar-event-label">Maklumat Pengadu</div>
                                                <div><strong>{eventForDay.complaint?.complainant_name || '-'}</strong></div>
                                                <div>No K/P: {eventForDay.complaint?.identification_number || '-'}</div>
                                                <div>No HP: {eventForDay.complaint?.contact_number || '-'}</div>
                                            </div>
                                            <div className="app-calendar-event-block">
                                                <div className="app-calendar-event-label">Maklumat Aduan</div>
                                                <div>Tarikh/Masa: {eventForDay.complaint?.complaint_date || '-'} {eventForDay.complaint?.complaint_time || ''}</div>
                                                <div>Alamat: {eventForDay.complaint?.address || '-'}</div>
                                                <div>Daerah: {eventForDay.complaint?.district_name || '-'}</div>
                                            </div>
                                            <div className="app-calendar-event-block">
                                                <div className="app-calendar-event-label">Ringkasan Aduan</div>
                                                <div>{eventForDay.complaint?.summary || '-'}</div>
                                            </div>
                                            <div className="app-calendar-event-block">
                                                <div className="app-calendar-event-label">Status</div>
                                                <div>{eventForDay.complaint?.current_stage || '-'}</div>
                                            </div>
                                        </div>
                                        <div className="app-calendar-event-actions">
                                            <button className="app-button app-button-ghost" type="button" onClick={closeEventPopover}>
                                                Tutup
                                            </button>
                                            <button
                                                className="app-button"
                                                type="button"
                                                onClick={() => {
                                                    const detailUrl = `/app/complaints/${eventForDay.complaint_id}`;
                                                    if (isPopup && window.opener) {
                                                        window.opener.location.href = detailUrl;
                                                        window.close();
                                                        return;
                                                    }
                                                    window.location.href = detailUrl;
                                                }}
                                            >
                                                Buka Aduan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {error && <div className="app-detail-note">{error}</div>}
        </div>
    );
};

export default AppointmentCalendar;
