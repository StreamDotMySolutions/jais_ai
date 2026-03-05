import React from 'react';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';

const ComplaintListInternalView = ({
    showCaseTabs,
    statusTab,
    setStatusTab,
    setPendingApproval,
    setFilters,
    setDraftFilters,
    setPage,
    isLoading,
    error,
    complaints,
    sortedComplaints,
    selectedComplaint,
    setSelectedComplaint,
    sortColumns,
    sortKey,
    sortDir,
    handleSort,
    getComplaintStageLabel,
    getIpStatusBadgeTone,
    getProsecutionStatusBadgeTone,
    getProsecutionStatusLabel,
    getClassificationAlert,
    navigate,
    canDelete,
    setDeleteTarget,
    enablePickup,
    handlePickup,
    pickupMessage,
    actionMessage,
    pagination,
    startIndex,
    endIndex,
    setPerPage,
}) => (
    <>
        {showCaseTabs && (
            <div className="app-list-tabs-row">
                <div className="app-list-tabs">
                    <button
                        type="button"
                        className={`app-list-tab${statusTab === 'all' ? ' active' : ''}`}
                        onClick={() => {
                            setStatusTab('all');
                            setPendingApproval(false);
                            setFilters((prev) => ({ ...prev, status: '' }));
                            setDraftFilters((prev) => ({ ...prev, status: '' }));
                            setPage(1);
                        }}
                    >
                        Semua
                    </button>
                    <button
                        type="button"
                        className={`app-list-tab${statusTab === 'baru' ? ' active' : ''}`}
                        onClick={() => {
                            setStatusTab('baru');
                            setPendingApproval(false);
                            setFilters((prev) => ({ ...prev, status: 'baru' }));
                            setDraftFilters((prev) => ({ ...prev, status: 'baru' }));
                            setPage(1);
                        }}
                    >
                        Baru
                    </button>
                    <button
                        type="button"
                        className={`app-list-tab${statusTab === 'pending' ? ' active' : ''}`}
                        onClick={() => {
                            setStatusTab('pending');
                            setPendingApproval(true);
                            setFilters((prev) => ({ ...prev, status: '' }));
                            setDraftFilters((prev) => ({ ...prev, status: '' }));
                            setPage(1);
                        }}
                    >
                        Menunggu Pengesahan
                    </button>
                    <button
                        type="button"
                        className={`app-list-tab${statusTab === 'disahkan' ? ' active' : ''}`}
                        onClick={() => {
                            setStatusTab('disahkan');
                            setPendingApproval(false);
                            setFilters((prev) => ({ ...prev, status: 'disahkan' }));
                            setDraftFilters((prev) => ({ ...prev, status: 'disahkan' }));
                            setPage(1);
                        }}
                    >
                        Disahkan
                    </button>
                </div>
            </div>
        )}
        {isLoading && (
            <div className="app-table app-table-actions app-table-skeleton">
                <div className="app-table-header">
                    <span>No Aduan</span>
                    <span>Tarikh</span>
                    <span>Pengadu</span>
                    <span>Daerah</span>
                    <span>Kategori</span>
                    <span>Status</span>
                    <span>Ringkasan</span>
                    <span>Tindakan</span>
                </div>
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={`skeleton-row-${index}`} className="app-table-row">
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line app-skeleton-line--sm"></span>
                    </div>
                ))}
            </div>
        )}
        {error && !isLoading && <div className="app-empty">{error}</div>}
        {!isLoading && !error && complaints.length === 0 && (
            <div className="app-empty">Tiada aduan ditemui.</div>
        )}
        {!isLoading && !error && complaints.length > 0 && (
            <div className="app-table app-table-actions">
                <SortableHeader
                    className="app-table-header"
                    columns={sortColumns}
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onSort={handleSort}
                />
                {sortedComplaints.map((item) => (
                    <div
                        key={item.id}
                        className={`app-table-row ${selectedComplaint?.id === item.id ? 'is-selected' : ''}`}
                    >
                        <span className="app-code">
                            <button
                                type="button"
                                className="app-link app-link-button"
                                onClick={() => setSelectedComplaint(item)}
                            >
                                {item.reference_no || '-'}
                            </button>
                        </span>
                        <span>{item.complaint_date || '-'}</span>
                        <span>{item.complainant_name || '-'}</span>
                        <span>{item.district_name || '-'}</span>
                        <span>{item.case_type || '-'}</span>
                        <span>
                            <span className="app-status-pill">
                                {getComplaintStageLabel(item.current_stage || 'baru')}
                            </span>
                            {(() => {
                                const ipStatus = item.case_type === 'AK'
                                    ? (item.ak_ip_status || '')
                                    : (item.aj_ip_status || '');
                                const prosecutionStatus = item.case_type === 'AK'
                                    ? ''
                                    : (item.aj_prosecution_status || '');
                                const receiverName = item?.received_by?.name || item?.receivedBy?.name || '';
                                const approverName = item?.approver_staff?.name || item?.approverStaff?.name || '';
                                const classificationAlert = getClassificationAlert ? getClassificationAlert(item) : null;
                                const show = Boolean(classificationAlert || ipStatus || prosecutionStatus || receiverName || approverName);
                                if (!show) {
                                    return null;
                                }

                                return (
                                    <span className="app-status-stack">
                                        {classificationAlert && (
                                            <span className={`app-status-pill-mini ${classificationAlert.tone || 'is-muted'} ${classificationAlert.blink ? 'app-text-blink' : ''}`}>
                                                {classificationAlert.text}
                                            </span>
                                        )}
                                        {ipStatus && (
                                            <span className={`app-status-pill-mini ${getIpStatusBadgeTone(ipStatus)}`}>
                                                Siasatan: {ipStatus}
                                            </span>
                                        )}
                                        {prosecutionStatus && (
                                            <span className={`app-status-pill-mini ${getProsecutionStatusBadgeTone(prosecutionStatus)}`}>
                                                Pendakwaan: {getProsecutionStatusLabel(prosecutionStatus)}
                                            </span>
                                        )}
                                        {receiverName && (
                                            <span className="app-status-meta-line" title={`Penerima Aduan: ${receiverName}`}>
                                                Penerima: {receiverName}
                                            </span>
                                        )}
                                        {approverName && (
                                            <span className="app-status-meta-line" title={`Pegawai Pengesah: ${approverName}`}>
                                                Pengesah: {approverName}
                                            </span>
                                        )}
                                    </span>
                                );
                            })()}
                        </span>
                        <span className="app-summary">
                            {item.summary || '-'}
                        </span>
                        <span className="app-row-actions">
                            {item.current_stage === 'baru' ? (
                                <button
                                    type="button"
                                    className="app-button app-button-ghost"
                                    onClick={() => handlePickup(item.id, true)}
                                >
                                    Terima Aduan
                                </button>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => navigate(`/app/complaints/${item.id}`)}
                                        aria-label="Kemaskini"
                                        title="Kemaskini"
                                    >
                                        <i className="bi bi-pencil"></i>
                                    </button>
                                    <a
                                        className="app-icon-button app-icon-button-xs"
                                        href={`/app/complaints/${item.id}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        aria-label="Buka dalam tab baharu"
                                        title="Buka tab baharu"
                                        onClick={(event) => event.stopPropagation()}
                                    >
                                        <i className="bi bi-box-arrow-up-right"></i>
                                    </a>
                                </>
                            )}
                            {canDelete && item.current_stage === 'baru' && (
                                <button
                                    type="button"
                                    className="app-icon-button app-icon-button-danger"
                                    onClick={() => setDeleteTarget(item)}
                                    aria-label="Padam"
                                    title="Padam"
                                >
                                    <i className="bi bi-trash"></i>
                                </button>
                            )}
                            {enablePickup && item.current_stage !== 'baru' && (
                                <button
                                    type="button"
                                    className="app-button app-button-ghost"
                                    onClick={() => handlePickup(item.id)}
                                >
                                    Ambil Aduan
                                </button>
                            )}
                        </span>
                    </div>
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

export default ComplaintListInternalView;
