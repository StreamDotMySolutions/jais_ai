import React from 'react';

const SortableHeader = ({
    className = '',
    columns = [],
    sortKey = '',
    sortDir = 'asc',
    onSort,
}) => (
    <div className={className}>
        {columns.map((col, index) => {
            const key = col.key || `col-${index}`;
            if (!col.sortable) {
                return <span key={key}>{col.label}</span>;
            }
            const isActive = sortKey === col.key;
            const icon = isActive
                ? (sortDir === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down')
                : 'bi-arrow-down-up';
            return (
                <span key={key}>
                    <button
                        type="button"
                        className={`app-sort-button${isActive ? ' is-active' : ''}`}
                        onClick={() => onSort?.(col.key)}
                    >
                        <span>{col.label}</span>
                        <i className={`bi ${icon}`}></i>
                    </button>
                </span>
            );
        })}
    </div>
);

export default SortableHeader;
