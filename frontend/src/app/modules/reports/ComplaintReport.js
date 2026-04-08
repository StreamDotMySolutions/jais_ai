import React from 'react';
import { Link } from 'react-router-dom';

const REPORT_GROUPS = [
    {
        title: 'Tangkapan',
        description: 'Laporan operasi yang fokus pada hasil tindakan, tangkapan, penangkap, dan trend lapangan.',
        cards: [
            {
                title: 'Statistik Tangkapan Mengikut Daerah',
                description: 'Bandingkan jumlah tangkapan lelaki, perempuan, dan lain-lain mengikut daerah.',
                to: '/app/complaints/report/arrest-by-district',
            },
            {
                title: 'Rekod Tangkapan Mengikut Kesalahan',
                description: 'Lihat pecahan tangkapan mengikut jenis kesalahan untuk laporan operasi.',
                to: '/app/complaints/report/arrest-by-offense',
            },
            {
                title: 'Senarai Penangkap',
                description: 'Ringkasan jenis penangkap dan pegawai penangkap berdasarkan laporan pemeriksaan AJ.',
                to: '/app/complaints/report/arrestors',
            },
            {
                title: 'Jumlah Tangkapan',
                description: 'Lihat jumlah keseluruhan tangkapan AJ beserta trend dan pecahan daerah.',
                to: '/app/complaints/report/arrest-totals',
            },
        ],
    },
    {
        title: 'Siasatan',
        description: 'Laporan kemajuan siasatan dan pemantauan status IP.',
        cards: [
            {
                title: 'Statistik Status IP',
                description: 'Pantau bilangan rekod siasatan mengikut status IP semasa.',
                to: '/app/complaints/report/ip-status',
            },
        ],
    },
    {
        title: 'Tindakan',
        description: 'Laporan status semasa tindakan dan klasifikasi bagi laporan tindakan AJ.',
        cards: [
            {
                title: 'Statistik Status Tindakan',
                description: 'Lihat status tindakan AJ seperti selesai dengan kes, tanpa kes, KIV, dan NFA.',
                to: '/app/complaints/report/action-status',
            },
        ],
    },
    {
        title: 'KES / Pendakwaan',
        description: 'Laporan berkaitan rekod KES, status pendakwaan, mahkamah, dan susulan prosiding.',
        cards: [
            {
                title: 'Statistik KES & Pendakwaan',
                description: 'Ringkasan rekod KES, status pendakwaan, mahkamah, dan daerah bagi kes AJ.',
                to: '/app/complaints/report/case-prosecution',
            },
            {
                title: 'Statistik OYDS',
                description: 'Ringkasan OYDS mengikut daerah dan nama pegawai penyiasat yang direkodkan.',
                to: '/app/complaints/report/oyds',
            },
            {
                title: 'Statistik Barang Kes / Sitaan',
                description: 'Ringkasan barang kes yang direkodkan mengikut daerah dan stor simpanan.',
                to: '/app/complaints/report/seizure-items',
            },
            {
                title: 'Statistik Mahkamah & Pendakwa',
                description: 'Pecahan rekod mahkamah dan pendakwa yang telah direkodkan dalam pendakwaan AJ.',
                to: '/app/complaints/report/courts-prosecutors',
            },
        ],
    },
];

const TOTAL_REPORTS = REPORT_GROUPS.reduce((count, group) => count + group.cards.length, 0);

const ComplaintReport = () => (
    <div className="app-section">
        <div className="app-section-header">
            <div>
                <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                <h2>Dashboard Laporan Aduan</h2>
                <p>Pilih laporan khusus untuk melihat statistik atau analisis yang lebih terperinci.</p>
            </div>
        </div>

        <div className="app-report-dashboard-summary">
            <div className="app-report-dashboard-stat">
                <span className="app-report-dashboard-stat-label">Jumlah Report</span>
                <strong>{TOTAL_REPORTS}</strong>
                <small>Laporan khusus tersedia untuk semakan operasi.</small>
            </div>
            <div className="app-report-dashboard-stat">
                <span className="app-report-dashboard-stat-label">Kumpulan</span>
                <strong>{REPORT_GROUPS.length}</strong>
                <small>Tangkapan, siasatan, tindakan, dan KES / pendakwaan.</small>
            </div>
            <div className="app-report-dashboard-stat">
                <span className="app-report-dashboard-stat-label">Skop Semasa</span>
                <strong>AJ Fokus</strong>
                <small>Majoriti report semasa menggunakan data operasi AJ yang sudah diimport.</small>
            </div>
        </div>

        <div className="app-report-dashboard-nav">
            {REPORT_GROUPS.map((group) => (
                <a key={group.title} href={`#${group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}`} className="app-report-dashboard-nav-link">
                    <span>{group.title}</span>
                    <strong>{group.cards.length}</strong>
                </a>
            ))}
        </div>

        <div className="app-report-dashboard">
            {REPORT_GROUPS.map((group) => (
                <div
                    key={group.title}
                    id={group.title.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')}
                    className="app-report-dashboard-group"
                >
                    <div className="app-section-header">
                        <div>
                            <h4>{group.title}</h4>
                            <p className="app-muted" style={{ margin: '0.35rem 0 0' }}>{group.description}</p>
                        </div>
                        <span className="app-report-dashboard-group-badge">
                            {group.cards.length} report
                        </span>
                    </div>

                    <div className="app-report-dashboard-grid">
                        {group.cards.map((card) => (
                            <div key={card.title} className="app-report-card app-report-card-dashboard">
                                <div className="app-report-card-meta">Laporan Khusus</div>
                                <h4>{card.title}</h4>
                                <p className="app-muted" style={{ marginBottom: '1rem' }}>{card.description}</p>
                                {card.to ? (
                                    <Link className="app-button" to={card.to}>
                                        Buka Laporan
                                    </Link>
                                ) : (
                                    <button type="button" className="app-button app-button-ghost" disabled>
                                        Akan Datang
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </div>
);

export default ComplaintReport;
