import React, { useMemo, useState } from 'react';

const ReportDashboard = () => {
    const tabs = useMemo(
        () => [
            {
                key: 'aduan',
                label: 'Laporan Aduan',
                description: 'Ringkasan laporan aduan mengikut tarikh, status, dan daerah.',
            },
            {
                key: 'temujanji',
                label: 'Laporan Temujanji',
                description: 'Ringkasan temujanji siasatan mengikut tarikh dan pegawai.',
            },
            {
                key: 'beredar',
                label: 'Laporan Arahan Beredar',
                description: 'Ringkasan rekod arahan beredar untuk pemantauan dalaman.',
            },
        ],
        []
    );

    const [activeTab, setActiveTab] = useState(tabs[0].key);
    const activeConfig = tabs.find((tab) => tab.key === activeTab) || tabs[0];

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>Laporan</h2>
                    <p>Pilih laporan yang ingin dijana atau disemak.</p>
                </div>
            </div>

            <div className="app-card">
                <div className="app-stepper">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            type="button"
                            className={`app-step${activeTab === tab.key ? ' active' : ''}`}
                            onClick={() => setActiveTab(tab.key)}
                        >
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>

                <div className="app-tab-panel">
                    <h3>{activeConfig.label}</h3>
                    <p className="app-muted">{activeConfig.description}</p>
                    <div className="app-placeholder-card">
                        <p>Seksyen ini akan ditambah seterusnya.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportDashboard;
