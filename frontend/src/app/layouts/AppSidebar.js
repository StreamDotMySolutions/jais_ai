import React from 'react';
import { Link } from 'react-router-dom';

const AppSidebar = ({ role }) => {
    const navItems = [
        { to: '/app/dashboard', label: 'Dashboard', icon: 'bi-grid' },
        { to: '/app/complaints', label: 'Senarai Aduan', icon: 'bi-clipboard-check' },
        { to: '/app/staff', label: 'Staff', icon: 'bi-people', roles: ['admin', 'system'] },
        { to: '/app/api-token', label: 'Api Token', icon: 'bi-key', roles: ['admin', 'user', 'system'] },
        { to: '/app/api-logs', label: 'Api Logs', icon: 'bi-activity', roles: ['admin', 'user', 'system'] },
        { to: '/app/users', label: 'Pengguna', icon: 'bi-people', roles: ['admin', 'system'] },
    ];

    const canView = (item) => {
        if (!item.roles) {
            return true;
        }
        return item.roles.includes(role);
    };

    return (
        <div className="app-sidebar">
            <div className="app-brand">
                <span className="app-brand-mark">JAIS</span>
                <span className="app-brand-sub">Aduan</span>
            </div>

            <nav className="app-nav">
                {navItems.filter(canView).map((item) => (
                    <Link key={item.to} to={item.to} className="app-nav-link">
                        <i className={`bi ${item.icon}`}></i>
                        {item.label}
                    </Link>
                ))}
            </nav>

            <div className="app-side-footer">
                <div className="app-status">
                    <span className="app-dot"></span>
                    Sistem Aktif
                </div>
                <a href="/" target="_blank" rel="noreferrer" className="app-exit">
                    <i className="bi bi-box-arrow-left"></i>
                    Laman Awam
                </a>
            </div>
        </div>
    );
};

export default AppSidebar;
