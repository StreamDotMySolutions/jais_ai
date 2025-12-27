import React from 'react';
import { Link } from 'react-router-dom';

const SideBar = () => {
    return (
        <div className="pegawai-side-inner">
            <div className="pegawai-brand">
                <span className="pegawai-logo">JAIS</span>
                <span className="pegawai-brand-sub">Aduan</span>
            </div>

            <nav className="pegawai-nav">
                <Link to="/pegawai/home" className="pegawai-nav-link">
                    <i className="bi bi-grid"></i>
                    Dashboard
                </Link>
                <Link to="/pegawai/complaints" className="pegawai-nav-link">
                    <i className="bi bi-clipboard-check"></i>
                    Aduan
                </Link>
            </nav>

            <div className="pegawai-side-footer">
                <div className="pegawai-status">
                    <span className="pegawai-dot"></span>
                    Sistem Aktif
                </div>
                <Link to="/" className="pegawai-exit">
                    <i className="bi bi-box-arrow-left"></i>
                    Laman Awam
                </Link>
            </div>
        </div>
    );
};

export default SideBar;
