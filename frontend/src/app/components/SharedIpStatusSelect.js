import React from 'react';
import SearchSelect from '../../libs/SearchSelect';

const DEFAULT_IP_STATUSES = [
    { value: 'Proses Siasatan', label: 'Proses Siasatan' },
    { value: 'Semakan PP (US)', label: 'Semakan PP (US)' },
    { value: 'Semakan KPP', label: 'Semakan KPP' },
    { value: 'Semakan JPSS', label: 'Semakan JPSS' },
    { value: 'Selesai', label: 'Selesai' },
];

const SharedIpStatusSelect = ({
    value,
    onChange,
    label = 'Status IP',
    placeholder = '-- Pilih Status IP --',
    options = DEFAULT_IP_STATUSES,
    disabled = false,
}) => {
    return (
        <div className={disabled ? 'app-field-disabled' : ''}>
            <SearchSelect
                label={label}
                value={value || ''}
                options={options}
                placeholder={placeholder}
                onChange={(next) => {
                    if (disabled) return;
                    onChange?.(next);
                }}
            />
        </div>
    );
};

export default SharedIpStatusSelect;

