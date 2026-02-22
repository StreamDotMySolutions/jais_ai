import React from 'react';
import { useNavigate } from 'react-router-dom';
import SharedInlineEditText from '../../components/SharedInlineEditText';

const ComplaintListDrawer = ({
    selectedComplaint,
    setSelectedComplaint,
    isPublicRole,
    getPublicComplaintStageLabel,
    getComplaintStageLabel,
    formatChannelLabel,
    formatDateTime,
    canInlineEdit,
    districtOptions,
    saveInlineField,
}) => {
    const navigate = useNavigate();

    if (!selectedComplaint) {
        return null;
    }

    return (
        <div className="app-drawer app-drawer--push">
            <aside className="app-drawer-panel">
                <div className="app-drawer-header">
                    <div>
                        <span className="app-eyebrow">Ringkasan Aduan</span>
                        <h4>{selectedComplaint.reference_no || '-'}</h4>
                        <span className="app-status-pill">
                            {isPublicRole
                                ? getPublicComplaintStageLabel(selectedComplaint.current_stage || 'baru', selectedComplaint)
                                : getComplaintStageLabel(selectedComplaint.current_stage || 'baru')}
                        </span>
                    </div>
                    <button
                        className="app-modal-close"
                        type="button"
                        onClick={() => setSelectedComplaint(null)}
                    >
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="app-drawer-section app-drawer-section--clean">
                    <h4 className="app-drawer-main-title">Maklumat Aduan</h4>
                    <div className="app-detail-submeta" aria-label="Maklumat penghantaran aduan">
                        <div className="app-detail-submeta-item">
                            <span className="app-detail-submeta-label">Tahun</span>
                            <strong>{selectedComplaint.complaint_year || '-'}</strong>
                        </div>
                        <div className="app-detail-submeta-item">
                            <span className="app-detail-submeta-label">Tarikh</span>
                            <strong>{selectedComplaint.complaint_date || '-'}</strong>
                        </div>
                        <div className="app-detail-submeta-item">
                            <span className="app-detail-submeta-label">Masa</span>
                            <strong>{(selectedComplaint.complaint_time || '').toString().slice(0, 5) || '-'}</strong>
                        </div>
                        <div className="app-detail-submeta-item">
                            <span className="app-detail-submeta-label">Kaedah Aduan</span>
                            <strong>{formatChannelLabel(selectedComplaint.channel)}</strong>
                        </div>
                        <div className="app-detail-submeta-item">
                            <span className="app-detail-submeta-label">Dihantar</span>
                            <strong>{selectedComplaint.submitted_at ? formatDateTime(selectedComplaint.submitted_at) : '-'}</strong>
                        </div>
                    </div>
                </div>

                <div className="app-basic-kv app-drawer-basic-kv">
                    <div className="app-drawer-section">
                        <div className="app-card-subheader">
                            <h5>Butir-butir Pemberi Maklumat / Pengadu</h5>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">Nama</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.complainant_name || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    onConfirm={(val) => saveInlineField('complainant_name', val)}
                                />
                            </span>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">No Kad Pengenalan</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.identification_number || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    onConfirm={(val) => saveInlineField('identification_number', val)}
                                />
                            </span>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">No HP</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.contact_number || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    onConfirm={(val) => saveInlineField('contact_number', val)}
                                />
                            </span>
                        </div>
                    </div>

                    <div className="app-drawer-section">
                        <div className="app-card-subheader">
                            <h5>Maklumat Kejadian</h5>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">Tarikh Kejadian</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.incident_date || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    inputType="date"
                                    onConfirm={(val) => saveInlineField('incident_date', val)}
                                />
                            </span>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">Masa Kejadian</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={(selectedComplaint.incident_time || '').toString().slice(0, 5)}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    inputType="time"
                                    onConfirm={(val) => saveInlineField('incident_time', val)}
                                />
                            </span>
                        </div>
                        <div className="app-kv">
                            <span className="app-kv-label">Daerah</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.district_id ? String(selectedComplaint.district_id) : ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    mode="select"
                                    options={districtOptions.map((district) => ({
                                        value: String(district.id),
                                        label: district.name,
                                    }))}
                                    onConfirm={(val) => saveInlineField('district_id', val)}
                                />
                            </span>
                        </div>
                        <div className="app-kv app-kv--stack">
                            <span className="app-kv-label">Alamat</span>
                            <span className="app-kv-value">
                                <SharedInlineEditText
                                    value={selectedComplaint.address || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    mode="textarea"
                                    fullWidth
                                    onConfirm={(val) => saveInlineField('address', val)}
                                />
                            </span>
                        </div>
                        {!isPublicRole && (
                            <>
                                <div className="app-kv">
                                    <span className="app-kv-label">Status Siasatan</span>
                                    <span className="app-kv-value">
                                        {selectedComplaint.case_type === 'AK'
                                            ? (selectedComplaint.ak_ip_status || '-')
                                            : (selectedComplaint.aj_ip_status || '-')}
                                    </span>
                                </div>
                                {selectedComplaint.case_type !== 'AK' && (
                                    <div className="app-kv">
                                        <span className="app-kv-label">Status Pendakwaan</span>
                                        <span className="app-kv-value">{selectedComplaint.aj_prosecution_status || '-'}</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="app-drawer-section">
                    <h5>Ringkasan Aduan (Pengadu)</h5>
                    <p>
                        <SharedInlineEditText
                            value={selectedComplaint.summary || ''}
                            placeholder="-"
                            canEdit={canInlineEdit}
                            mode="textarea"
                            textareaRows={8}
                            textareaAutoGrow
                            fullWidth
                            onConfirm={(val) => saveInlineField('summary', val)}
                        />
                    </p>
                    {canInlineEdit && (
                        <>
                            <h5 style={{ marginTop: '0.85rem' }}>Butiran Aduan (Borang 5)</h5>
                            <p>
                                <SharedInlineEditText
                                    value={selectedComplaint.borang5_statement || ''}
                                    placeholder="-"
                                    canEdit={canInlineEdit}
                                    mode="textarea"
                                    textareaRows={8}
                                    textareaAutoGrow
                                    fullWidth
                                    onConfirm={(val) => saveInlineField('borang5_statement', val)}
                                />
                            </p>
                        </>
                    )}
                </div>

                <div className="app-drawer-actions">
                    <button
                        className="app-button"
                        type="button"
                        onClick={() => navigate(`/app/complaints/${selectedComplaint.id}`)}
                    >
                        Butiran Aduan
                    </button>
                    <a
                        href={`/app/complaints/${selectedComplaint.id}`}
                        className="app-icon-button"
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Buka di tab baru"
                        title="Buka di tab baru"
                    >
                        <i className="bi bi-box-arrow-up-right"></i>
                    </a>
                </div>
            </aside>
        </div>
    );
};

export default ComplaintListDrawer;
