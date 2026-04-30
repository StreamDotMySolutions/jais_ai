import React from 'react';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';

const renderExpandedValue = (value) => {
    if (Array.isArray(value)) {
        return value.length ? value.join(', ') : '-';
    }
    if (value === null || value === undefined) {
        return '-';
    }
    const text = String(value).trim();
    return text ? text : '-';
};

const formatShortDateTime = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return renderExpandedValue(value);
    }
    return date.toLocaleString('ms-MY', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur',
    });
};

const formatCaseTypeDisplay = (caseType) => {
    if (caseType === 'AJ') {
        return 'Aduan Jenayah (AJ)';
    }
    if (caseType === 'AK') {
        return 'Aduan Keluarga (AK)';
    }
    return caseType || '-';
};

const formatAkSubtypeDisplay = (value) => {
    const subtype = String(value || '').trim().toLowerCase();
    if (subtype === 'nikah') return 'Nikah';
    if (subtype === 'cerai') return 'Cerai';
    if (subtype === 'rujuk') return 'Rujuk';
    if (subtype === 'poligami') return 'Poligami';
    return '';
};

const formatDateLabel = (value) => {
    if (!value) return '-';
    const raw = String(value).trim();
    const parts = raw.split('-');
    if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return raw;
};

const formatDateWithTime = (dateValue, timeValue) => {
    const dateLabel = formatDateLabel(dateValue);
    if (dateLabel === '-') return '-';
    const timeLabel = String(timeValue || '').trim().slice(0, 5);
    return timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;
};

const isPublicComplaintChannel = (channel) => {
    const normalized = String(channel || '').trim().toLowerCase();
    return ['portal', 'web', 'whatsapp', 'whatsapp_web'].includes(normalized);
};

const formatChannelLabel = (channel) => {
    const value = String(channel || '').trim().toLowerCase();
    if (!value) return '-';
    if (value === 'portal') return 'Portal (Awam)';
    if (value === 'web') return 'Web';
    if (value === 'whatsapp') return 'WhatsApp AI';
    if (value === 'whatsapp_web') return 'WhatsApp Web AI';
    if (value === 'walkin') return 'Walk-in / Kaunter';
    if (value === 'walk-in') return 'Walk-in / Kaunter';
    if (value === 'telefon') return 'Telefon';
    if (value === 'email') return 'Email';
    if (value === 'agensi') return 'Agensi';
    if (value === 'lain') return 'Lain-lain';
    return channel || '-';
};

const getListDateTimeLabel = (item) => {
    if (isPublicComplaintChannel(item?.channel)) {
        const createdAtLabel = formatShortDateTime(item?.created_at);
        if (createdAtLabel !== '-') {
            return createdAtLabel;
        }
    }
    return formatDateWithTime(item?.complaint_date, item?.complaint_time);
};
const normalizePpaClassification = (value) => {
    const normalized = String(value || '').trim().toUpperCase();
    if (normalized === 'FFA') return 'FNA';
    return normalized;
};

