import React, { useState } from "react";
import { Link } from "react-router-dom";

const PublicHeader = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="public-header">
            <div className="container public-header-inner">
                <div className="public-brand-row">
                    <div className="public-brand">
                        Selamat Datang ke Portal Rasmi Bahagian Penguatkuasaan JAIS
                    </div>
                    <button
                        type="button"
                        className="public-menu-toggle"
                        aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
                        aria-expanded={menuOpen ? "true" : "false"}
                        onClick={() => setMenuOpen((prev) => !prev)}
                    >
                        <i className={`bi ${menuOpen ? "bi-x-lg" : "bi-list"}`}></i>
                    </button>
                </div>
                <nav className={`public-nav${menuOpen ? " is-open" : ""}`}>
                    <Link to="/" className="public-link" onClick={() => setMenuOpen(false)}>
                        Utama
                    </Link>
                    <Link to="/about-us" className="public-link" onClick={() => setMenuOpen(false)}>
                        Mengenai Kami
                    </Link>
                    <Link to="/complaint" className="public-link" onClick={() => setMenuOpen(false)}>
                        Aduan Online
                    </Link>
                    <Link to="/semak-status" className="public-link" onClick={() => setMenuOpen(false)}>
                        Semak Status
                    </Link>
                    <Link to="/contact-us" className="public-link" onClick={() => setMenuOpen(false)}>
                        Hubungi Kami
                    </Link>
                    <Link to="/sign-in" className="public-link public-link-solid" onClick={() => setMenuOpen(false)}>
                        Log Masuk
                    </Link>
                    <Link to="/register" className="public-link public-link-outline" onClick={() => setMenuOpen(false)}>
                        Daftar
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default PublicHeader;
