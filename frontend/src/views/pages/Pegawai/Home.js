import React from 'react';

const Home = () => {
    return (
        <div className="pegawai-dashboard">
            <div className="pegawai-welcome">
                <div>
                    <h3>Selamat kembali</h3>
                    <p>Ringkasan operasi aduan untuk hari ini.</p>
                </div>
                <button className="pegawai-cta">Lihat Aduan Terbaru</button>
            </div>

            <div className="pegawai-metrics">
                <div className="pegawai-metric-card">
                    <span>Aduan Baharu</span>
                    <strong>24</strong>
                    <small>Sejak 24 jam</small>
                </div>
                <div className="pegawai-metric-card">
                    <span>Dalam Tindakan</span>
                    <strong>18</strong>
                    <small>Perlu tindakan</small>
                </div>
                <div className="pegawai-metric-card">
                    <span>Disahkan</span>
                    <strong>9</strong>
                    <small>Menunggu daerah</small>
                </div>
                <div className="pegawai-metric-card">
                    <span>Selesai</span>
                    <strong>36</strong>
                    <small>Minggu ini</small>
                </div>
            </div>

            <div className="pegawai-grid">
                <div className="pegawai-card">
                    <div className="pegawai-card-header">
                        <h4>Aduan Keutamaan</h4>
                        <span className="pegawai-pill">4 item</span>
                    </div>
                    <ul className="pegawai-list">
                        <li>
                            <div>
                                <strong>JAIS-2025-9AD3F2</strong>
                                <p>Kes melibatkan aduan awam di Petaling.</p>
                            </div>
                            <span className="pegawai-tag">Baharu</span>
                        </li>
                        <li>
                            <div>
                                <strong>JAIS-2025-7P9LAX</strong>
                                <p>Semakan semula diperlukan sebelum dihantar.</p>
                            </div>
                            <span className="pegawai-tag pending">Siasatan</span>
                        </li>
                        <li>
                            <div>
                                <strong>JAIS-2025-2K1HLM</strong>
                                <p>Menunggu kelulusan pegawai kedua.</p>
                            </div>
                            <span className="pegawai-tag info">Semakan</span>
                        </li>
                    </ul>
                </div>

                <div className="pegawai-card">
                    <div className="pegawai-card-header">
                        <h4>Notis Tindakan</h4>
                        <span className="pegawai-pill">Hari ini</span>
                    </div>
                    <div className="pegawai-actions">
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Home;
