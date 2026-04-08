import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import axios from 'axios';

const AppLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const apiUrl = process.env.REACT_APP_API_URL;
    const role = localStorage.getItem('role') || 'awam';
    const userName = localStorage.getItem('user_name') || 'Pengguna';
    const [menus, setMenus] = useState([]);
    const [menuLoaded, setMenuLoaded] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const filterRetiredMenus = (menuItems) => {
        if (!Array.isArray(menuItems)) {
            return [];
        }
        return menuItems.filter((menu) => (menu?.path || '') !== '/app/case');
    };

    const attachPendingApprovalCount = (menuItems, pendingCount) => {
        if (!Array.isArray(menuItems)) {
            return [];
        }
        return menuItems.map((menu) => {
            if ((menu?.path || '') !== '/app/complaints/pending-approval') {
                return menu;
            }
            const baseLabel = String(menu.label || '').replace(/\s*\(\d+\)\s*$/, '').trim() || 'Aduan Untuk Disahkan';
            if (!pendingCount || pendingCount <= 0) {
                return { ...menu, label: baseLabel };
            }
            return { ...menu, label: `${baseLabel} (${pendingCount})` };
        });
    };

    const loadMenus = () => {
        if (!apiUrl) {
            setMenuLoaded(true);
            return;
        }
        const token = localStorage.getItem('token');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        Promise.all([
            axios.get(`${apiUrl}/menus/my`, { headers }),
            axios.get(`${apiUrl}/complaints/pending-approval`, {
                headers,
                params: { per_page: 1 },
            }).catch(() => ({ data: { meta: { total: 0 } } })),
        ])
            .then(([menusResponse, pendingResponse]) => {
                const menuItems = filterRetiredMenus(menusResponse?.data?.data || []);
                const pendingCount = Number(pendingResponse?.data?.meta?.total || 0);
                setMenus(attachPendingApprovalCount(menuItems, pendingCount));
            })
            .catch(() => {
                setMenus([]);
            })
            .finally(() => {
                setMenuLoaded(true);
            });
    };

    useEffect(() => {
        loadMenus();
    }, [apiUrl]);

    useEffect(() => {
        const handleMenuUpdate = () => loadMenus();
        window.addEventListener('menus:updated', handleMenuUpdate);
        return () => window.removeEventListener('menus:updated', handleMenuUpdate);
    }, [apiUrl]);

    useEffect(() => {
        if (!menuLoaded || menus.length === 0) {
            return;
        }
        const currentPath = location.pathname;
        const bypassPaths = ['/app/appointments'];
        if (bypassPaths.some((path) => currentPath === path || currentPath.startsWith(`${path}/`))) {
            return;
        }
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
        <div className={`app-shell ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
            <aside className={`app-shell-sidebar ${sidebarOpen ? 'is-open' : ''} ${sidebarCollapsed ? 'is-collapsed' : ''}`}>
                <AppSidebar
                    role={role}
                    userName={userName}
                    menus={menus}
                    isLoading={!menuLoaded}
                    isCollapsed={sidebarCollapsed}
                    onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
                    onLogout={handleLogout}
                />
            </aside>
            {sidebarOpen && <button className="app-sidebar-backdrop" type="button" onClick={() => setSidebarOpen(false)}></button>}
            <div className="app-shell-main">
                <header className="app-topbar">
                    <div>
                        <div className="app-topbar-controls">
                            <button className="app-menu-toggle" type="button" onClick={() => setSidebarOpen((prev) => !prev)}>
                                <i className="bi bi-list"></i>
                            </button>
                        </div>
                        {!menuLoaded && (
                            <div className="app-title-skeleton">
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--lg"></span>
                            </div>
                        )}
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
