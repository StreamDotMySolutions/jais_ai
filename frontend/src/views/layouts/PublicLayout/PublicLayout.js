import React from 'react';
import { Link, Outlet } from 'react-router-dom';

const PublicLayout = () => {
    return (
        <div className="public-layout">
            <header className="public-header">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <div className="public-brand">UDPS AI - Aduan JAIS</div>
                    <nav className="public-nav">
                        <Link to="/" className="public-link">Utama</Link>
                        <Link to="/about-us" className="public-link">Mengenai Kami</Link>
                        <Link to="/complaint" className="public-link">Aduan Online</Link>
                        <Link to="/semak-status" className="public-link">Semak Status</Link>
                        <Link to="/contact-us" className="public-link">Hubungi Kami</Link>
                        <Link to="/sign-in" className="public-link public-link-solid">Log Masuk</Link>
                        <Link to="/register" className="public-link public-link-outline">Daftar</Link>
                    </nav>
                </div>
            </header>

            <main className="public-content">
                <Outlet />
            </main>

            <footer className="public-footer">
                <div className="container-fluid d-flex justify-content-between align-items-center">
                    <div>© 2025 UDPS AI - Sistem Aduan JAIS</div>
                    <div>Polisi Privasi · Terma</div>
                </div>
            </footer>
        </div>
    );
};

export default PublicLayout;
