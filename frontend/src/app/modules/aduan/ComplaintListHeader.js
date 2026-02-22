import React from 'react';

const ComplaintListHeader = ({
    title,
    description,
    caseType,
    canCreateComplaint,
    onOpenForm,
    showFilters,
    onToggleFilters,
    quickQuery,
    setQuickQuery,
    setPage,
}) => (
    <div className="app-complaints-header">
        <div>
            <div className="app-complaints-title">
                <h3>{title}</h3>
                {caseType && (
                    <span className="app-status-pill">
                        {caseType === 'AJ' ? 'AJ - Jenayah' : 'AK - Keluarga'}
                    </span>
                )}
            </div>
            <p>{description}</p>
        </div>
        <div className="app-complaints-actions">
            {canCreateComplaint && (
                <button className="app-button" type="button" onClick={onOpenForm}>
                    <i className="bi bi-plus-lg"></i>
                    Tambah Aduan
                </button>
            )}
            <button
                className="app-button app-button-ghost"
                type="button"
                onClick={onToggleFilters}
            >
                <i className={`bi ${showFilters ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                {showFilters ? 'Sembunyi Filter' : 'Tunjuk Filter'}
            </button>
            <div className="app-search">
                <i className="bi bi-search"></i>
                <input
                    type="text"
                    placeholder="Cari no aduan, pengadu, daerah..."
                    value={quickQuery}
                    onChange={(event) => {
                        setQuickQuery(event.target.value);
                        setPage(1);
                    }}
                />
                {quickQuery && (
                    <button
                        type="button"
                        className="app-search-clear"
                        aria-label="Kosongkan carian"
                        onClick={() => {
                            setQuickQuery('');
                            setPage(1);
                        }}
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                )}
            </div>
        </div>
    </div>
);

export default ComplaintListHeader;
