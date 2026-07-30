import React, { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
// Malay locale definition for FullCalendar
const msLocale = {
    code: 'ms',
    week: { dow: 1, doy: 7 },
    buttonText: { prev: 'Sebelum', next: 'Selepas', today: 'Hari Ini', year: 'Tahun', month: 'Bulan', week: 'Minggu', day: 'Hari', list: 'Senarai' },
    weekText: 'Mg',
    allDayText: 'Sepanjang Hari',
    moreLinkText: function (n) { return 'lain ' + n; },
    noEventsText: 'Tiada acara untuk dipaparkan',
};

const DEFAULT_HEADER_TOOLBAR = {
    left: 'prev,next today',
    center: 'title',
    right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
};

const SharedCalendar = ({
    events = [],
    loading = false,
    editable = false,
    selectable = false,
    initialView = 'dayGridMonth',
    height = 'auto',
    headerToolbar = DEFAULT_HEADER_TOOLBAR,
    eventContent,
    eventClassNames,
    eventDidMount,
    onDatesSet,
    onEventClick,
    onEventDrop,
    onSelect,
    emptyText = 'Tiada rekod untuk dipaparkan.',
}) => {
    const [pendingDropId, setPendingDropId] = useState(null);

    const plugins = useMemo(() => [
        dayGridPlugin,
        timeGridPlugin,
        interactionPlugin,
        listPlugin,
    ], []);

    return (
        <div className="app-shared-calendar">
            {(loading || pendingDropId !== null) && (
                <div className="app-shared-calendar-overlay">
                    <span className="app-shared-calendar-spinner"></span>
                    <strong>{pendingDropId !== null ? 'Menyimpan perubahan kalendar...' : 'Memuatkan kalendar...'}</strong>
                </div>
            )}
            <FullCalendar
                plugins={plugins}
                locale={msLocale}
                initialView={initialView}
                height={height}
                headerToolbar={headerToolbar}
                buttonText={{
                    today: 'Hari Ini',
                    month: 'Bulan',
                    week: 'Minggu',
                    day: 'Hari',
                    list: 'Senarai',
                }}
                noEventsContent={emptyText}
                dayMaxEvents
                weekends
                editable={editable}
                selectable={selectable}
                eventStartEditable={editable}
                eventDurationEditable={false}
                moreLinkClick="popover"
                events={events}
                eventContent={eventContent}
                eventClassNames={eventClassNames}
                eventDidMount={eventDidMount}
                datesSet={onDatesSet}
                eventClick={onEventClick}
                select={onSelect}
                eventDrop={async (info) => {
                    if (!onEventDrop) {
                        return;
                    }

                    const eventId = info?.event?.id ?? null;
                    setPendingDropId(eventId);
                    try {
                        await onEventDrop(info);
                    } catch (error) {
                        info.revert();
                    } finally {
                        setPendingDropId(null);
                    }
                }}
            />
        </div>
    );
};

export default SharedCalendar;
