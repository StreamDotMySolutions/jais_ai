import React, { useMemo } from 'react';
import SearchSelect from '../../libs/SearchSelect';
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

const formatSearchStaffLabel = (staff, showDistrictLabel = false) => {
    const primary = formatStaffLabel(staff);
    const districtName = staff?.district?.name || '';

    if (!showDistrictLabel || !districtName) {
        return primary;
    }

    return {
        text: primary,
        district: districtName,
    };
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
    searchable = false,
    searchPlaceholder = 'Cari pegawai...',
    showDistrictLabel = false,
}) => {
    const { items, isLoading } = useStaffOptions({ apiUrl, token, officeType, sameDistrictOfStaffId });

    const normalizedValue = value ?? '';
    const options = useMemo(() => (items || []).map((item) => ({
        value: String(item.id),
        label: searchable && showDistrictLabel ? formatSearchStaffLabel(item, true) : formatStaffLabel(item),
        searchLabel: formatStaffLabel(item),
    })), [items, searchable, showDistrictLabel]);

    if (searchable) {
        return (
            <SearchSelect
                value={normalizedValue}
                options={options}
                placeholder={isLoading ? 'Memuatkan pegawai...' : placeholder}
                searchPlaceholder={searchPlaceholder}
                onChange={onChange}
                disabled={disabled || isLoading}
            />
        );
    }

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
