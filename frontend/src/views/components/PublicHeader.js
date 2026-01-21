import React from "react";
import { Link } from "react-router-dom";

const PublicHeader = () => {
    return (
        <header className="public-header">
            <div className="container d-flex justify-content-between align-items-center">
                <div className="public-brand">
                    Selamat Datang ke Portal Rasmi Bahagian Penguatkuasaan JAIS
                </div>
                <nav className="public-nav">
                    <Link to="/" className="public-link">
                        Utama
                    </Link>
                    <Link to="/about-us" className="public-link">
                        Mengenai Kami
                    </Link>
                    <Link to="/complaint" className="public-link">
                        Aduan Online
                    </Link>
                    <Link to="/semak-status" className="public-link">
                        Semak Status
                    </Link>
                    <Link to="/contact-us" className="public-link">
                        Hubungi Kami
                    </Link>
                    <Link to="/sign-in" className="public-link public-link-solid">
                        Log Masuk
                    </Link>
                    <Link to="/register" className="public-link public-link-outline">
                        Daftar
                    </Link>
                </nav>
            </div>
        </header>
    );
};

export default PublicHeader;
