import React, { useEffect, useState } from 'react';

const Dashboard = () => {
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => setIsLoading(false), 650);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div className="app-dashboard">
            <div className="app-welcome">
                <div>
                    {isLoading ? (
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--lg"></span>
                            <span className="app-skeleton-line app-skeleton-line--md"></span>
                        </div>
                    ) : (
                        <>
                            <h3>Selamat kembali</h3>
                            <p>Ringkasan operasi aduan untuk hari ini.</p>
                        </>
                    )}
                </div>
                {isLoading ? (
                    <span className="app-skeleton-pill"></span>
                ) : (
                    <button className="app-cta">Lihat Aduan Terbaru</button>
                )}
            </div>

            <div className="app-metrics">
                <div className="app-metric-card">
                    {isLoading ? (
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            <span className="app-skeleton-line app-skeleton-line--xl"></span>
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        </div>
                    ) : (
                        <>
                            <span>Aduan Baharu</span>
                            <strong>24</strong>
                            <small>Sejak 24 jam</small>
                        </>
                    )}
                </div>
                <div className="app-metric-card">
                    {isLoading ? (
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            <span className="app-skeleton-line app-skeleton-line--xl"></span>
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        </div>
                    ) : (
                        <>
                            <span>Dalam Tindakan</span>
                            <strong>18</strong>
                            <small>Perlu tindakan</small>
                        </>
                    )}
                </div>
                <div className="app-metric-card">
                    {isLoading ? (
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            <span className="app-skeleton-line app-skeleton-line--xl"></span>
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        </div>
                    ) : (
                        <>
                            <span>Disahkan</span>
                            <strong>9</strong>
                            <small>Menunggu daerah</small>
                        </>
                    )}
                </div>
                <div className="app-metric-card">
                    {isLoading ? (
                        <div className="app-skeleton-stack">
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            <span className="app-skeleton-line app-skeleton-line--xl"></span>
                            <span className="app-skeleton-line app-skeleton-line--sm"></span>
                        </div>
                    ) : (
                        <>
                            <span>Selesai</span>
                            <strong>36</strong>
                            <small>Minggu ini</small>
                        </>
                    )}
                </div>
            </div>

            <div className="app-grid">
                <div className="app-card">
                    <div className="app-card-header">
                        {isLoading ? (
                            <>
                                <span className="app-skeleton-line app-skeleton-line--md"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </>
                        ) : (
                            <>
                                <h4>Aduan Keutamaan</h4>
                                <span className="app-pill">4 item</span>
                            </>
                        )}
                    </div>
                    <ul className="app-list">
                        {isLoading ? (
                            Array.from({ length: 3 }, (_, index) => (
                                <li key={`priority-skeleton-${index}`}>
                                    <div className="app-skeleton-stack">
                                        <span className="app-skeleton-line app-skeleton-line--md"></span>
                                        <span className="app-skeleton-line"></span>
                                    </div>
                                    <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                </li>
                            ))
                        ) : (
                            <>
                                <li>
                                    <div>
                                        <strong>JAIS-2025-9AD3F2</strong>
                                        <p>Kes melibatkan aduan awam di Petaling.</p>
                                    </div>
                                    <span className="app-tag">Baharu</span>
                                </li>
                                <li>
                                    <div>
                                        <strong>JAIS-2025-7P9LAX</strong>
                                        <p>Semakan semula diperlukan sebelum dihantar.</p>
                                    </div>
                                    <span className="app-tag pending">Siasatan</span>
                                </li>
                                <li>
                                    <div>
                                        <strong>JAIS-2025-2K1HLM</strong>
                                        <p>Menunggu kelulusan pegawai kedua.</p>
                                    </div>
                                    <span className="app-tag info">Semakan</span>
                                </li>
                            </>
                        )}
                    </ul>
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        {isLoading ? (
                            <>
                                <span className="app-skeleton-line app-skeleton-line--md"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </>
                        ) : (
                            <>
                                <h4>Notis Tindakan</h4>
                                <span className="app-pill">Hari ini</span>
                            </>
                        )}
                    </div>
                    <div className="app-actions">
                        {isLoading ? (
                            Array.from({ length: 3 }, (_, index) => (
                                <div key={`notice-skeleton-${index}`} className="app-skeleton-stack">
                                    <span className="app-skeleton-line app-skeleton-line--md"></span>
                                    <span className="app-skeleton-line"></span>
                                </div>
                            ))
                        ) : (
                            <>
                                <div>
                                    <strong>12 aduan</strong>
                                    <p>Perlu ditugaskan kepada PIC daerah.</p>
                                </div>
                                <div>
                                    <strong>5 aduan</strong>
                                    <p>Menunggu pengesahan kedua.</p>
                                </div>
                                <div>
                                    <strong>3 aduan</strong>
                                    <p>Perlu kemaskini status KIV.</p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
