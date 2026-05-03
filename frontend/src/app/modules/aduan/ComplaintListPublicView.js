import React from 'react';
import PaginationBar from '../../components/PaginationBar';

const ComplaintListPublicView = ({
    isLoading,
    error,
    complaints,
    sortedComplaints,
    setSelectedComplaint,
    navigate,
    getPublicComplaintStageLabel,
    pickupMessage,
    actionMessage,
    pagination,
    startIndex,
    endIndex,
    setPage,
    setPerPage,
}) => (
    <>
        {isLoading && (
            <div className="app-empty">Sedang memuatkan aduan...</div>
        )}
        {error && !isLoading && <div className="app-empty">{error}</div>}
        {!isLoading && !error && complaints.length === 0 && (
            <div className="app-empty">Tiada aduan ditemui.</div>
        )}
        {!isLoading && !error && complaints.length > 0 && (
            <div className="app-public-list">
                {sortedComplaints.map((item) => (
                    <article key={item.id} className="app-public-card">
                        <div className="app-public-card-header">
                            <button
                                type="button"
                                className="app-link app-link-button app-public-ref"
                                onClick={() => navigate(`/app/complaints/${item.id}`)}
                            >
                                {item.reference_no || '-'}
                            </button>
                            <span className="app-status-pill">
                                {getPublicComplaintStageLabel(item.current_stage || 'baru', item)}
                            </span>
                        </div>
                        <div className="app-public-card-meta">
                            <span><strong>Tarikh:</strong> {item.complaint_date || '-'}</span>
                            <span><strong>Daerah:</strong> {item.district_name || '-'}</span>
                            <span><strong>Kategori:</strong> {item.case_type || '-'}</span>
                        </div>
                        <p className="app-public-card-summary">{item.summary || '-'}</p>
                        <div className="app-public-card-actions">
                            {/*
                              Drawer preview flow is kept for future reference.
                              No. aduan now opens the full complaint detail page directly.
                            */}
                            <button
                                type="button"
                                className="app-button app-button-ghost"
                                onClick={() => setSelectedComplaint(item)}
                            >
                                Papar Maklumat
                            </button>
                            <a
                                className="app-icon-button app-icon-button-xs"
                                href={`/app/complaints/${item.id}`}
                                target="_blank"
                                rel="noreferrer"
                                aria-label="Buka dalam tab baharu"
                                title="Buka tab baharu"
                            >
                                <i className="bi bi-box-arrow-up-right"></i>
                            </a>
                        </div>
                    </article>
                ))}
            </div>
        )}
        {pickupMessage && <div className="app-detail-note">{pickupMessage}</div>}
        {actionMessage && <div className="app-detail-note">{actionMessage}</div>}
        {!isLoading && !error && pagination.total > 0 && (
            <PaginationBar
                page={pagination.current_page}
                lastPage={pagination.last_page}
                total={pagination.total}
                perPage={pagination.per_page}
                startIndex={startIndex}
                endIndex={endIndex}
                onPageChange={(nextPage) => setPage(nextPage)}
                onPerPageChange={(size) => {
                    setPerPage(size);
                    setPage(1);
                }}
            />
        )}
    </>
);

export default ComplaintListPublicView;
