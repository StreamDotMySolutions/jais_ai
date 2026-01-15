import React from 'react';

const PaginationBar = ({
    page,
    lastPage,
    total,
    perPage,
    startIndex,
    endIndex,
    onPageChange,
    onPerPageChange,
}) => {
    if (!total) {
        return null;
    }

    return (
        <div className="app-pagination">
            <div className="app-muted">
                Papar {startIndex}-{endIndex} daripada {total}
            </div>
            <div className="app-pagination-controls">
                <button
                    type="button"
                    className="app-button app-button-ghost"
                    onClick={() => onPageChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                >
                    Sebelum
                </button>
                <span className="app-pagination-page">
                    Halaman {page} / {lastPage}
                </span>
                <button
                    type="button"
                    className="app-button app-button-ghost"
                    onClick={() => onPageChange(Math.min(lastPage, page + 1))}
                    disabled={page >= lastPage}
                >
                    Seterusnya
                </button>
            </div>
            <div className="app-pagination-select">
                <span className="app-muted">Per halaman</span>
                <select value={perPage} onChange={(event) => onPerPageChange(Number(event.target.value))}>
                    {[10, 20, 30, 50].map((size) => (
                        <option key={size} value={size}>
                            {size}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    );
};

export default PaginationBar;
