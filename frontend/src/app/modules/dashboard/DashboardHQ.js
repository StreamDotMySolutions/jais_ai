import React from 'react';
import { Link } from 'react-router-dom';
import { getComplaintStageLabel } from '../aduan/complaintStage';

const DashboardHQ = ({ data, role, selectedDistrictId, onDistrictChange, isLoading }) => {
    const metrics = data?.metrics || {};
    const operational = metrics?.operational || {};
    const districts = data?.filters?.available_districts || [];
    const districtSummary = data?.district_summary || [];
    const recentComplaints = data?.recent_complaints || [];
    const stageSummary = data?.stage_summary || [];
    const visibleStageSummary = stageSummary.slice(0, 6);
    const visibleRecentComplaints = recentComplaints.slice(0, 6);
    const statusLink = (status) => `/app/complaints?status=${encodeURIComponent(status)}`;
    const districtLink = (districtId) => `/app/complaints?district_id=${encodeURIComponent(String(districtId || ''))}`;

    return (
        <div className="app-dashboard app-dashboard-hq">
            <div className="app-welcome">
                <div>
                    <h3>Dashboard HQ</h3>
                    <p>Pemantauan menyeluruh prestasi aduan seluruh daerah.</p>
                </div>
                <div className="app-dashboard-filter">
                    <label htmlFor="dashboard-district-filter">Skop Daerah</label>
                    <select
                        id="dashboard-district-filter"
                        value={selectedDistrictId || ''}
                        onChange={(event) => onDistrictChange(event.target.value)}
                        disabled={isLoading}
                    >
                        <option value="">Semua Daerah</option>
                        {districts.map((district) => (
                            <option key={district.id} value={district.id}>
                                {district.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="app-metrics">
                <div className="app-metric-card">
                    <span>Jumlah Aduan</span>
                    <strong><Link className="app-metric-link" to="/app/complaints">{metrics.total ?? 0}</Link></strong>
                    <small>Skop semasa</small>
                </div>
                <div className="app-metric-card">
                    <span>Menunggu Pengesahan</span>
                    <strong><Link className="app-metric-link" to={statusLink('tunggu_pengesahan')}>{operational.tunggu_pengesahan ?? 0}</Link></strong>
                    <small>Belum disahkan pegawai</small>
                </div>
                <div className="app-metric-card">
                    <span>Menunggu Tindakan PI</span>
                    <strong><Link className="app-metric-link" to={statusLink('menunggu_tindakan_pi')}>{operational.menunggu_tindakan_pi ?? 0}</Link></strong>
                    <small>Perlu agihan tindakan</small>
                </div>
                <div className="app-metric-card">
                    <span>Dihantar Ke Daerah</span>
                    <strong><Link className="app-metric-link" to={statusLink('dihantar_ke_daerah')}>{operational.dihantar_ke_daerah ?? 0}</Link></strong>
                    <small>Menunggu tindakan daerah</small>
                </div>
            </div>

            <div className="app-stage-pipeline">
                <div className="app-stage-chip">
                    <span>Dalam Tindakan</span>
                    <strong><Link className="app-metric-link" to={statusLink('dalam_tindakan')}>{operational.dalam_tindakan ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>KIV</span>
                    <strong><Link className="app-metric-link" to={statusLink('kiv')}>{operational.kiv ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>Laporan Tindakan</span>
                    <strong><Link className="app-metric-link" to={statusLink('laporan_tindakan')}>{operational.laporan_tindakan ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>Selesai</span>
                    <strong><Link className="app-metric-link" to={statusLink('selesai')}>{operational.selesai ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>Pending Approval</span>
                    <strong><Link className="app-metric-link" to="/app/complaints/pending-approval">{metrics.pending_approval ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>Aduan Baharu</span>
                    <strong><Link className="app-metric-link" to={statusLink('baru')}>{metrics.new ?? 0}</Link></strong>
                </div>
            </div>

            <div className="app-grid">
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Taburan Mengikut Daerah</h4>
                        <span className="app-pill">{districtSummary.length} daerah</span>
                    </div>
                    <ul className="app-list app-list--compact">
                        {districtSummary.length === 0 ? (
                            <li>
                                <p className="app-muted mb-0">Tiada data daerah untuk skop semasa.</p>
                            </li>
                        ) : (
                            districtSummary.map((item) => (
                                <li key={`${item.district_id || 'na'}-${item.total}`}>
                                    <div>
                                        <strong>{item.district_name || 'Tidak diketahui'}</strong>
                                    </div>
                                    <span className="app-tag">
                                        {item.district_id ? (
                                            <Link className="app-metric-link app-metric-link--chip" to={districtLink(item.district_id)}>
                                                {item.total}
                                            </Link>
                                        ) : item.total}
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Notis Operasi</h4>
                        <span className="app-pill">HQ</span>
                    </div>
                    <div className="app-actions">
                        <Link className="app-action-link" to="/app/complaints/pending-approval">
                            <strong>{metrics.pending_approval ?? 0} aduan</strong>
                            <p>Menunggu pengesahan pegawai.</p>
                        </Link>
                        <Link className="app-action-link" to="/app/complaints/my-pic">
                            <strong>{metrics.my_pic ?? 0} aduan</strong>
                            <p>Dalam tanggungjawab PIC anda.</p>
                        </Link>
                        <Link className="app-action-link" to="/app/complaints/report">
                            <strong>Dashboard Laporan</strong>
                            <p>Lihat statistik terperinci dan laporan eksport.</p>
                        </Link>
                    </div>
                </div>
            </div>

            <div className="app-grid">
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Status Semasa</h4>
                        <span className="app-pill">{stageSummary.length} status</span>
                    </div>
                    <ul className="app-list app-list--compact app-card-scroll">
                        {stageSummary.length === 0 ? (
                            <li>
                                <p className="app-muted mb-0">Tiada data status untuk skop semasa.</p>
                            </li>
                        ) : (
                            visibleStageSummary.map((item) => (
                                <li key={`${item.stage}-${item.total}`}>
                                    <div>
                                        <strong>{getComplaintStageLabel(item.stage, role)}</strong>
                                    </div>
                                    <span className="app-tag info">
                                        <Link className="app-metric-link app-metric-link--chip" to={statusLink(item.stage)}>
                                            {item.total}
                                        </Link>
                                    </span>
                                </li>
                            ))
                        )}
                    </ul>
                    <div className="app-card-footer-actions">
                        <Link className="app-inline-link" to="/app/complaints">Lihat Semua Status</Link>
                    </div>
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Aduan Terkini</h4>
                        <span className="app-pill">{recentComplaints.length} item</span>
                    </div>
                    <ul className="app-list app-card-scroll">
                        {recentComplaints.length === 0 ? (
                            <li>
                                <p className="app-muted mb-0">Belum ada aduan terkini.</p>
                            </li>
                        ) : (
                            visibleRecentComplaints.map((item) => (
                                <li key={item.id}>
                                    <div>
                                        <strong>{item.reference_no || `Aduan #${item.id}`}</strong>
                                        <p>
                                            {(item.district_name || 'Daerah tidak dinyatakan')}
                                            {' | '}
                                            {item.complaint_date || '-'}
                                        </p>
                                    </div>
                                    <span className="app-tag">{getComplaintStageLabel(item.current_stage, role)}</span>
                                </li>
                            ))
                        )}
                    </ul>
                    <div className="app-card-footer-actions">
                        <Link className="app-inline-link" to="/app/complaints">Lihat Senarai</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardHQ;
