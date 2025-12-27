import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';

const AppLayout = () => {
    const navigate = useNavigate();
    const role = localStorage.getItem('role') || 'awam';
    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/sign-in', { replace: true });
    };

    return (
        <div className="app-shell">
            <aside className="app-shell-sidebar">
                <AppSidebar role={role} />
            </aside>
            <div className="app-shell-main">
                <header className="app-topbar">
                    <div>
                        <div className="app-eyebrow">JAIS AI</div>
                        <h2 className="app-title">Portal Aduan</h2>
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
