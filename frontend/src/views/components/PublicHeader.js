import React, { useState } from "react";
import { Link, NavLink } from "react-router-dom";

const PublicHeader = () => {
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <header className="public-header">
            <div className="container public-header-inner">
                <div className="public-brand-row">
                    <div className="public-brand">
                        Selamat Datang ke Portal Aduan Penguatkuasaan - Hotline JAIS
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
                    <NavLink to="/" end className="public-link" onClick={() => setMenuOpen(false)}>
                        Utama
                    </NavLink>
                    <NavLink to="/about-us" className="public-link" onClick={() => setMenuOpen(false)}>
                        Mengenai Kami
                    </NavLink>
                    <NavLink to="/complaint" className="public-link" onClick={() => setMenuOpen(false)}>
                        Aduan Online
                    </NavLink>
                    <NavLink to="/semak-status" className="public-link" onClick={() => setMenuOpen(false)}>
                        Semak Status
                    </NavLink>
                    <NavLink to="/contact-us" className="public-link" onClick={() => setMenuOpen(false)}>
                        Hubungi Kami
                    </NavLink>
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