const getExpandedSections = (item) => {
    const currentStatusDisplay = String(item?.aj_current_status || '').trim() === 'Other'
        ? (item?.aj_current_status_other || 'Other')
        : item?.aj_current_status;
    const endDateTime = [item.end_date, (item.end_time || '').toString().slice(0, 5)]
        .filter(Boolean)
        .join(' ');
    const effectiveInformantName = item.informant_name || '-';
    const effectiveInformantId = item.informant_identification_number || '-';
    const effectiveInformantPhone = item.informant_contact_number || '-';

    return [
        {
            title: 'Maklumat Aduan',
            columns: [
                [
                    ['No. Daftar Aduan', item.reference_no],
                    ['Tarikh', item.complaint_date],
                    ['Masa', (item.complaint_time || '').toString().slice(0, 5)],
                    ['Tarikh dan Masa Tamat', endDateTime],
                ],
                [
                    ['Daerah', item.district_name],
                    ['Kategori', formatCaseTypeDisplay(item.case_type)],
                    ['Jenis Kesalahan', item.case_type === 'AJ' ? item.aj_offense_type : item.ak_offense_type],
                    ['Kesalahan Disyaki', item.offense_name || item.aj_offense_name || item.ak_offense_name],
                ],
            ],
            fullWidth: [
                ['Alamat Kejadian', item.address],
                ['Butiran Aduan', item.summary],
            ],
        },
        {
            title: 'Pemberi Maklumat / Pengadu',
            columns: [
                [
                    ['Nama Pemberi Maklumat', effectiveInformantName],
                    ['No. K/P pemberi maklumat', effectiveInformantId],
                    ['No. Telefon Pemberi Maklumat', effectiveInformantPhone],
                ],
                [
                    ['Nama Pengadu', item.complainant_name],
                    ['Nombor Telefon Pengadu', item.contact_number],
                    ['Pekerjaan Pengadu', item.complainant_occupation],
                ],
            ],
            fullWidth: [
                ['Alamat Pengadu', item.complainant_address || item.address],
            ],
        },
        {
            title: 'Tindakan',
            columns: [
                [
                    ['Klasifikasi', normalizePpaClassification(item.aj_ppa_classification)],
                    ['Status Terkini', currentStatusDisplay],
                    ['Nombor Fail', item.aj_file_no || item.case_register_no],
                    ['Nama PPA Bertanggungjawab', item.pic_user?.name || item.picUser?.name || item.aj_handover_staff?.name || item.ajHandoverStaff?.name],
                    ['Respon On-Call', item.on_call_response || item.aj_on_call_response],
                ],
                [
                    ['Status Kes OP', item.aj_op_case_status],
                    ['Kategori OP', item.aj_op_category],
                    ['Email Salinan', item.email || (Array.isArray(item.ak_email_cc) ? item.ak_email_cc : [])],
                    ['Tarikh Sebutan (Bon Mahkamah)', item.aj_court_date],
                    ['Mahkamah', item.mahkamah_nama || item.aj_mahkamah_name],
                ],
            ],
            fullWidth: [
                ['Laporan', item.aj_report_notes],
                ['Catatan Siasatan', item.aj_investigation_notes],
                ['Catatan OP', item.aj_op_notes],
            ],
        },
        {
            title: 'Audit',
            columns: [
                [
                    ['Added User', item.submitted_by?.name || item.submittedBy?.name],
                    ['Added Time', formatShortDateTime(item.created_at)],
                ],
                [
                    ['Last Modified Time', formatShortDateTime(item.updated_at)],
                    ['Modified User', item.modified_user_name],
                ],
            ],
            fullWidth: [
                ['Added User IP Address', item.created_ip_address],
                ['Modified User IP Address', item.updated_ip_address],
            ],
        },
    ];
};

