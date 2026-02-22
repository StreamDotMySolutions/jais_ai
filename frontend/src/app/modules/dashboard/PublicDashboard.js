import React from 'react';
import { Link } from 'react-router-dom';

const PublicDashboard = () => {
    return (
        <div className="app-dashboard">
            <div className="app-welcome">
                <div>
                    <h3>Dashboard Pengadu</h3>
                    <p>Semak status aduan anda atau hantar aduan baharu.</p>
                </div>
                <Link to="/complaint" className="app-cta">
                    Hantar Aduan Baharu
                </Link>
            </div>

            <div className="app-grid">
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Aduan Saya</h4>
                    </div>
                    <p className="app-muted">
                        Lihat senarai aduan yang anda hantar, termasuk status terkini dan no rujukan.
                    </p>
                    <div className="app-actions">
                        <Link className="app-action-link" to="/app/complaints">
                            <strong>Buka Senarai Aduan</strong>
                            <p>Papar semua aduan milik anda.</p>
                        </Link>
                    </div>
                </div>

                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Semakan Status</h4>
                    </div>
                    <p className="app-muted">
                        Semak status dengan no aduan jika anda mahu semakan pantas dari portal awam.
                    </p>
                    <div className="app-actions">
                        <Link className="app-action-link" to="/semak-status">
                            <strong>Semak Status Aduan</strong>
                            <p>Gunakan no aduan untuk semakan.</p>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicDashboard;
