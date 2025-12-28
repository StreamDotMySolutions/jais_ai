import React, { useEffect, useMemo, useRef, useState } from 'react';

const SearchSelect = ({
    label,
    value,
    options = [],
    placeholder = '-- Pilih --',
    searchPlaceholder = 'Cari...',
    onChange,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapperRef = useRef(null);

    const selected = useMemo(() => {
        return options.find((option) => String(option.value) === String(value));
    }, [options, value]);

    const filteredOptions = useMemo(() => {
        if (!query) {
            return options;
        }
        const term = query.toLowerCase();
        return options.filter((option) => (option.label || '').toLowerCase().includes(term));
    }, [options, query]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleSelect = (nextValue) => {
        if (onChange) {
            onChange(nextValue);
        }
        setIsOpen(false);
    };

    return (
        <div className="app-search-select" ref={wrapperRef}>
            {label && <span className="app-search-select-label">{label}</span>}
            <button
                type="button"
                className="app-search-select-trigger"
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span className={selected ? '' : 'is-placeholder'}>
                    {selected ? selected.label : placeholder}
                </span>
                <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
            </button>
            {isOpen && (
                <div className="app-search-select-menu">
                    <input
                        type="text"
                        className="app-search-select-input"
                        placeholder={searchPlaceholder}
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                    />
                    <div className="app-search-select-list">
                        <button
                            type="button"
                            className="app-search-select-option"
                            onClick={() => handleSelect('')}
                        >
                            {placeholder}
                        </button>
                        {filteredOptions.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={`app-search-select-option${String(option.value) === String(value) ? ' active' : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                {option.label}
                            </button>
                        ))}
                        {filteredOptions.length === 0 && (
                            <div className="app-search-select-empty">Tiada padanan</div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SearchSelect;
