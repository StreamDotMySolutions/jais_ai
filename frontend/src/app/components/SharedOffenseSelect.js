import React, { useMemo } from 'react';
import SearchSelect from '../../libs/SearchSelect';
import useOffenseOptions from '../hooks/useOffenseOptions';

const toOptionLabel = (item) => {
    const section = item?.section ? `${item.section} - ` : '';
    return `${section}${item?.name || ''}`;
};

const SharedOffenseSelect = ({
    apiUrl,
    value,
    onChange,
    label = 'Kesalahan Disyaki',
    placeholder = '-- Pilih Kesalahan Disyaki --',
}) => {
    const { items, isLoading } = useOffenseOptions({ apiUrl });

    const options = useMemo(() => (
        (items || []).map((item) => ({
            value: String(item.id),
            label: toOptionLabel(item),
        }))
    ), [items]);

    return (
        <SearchSelect
            label={label}
            value={value || ''}
            options={options}
            placeholder={isLoading ? 'Memuatkan kesalahan...' : placeholder}
            onChange={onChange}
        />
    );
};

export default SharedOffenseSelect;
