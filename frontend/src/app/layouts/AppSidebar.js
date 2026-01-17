import React from 'react';
import { Link } from 'react-router-dom';

const AppSidebar = ({ menus = [], isLoading = false, isCollapsed = false }) => {
    const skeletonItems = Array.from({ length: 6 }, (_, index) => index);
    return (
        <div className="app-sidebar">
            <div className="app-brand">
                <span className="app-brand-mark">JAIS</span>
                <span className="app-brand-sub">{isCollapsed ? '' : 'Aduan'}</span>
            </div>

            <nav className="app-nav">
                {isLoading && menus.length === 0 && skeletonItems.map((item) => (
                    <div key={`skeleton-${item}`} className="app-nav-link app-skeleton-row">
                        <span className="app-skeleton-circle"></span>
                        <span className="app-skeleton-line"></span>
                    </div>
                ))}
                {menus.map((item) => (
                    <Link key={item.id} to={item.path} className="app-nav-link" title={item.label}>
                        <i className={`bi ${item.icon || 'bi-dot'}`}></i>
                        <span className="app-nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="app-side-footer">
                <div className="app-status">
                    <span className="app-dot"></span>
                    <span className="app-nav-label">Sistem Aktif</span>
                </div>
                <a href="/" target="_blank" rel="noreferrer" className="app-exit">
                    <i className="bi bi-box-arrow-left"></i>
                    <span className="app-nav-label">Laman Awam</span>
                </a>
            </div>
        </div>
    );
};

export default AppSidebar;
