import React, { useMemo } from 'react';

const DEFAULT_OPTIONS = [
    { value: '', label: '-- Pilih Status Pendakwaan --' },
    { value: 'dalam_proses', label: 'Dalam Proses' },
    { value: 'didakwa', label: 'Dalam Pendakwaan' },
    { value: 'selesai', label: 'Selesai' },
    { value: 'kiv', label: 'KIV' },
];

const SharedProsecutionStatusSelect = ({
    value,
    onChange,
    label = 'Status Pendakwaan',
    options,
}) => {
    const normalizedValue = value ?? '';
    const items = useMemo(() => {
        if (Array.isArray(options) && options.length) {
            return options;
        }
        return DEFAULT_OPTIONS;
    }, [options]);

    return (
        <label className="app-form-field">
            <span>{label}</span>
            <select
                value={normalizedValue}
                onChange={(event) => onChange?.(event.target.value)}
            >
                {items.map((opt) => (
                    <option key={opt.value || opt.label} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
        </label>
    );
};

export default SharedProsecutionStatusSelect;

