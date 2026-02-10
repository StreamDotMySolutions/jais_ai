import React, { useMemo } from 'react';
import useMahkamahOptions from '../hooks/useMahkamahOptions';

const formatMahkamahLabel = (item) => item?.nama || '';

const SharedMahkamahSelect = ({
    apiUrl,
    token,
    value,
    onChange,
    placeholder = '-- Pilih Mahkamah --',
    disabled = false,
    className = '',
}) => {
    const { items, isLoading } = useMahkamahOptions({ apiUrl, token });
    const normalizedValue = value ?? '';
    const options = useMemo(() => (items || []).map((item) => ({
        value: String(item.id),
        label: formatMahkamahLabel(item),
    })), [items]);

    return (
        <select
            value={normalizedValue}
            onChange={(event) => onChange?.(event.target.value)}
            disabled={disabled || isLoading}
            className={className}
        >
            <option value="">{isLoading ? 'Memuatkan mahkamah...' : placeholder}</option>
            {options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                    {opt.label}
                </option>
            ))}
        </select>
    );
};

export default SharedMahkamahSelect;

