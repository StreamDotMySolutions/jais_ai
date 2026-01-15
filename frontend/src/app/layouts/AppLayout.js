import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import axios from 'axios';

const AppLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const apiUrl = process.env.REACT_APP_API_URL;
    const role = localStorage.getItem('role') || 'awam';
    const [menus, setMenus] = useState([]);
    const [menuLoaded, setMenuLoaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        if (!apiUrl) {
            setMenuLoaded(true);
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
            })
            .finally(() => {
                setMenuLoaded(true);
            });
    }, [apiUrl]);

    useEffect(() => {
        if (!menuLoaded || menus.length === 0) {
            return;
        }
        const currentPath = location.pathname;
        const canAccess = menus.some((menu) => (
            currentPath === menu.path || currentPath.startsWith(`${menu.path}/`)
        ));
        if (!canAccess) {
            navigate('/app/dashboard', { replace: true });
        }
    }, [location.pathname, menuLoaded, menus, navigate]);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/sign-in', { replace: true });
    };

    return (
        <div className="app-shell">
            <aside className={`app-shell-sidebar ${sidebarOpen ? 'is-open' : ''}`}>
                <AppSidebar role={role} menus={menus} isLoading={!menuLoaded} />
            </aside>
            {sidebarOpen && <button className="app-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)}></button>}
            <div className="app-shell-main">
                <header className="app-topbar">
                    <div>
                        <button className="app-menu-toggle" type="button" onClick={() => setSidebarOpen((prev) => !prev)}>
                            <i className="bi bi-list"></i>
                        </button>
                        {menuLoaded ? (
                            <>
                                <div className="app-eyebrow">JAIS AI</div>
                                <h2 className="app-title">Portal Aduan</h2>
                            </>
                        ) : (
                            <div className="app-title-skeleton">
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--lg"></span>
                            </div>
                        )}
                    </div>
                    <div className="app-user">
                        <span className="app-user-icon"><i className="bi bi-person-circle"></i></span>
                        <div>
                            <div className="app-user-name">{localStorage.getItem('user_name') || 'Pengguna'}</div>
                            <div className="app-user-role">{role}</div>
                        </div>
                        <button className="app-logout" type="button" onClick={handleLogout}>
                            Log Keluar
                        </button>
                    </div>
                </header>
                <main className="app-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AppLayout;
