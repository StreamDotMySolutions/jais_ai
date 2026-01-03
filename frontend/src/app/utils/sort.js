const normalizeValue = (value) => {
    if (value === null || value === undefined) {
        return '';
    }
    return value;
};

export const sortRows = (rows, sortKey, sortDir, accessors) => {
    if (!sortKey || !accessors || typeof accessors[sortKey] !== 'function') {
        return rows;
    }
    const getter = accessors[sortKey];
    const direction = sortDir === 'desc' ? -1 : 1;

    return [...rows].sort((a, b) => {
        const rawA = normalizeValue(getter(a));
        const rawB = normalizeValue(getter(b));

        if (typeof rawA === 'number' && typeof rawB === 'number') {
            return (rawA - rawB) * direction;
        }

        const valA = String(rawA).toLowerCase();
        const valB = String(rawB).toLowerCase();
        if (valA < valB) {
            return -1 * direction;
        }
        if (valA > valB) {
            return 1 * direction;
        }
        return 0;
    });
};
