import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const AppSidebar = ({ role }) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [menus, setMenus] = useState([]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        const token = localStorage.getItem('token');
        axios.get(`${apiUrl}/menus/my`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setMenus(response?.data?.data || []);
            })
            .catch(() => {
                setMenus([]);
            });
    }, [apiUrl, role]);

    return (
        <div className="app-sidebar">
            <div className="app-brand">
                <span className="app-brand-mark">JAIS</span>
                <span className="app-brand-sub">Aduan</span>
            </div>

            <nav className="app-nav">
                {menus.map((item) => (
                    <Link key={item.id} to={item.path} className="app-nav-link">
                        <i className={`bi ${item.icon || 'bi-dot'}`}></i>
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
