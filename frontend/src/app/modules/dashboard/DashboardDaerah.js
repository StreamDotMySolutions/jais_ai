import React from 'react';
import { Link } from 'react-router-dom';
import { getComplaintStageLabel } from '../aduan/complaintStage';

const DashboardDaerah = ({ data, role }) => {
    const metrics = data?.metrics || {};
    const operational = metrics?.operational || {};
    const recentComplaints = data?.recent_complaints || [];
    const stageSummary = data?.stage_summary || [];
    const districtName = data?.viewer?.district_name || 'Daerah Tidak Ditetapkan';
    const statusLink = (status) => `/app/complaints?status=${encodeURIComponent(status)}`;

    return (
        <div className="app-dashboard app-dashboard-daerah">
            <div className="app-welcome">
                <div>
                    <h3>Dashboard Daerah</h3>
                    <p>Fokus operasi dan tindakan untuk {districtName}.</p>
                </div>
                <Link to="/app/complaints" className="app-cta">
                    Buka Senarai Aduan
                </Link>
            </div>

            <div className="app-metrics">
                <div className="app-metric-card">
                    <span>Jumlah Aduan Daerah</span>
                    <strong><Link className="app-metric-link" to="/app/complaints">{metrics.total ?? 0}</Link></strong>
                    <small>Skop daerah anda</small>
                </div>
                <div className="app-metric-card">
                    <span>Kes Baharu Daerah</span>
                    <strong><Link className="app-metric-link" to={statusLink('dihantar_ke_daerah')}>{operational.dihantar_ke_daerah ?? 0}</Link></strong>
                    <small>Kes baru turun ke daerah</small>
                </div>
                <div className="app-metric-card">
                    <span>Dalam Tindakan</span>
                    <strong><Link className="app-metric-link" to={statusLink('dalam_tindakan')}>{operational.dalam_tindakan ?? 0}</Link></strong>
                    <small>Kes aktif semasa</small>
                </div>
                <div className="app-metric-card">
                    <span>Selesai</span>
                    <strong><Link className="app-metric-link" to={statusLink('selesai')}>{metrics.completed ?? 0}</Link></strong>
                    <small>Kes ditutup</small>
                </div>
            </div>

            <div className="app-stage-pipeline">
                <div className="app-stage-chip">
                    <span>Disahkan</span>
                    <strong><Link className="app-metric-link" to={statusLink('disahkan')}>{operational.disahkan ?? 0}</Link></strong>
                </div>
                <div className="app-stage-chip">
                    <span>Menunggu Tindakan PI</span>
                    <strong><Link className="app-metric-link" to={statusLink('menunggu_tindakan_pi')}>{operational.menunggu_tindakan_pi ?? 0}</Link></strong>
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
                    <span>Aduan Baharu</span>
                    <strong><Link className="app-metric-link" to={statusLink('baru')}>{metrics.new ?? 0}</Link></strong>
                </div>
            </div>

            <div className="app-grid">
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Fokus Tindakan</h4>
                        <span className="app-pill">Daerah</span>
                    </div>
                    <div className="app-actions">
                        <Link className="app-action-link" to="/app/complaints/pending-approval">
                            <strong>{metrics.pending_approval ?? 0} aduan</strong>
                            <p>Menunggu pengesahan pegawai.</p>
                        </Link>
                        <Link className="app-action-link" to="/app/complaints/my-pic">
                            <strong>{metrics.my_pic ?? 0} aduan</strong>
                            <p>Dalam tindakan PIC anda.</p>
                        </Link>
                        <Link className="app-action-link" to="/app/complaints/pickup-queue">
                            <strong>Tugasan Menunggu Ambil</strong>
                            <p>Semak aduan yang perlu diambil oleh PIC.</p>
                        </Link>
                    </div>
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Status Kes Daerah</h4>
                        <span className="app-pill">{stageSummary.length} status</span>
                    </div>
                    <ul className="app-list app-list--compact">
                        {stageSummary.length === 0 ? (
                            <li>
                                <p className="app-muted mb-0">Tiada data status untuk daerah anda.</p>
                            </li>
                        ) : (
                            stageSummary.map((item) => (
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
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Aduan Terkini Daerah</h4>
                    <span className="app-pill">{recentComplaints.length} item</span>
                </div>
                <ul className="app-list">
                    {recentComplaints.length === 0 ? (
                        <li>
                            <p className="app-muted mb-0">Belum ada aduan terkini dalam skop daerah.</p>
                        </li>
                    ) : (
                        recentComplaints.map((item) => (
                            <li key={item.id}>
                                <div>
                                    <strong>{item.reference_no || `Aduan #${item.id}`}</strong>
                                    <p>{item.complaint_date || '-'} | {districtName}</p>
                                </div>
                                <span className="app-tag">{getComplaintStageLabel(item.current_stage, role)}</span>
                            </li>
                        ))
                    )}
                </ul>
            </div>
        </div>
    );
};

export default DashboardDaerah;
