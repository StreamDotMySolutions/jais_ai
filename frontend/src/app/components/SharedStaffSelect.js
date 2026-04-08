import React, { useMemo } from 'react';
import useStaffOptions from '../hooks/useStaffOptions';

const formatStaffLabel = (staff) => {
    if (!staff) {
        return '';
    }
    if (staff.staff_id) {
        return `${staff.name} (${staff.staff_id})`;
    }
    return staff.name || '';
};

/**
 * Shared staff dropdown (global cached options).
 * Renders a plain <select> so it can be used inside existing layouts.
 */
const SharedStaffSelect = ({
    apiUrl,
    token,
    value,
    onChange,
    officeType = '',
    sameDistrictOfStaffId = '',
    placeholder = '-- Pilih Pegawai --',
    disabled = false,
    className = '',
}) => {
    const { items, isLoading } = useStaffOptions({ apiUrl, token, officeType, sameDistrictOfStaffId });

    const normalizedValue = value ?? '';
    const options = useMemo(() => (items || []).map((item) => ({
        value: String(item.id),
        label: formatStaffLabel(item),
    })), [items]);

    return (
        <select
            value={normalizedValue}
            onChange={(event) => onChange?.(event.target.value)}
            disabled={disabled || isLoading}
            className={className}
        >
            <option value="">{isLoading ? 'Memuatkan pegawai...' : placeholder}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
};

export default SharedStaffSelect;
