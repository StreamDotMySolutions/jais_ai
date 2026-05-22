import React, { useEffect, useMemo, useRef, useState } from 'react';

const SearchSelect = ({
    label,
    value,
    options = [],
    placeholder = '-- Pilih --',
    searchPlaceholder = 'Cari...',
    onChange,
    disabled = false,
    className = '',
}) => {
    const renderOptionLabel = (option) => {
        if (option && typeof option.label === 'object' && option.label !== null) {
            const { text, district } = option.label;
            return (
                <span className="app-search-select-option-text">
                    <span>{text}</span>
                    {district && <small>{district}</small>}
                </span>
            );
        }

        return option?.label;
    };

    const renderSelectedLabel = () => {
        if (!selected) {
            return placeholder;
        }
        return renderOptionLabel(selected);
    };

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
        return options.filter((option) => {
            const searchableLabel = option.searchLabel
                || (typeof option.label === 'string' ? option.label : '');
            return String(searchableLabel).toLowerCase().includes(term);
        });
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
        <div className={`app-search-select${disabled ? ' is-disabled' : ''}${className ? ` ${className}` : ''}`} ref={wrapperRef}>
            {label && <span className="app-search-select-label">{label}</span>}
            <div className="app-search-select-body">
                <button
                    type="button"
                    className={`app-search-select-trigger${disabled ? ' is-disabled' : ''}`}
                    disabled={disabled}
                    aria-disabled={disabled ? 'true' : 'false'}
                    onClick={() => {
                        if (disabled) return;
                        setIsOpen((prev) => !prev);
                    }}
                >
                    <span className={selected ? '' : 'is-placeholder'}>
                        {renderSelectedLabel()}
                    </span>
                    <i className={`bi ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                </button>
                {isOpen && (
                    <div className="app-search-select-menu">
                        <div className="app-search-select-input-wrap">
                            <input
                                type="text"
                                className="app-search-select-input"
                                placeholder={searchPlaceholder}
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                            />
                            {query && (
                                <button
                                    type="button"
                                    className="app-search-select-clear"
                                    aria-label="Kosongkan carian"
                                    onClick={() => setQuery('')}
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>
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
                                    {renderOptionLabel(option)}
                                </button>
                            ))}
                            {filteredOptions.length === 0 && (
                                <div className="app-search-select-empty">Tiada padanan</div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchSelect;
