import React from 'react';

const ComplaintListHeader = ({
    title,
    description,
    caseType,
    canCreateComplaint,
    onOpenForm,
    showFilters,
    onToggleFilters,
    onExportExcel,
    isExporting,
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
                onClick={onExportExcel}
                disabled={isExporting}
            >
                <i className={`bi ${isExporting ? 'bi-hourglass-split' : 'bi-file-earmark-excel'}`}></i>
                {isExporting ? 'Sedang Export...' : 'Export Excel'}
            </button>
            <button
                className="app-button app-button-ghost"
                type="button"
                onClick={onToggleFilters}
            >
                <i className={`bi ${showFilters ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                {showFilters ? 'Sembunyi Filter' : 'Tunjuk Filter'}
            </button>
        </div>
    </div>
);

export default ComplaintListHeader;