const ComplaintListInternalView = ({
    userRole,
    showCaseTabs,
    canCreateComplaint,
    onOpenForm,
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
    expandedComplaintIds,
    toggleExpandedComplaint,
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
                {canCreateComplaint && (
                    <button className="app-button app-list-tabs-add-btn" type="button" onClick={onOpenForm}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Aduan
                    </button>
                )}
            </div>
        )}
        {isLoading && (
            <div className="app-table app-table-actions app-table-skeleton">
                <div className="app-table-header">
                    <span>Bil</span>
                    <span>Aduan</span>
                    <span>Daerah / Kategori</span>
                    <span>Status / Tindakan</span>
                    <span>Butiran Aduan</span>
                    <span>Tindakan</span>
                </div>
                {Array.from({ length: 6 }, (_, index) => (
                    <div key={`skeleton-row-${index}`} className="app-table-row">
                        <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
                        <span className="app-skeleton-line"></span>
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
                {sortedComplaints.map((item, index) => {
                    const isExpanded = expandedComplaintIds.includes(item.id);
                    const expandedSections = getExpandedSections(item);
                    const localUserName = (localStorage.getItem('user_name') || '').trim().toLowerCase();
                    const receiverName = (item?.received_by?.name || item?.receivedBy?.name || '').trim();
                    const isLockedByCurrentUser = Boolean(
                        item.current_stage === 'baru'
                        && receiverName
                        && localUserName
                        && receiverName.toLowerCase() === localUserName
                    );
                    const isLockedByOtherUser = Boolean(
                        item.current_stage === 'baru'
                        && receiverName
                        && (!localUserName || receiverName.toLowerCase() !== localUserName)
                    );

                    return (
                        <React.Fragment key={item.id}>
                            <div
                                className={`app-table-row ${selectedComplaint?.id === item.id ? 'is-selected' : ''}`}
                            >
                                <span>{startIndex + index}</span>
                                <span className="app-complaint-cell">
                                    <button
                                        type="button"
                                        className="app-link app-link-button app-complaint-cell-link"
                                        onClick={() => setSelectedComplaint(item)}
                                    >
                                        {item.reference_no || '-'}
                                    </button>
                                    <span className="app-complaint-cell-meta">{getListDateTimeLabel(item)}</span>
                                    <span className="app-complaint-cell-meta">{`Kaedah: ${formatChannelLabel(item.channel)}`}</span>
                                    <span className="app-complaint-cell-name">{item.complainant_name || '-'}</span>
                                </span>
                                <span className="app-complaint-cell">
                                    <span className="app-complaint-cell-name">{item.district_name || '-'}</span>
                                    <span className="app-complaint-cell-meta">{formatCaseTypeDisplay(item.case_type)}</span>
                                    {item.case_type === 'AK' && formatAkSubtypeDisplay(item.ak_subtype) && (
                                        <span className="app-complaint-cell-meta">{formatAkSubtypeDisplay(item.ak_subtype)}</span>
                                    )}
                                </span>
                                <span>
                                    <span className="app-status-pill">
                                        {getComplaintStageLabel(item.current_stage || 'baru', userRole)}
                                    </span>
                                    {(() => {
                                        const ajCurrentStatusDisplay = String(item?.aj_current_status || '').trim() === 'Other'
                                            ? (item?.aj_current_status_other || 'Other')
                                            : item?.aj_current_status;
                                        return item.case_type === 'AJ' && ajCurrentStatusDisplay ? (
                                        <span className="app-status-stack">
                                            <span className="app-status-pill app-status-pill-soft">
                                                {ajCurrentStatusDisplay}
                                            </span>
                                        </span>
                                        ) : null;
                                    })()}
                                    {(() => {
                                        const ipStatus = item.case_type === 'AK'
                                            ? (item.ak_ip_status || '')
                                            : (item.aj_ip_status || '');
                                        const prosecutionStatus = item.case_type === 'AK'
                                            ? ''
                                            : (item.aj_prosecution_status || '');
                                        const opCaseStatus = item.case_type === 'AJ'
                                            ? String(item.aj_op_case_status || '').trim()
                                            : '';
                                        const opCategory = item.case_type === 'AJ'
                                            ? String(item.aj_op_category || '').trim()
                                            : '';
                                        const receiverName = item?.received_by?.name || item?.receivedBy?.name || '';
                                        const approverName = item?.approver_staff?.name || item?.approverStaff?.name || '';
                                        const classificationAlert = getClassificationAlert ? getClassificationAlert(item) : null;
                                        const show = Boolean(classificationAlert || ipStatus || prosecutionStatus || opCaseStatus || opCategory || receiverName || approverName);
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
                                                {(opCaseStatus || opCategory) && (
                                                    <span
                                                        className="app-status-pill-mini is-muted"
                                                        title={[
                                                            opCaseStatus ? `Status Kes OP: ${opCaseStatus}` : '',
                                                            opCategory ? `Kategori OP: ${opCategory}` : '',
                                                        ].filter(Boolean).join(' | ')}
                                                    >
                                                        OP: {opCaseStatus || opCategory}
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
                                <span className={`app-row-actions app-row-actions-stack${item.current_stage === 'baru' ? ' is-compact' : ''}`}>
                                    <span className="app-row-actions-icons">
                                        {item.current_stage === 'baru' && !receiverName ? (
                                            <button
                                                type="button"
                                                className="app-button app-button-ghost"
                                                onClick={() => handlePickup(item.id, true)}
                                            >
                                                Terima Aduan
                                            </button>
                                        ) : item.current_stage === 'baru' && isLockedByCurrentUser ? (
                                            <button
                                                type="button"
                                                className="app-button app-button-ghost"
                                                onClick={() => navigate(`/app/complaints/${item.id}`)}
                                            >
                                                Sambung Kemaskini
                                            </button>
                                        ) : item.current_stage === 'baru' && isLockedByOtherUser ? (
                                            <span className="app-row-action-note">
                                                Sedang dikemaskini oleh {receiverName}
                                            </span>
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
                                    {item.current_stage !== 'baru' && (
                                        <button
                                            type="button"
                                            className="app-row-toggle-link"
                                            onClick={() => toggleExpandedComplaint(item.id)}
                                        >
                                            {isExpanded ? 'Show less' : 'Show more'}
                                            <i className={`bi ${isExpanded ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                        </button>
                                    )}
                                </span>
                            </div>
                            {item.current_stage !== 'baru' && isExpanded && (
                                <div className="app-table-expanded-row">
                                    {expandedSections.map((section) => (
                                        <div key={section.title} className="app-table-expanded-section">
                                            <h5>{section.title}</h5>
                                            <div className="app-table-expanded-columns">
                                                {(section.columns || []).map((column, columnIndex) => (
                                                    <div key={`${section.title}-column-${columnIndex}`} className="app-table-expanded-kv">
                                                        {column.map(([label, value]) => (
                                                            <div key={`${item.id}-${section.title}-${label}`} className="app-table-expanded-kv-row">
                                                                <span className="app-table-expanded-kv-label">{label}</span>
                                                                <strong className="app-table-expanded-kv-value">{renderExpandedValue(value)}</strong>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                            </div>
                                            {!!section.fullWidth?.length && (
                                                <div className="app-table-expanded-fullwidth-list">
                                                    {section.fullWidth.map(([label, value]) => (
                                                        <div key={`${item.id}-${section.title}-${label}-full`} className="app-table-expanded-fullwidth-row">
                                                            <span className="app-table-expanded-kv-label">{label}</span>
                                                            <strong className="app-table-expanded-fullwidth-value">{renderExpandedValue(value)}</strong>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </React.Fragment>
                    );
                })}
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
