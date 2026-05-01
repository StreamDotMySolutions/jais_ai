const malaysiaParts = (date = new Date()) => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kuala_Lumpur',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    return formatter.formatToParts(date).reduce((carry, part) => {
        if (part.type !== 'literal') {
            carry[part.type] = part.value;
        }
        return carry;
    }, {});
};

export const formatMalaysiaDateStamp = (date = new Date()) => {
    const parts = malaysiaParts(date);
    return `${parts.year}-${parts.month}-${parts.day}`;
};

export const formatMalaysiaDateTimeStamp = (date = new Date()) => {
    const parts = malaysiaParts(date);
    return `${parts.year}-${parts.month}-${parts.day}-${parts.hour}-${parts.minute}-${parts.second}`;
};
