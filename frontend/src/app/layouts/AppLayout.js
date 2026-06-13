import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppSidebar from './AppSidebar';
import axios from 'axios';

const AppLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const apiUrl = process.env.REACT_APP_API_URL;
    const normalizeRole = (value) => {
        const text = (value || '').toString().trim().toLowerCase();
        if (!text || text === 'null' || text === 'undefined') {
            return 'awam';
        }
        return text;
    };
    const role = normalizeRole(localStorage.getItem('role'));
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

    const normalizeFirMenu = (menuItems) => {
        if (!Array.isArray(menuItems)) {
            return [];
        }

        return menuItems.map((menu) => {
            if ((menu?.path || '') !== '/app/aduan') {
                return menu;
            }
            return {
                ...menu,
                label: 'FIR',
                icon: menu.icon || 'bi-file-earmark-text',
            };
        });
    };

    const ensureCasesMenu = (menuItems) => {
        if (!Array.isArray(menuItems) || menuItems.length === 0) {
            return [];
        }

        const placeCasesAfterJanaTindakan = (items) => {
            const casesIndex = items.findIndex((menu) => (menu?.path || '') === '/app/cases');
            const janaTindakanIndex = items.findIndex((menu) => (menu?.path || '') === '/app/jana-tindakan-aduan');
            if (casesIndex < 0 || janaTindakanIndex < 0 || casesIndex === janaTindakanIndex + 1) {
                return items;
            }

            const nextItems = [...items];
            const [casesMenu] = nextItems.splice(casesIndex, 1);
            const nextJanaTindakanIndex = nextItems.findIndex((menu) => (menu?.path || '') === '/app/jana-tindakan-aduan');
            nextItems.splice(nextJanaTindakanIndex + 1, 0, casesMenu);
            return nextItems;
        };

        const hasCasesMenu = menuItems.some((menu) => (menu?.path || '') === '/app/cases');
        if (hasCasesMenu) {
            return placeCasesAfterJanaTindakan(menuItems);
        }

        const firRootMenu = menuItems.find((menu) => (menu?.path || '') === '/app/aduan');
        const complaintsMenu = menuItems.find((menu) => (menu?.path || '') === '/app/complaints');
        if (!firRootMenu && !complaintsMenu) {
            return menuItems;
        }

        const injectedMenu = {
            id: 'virtual-cases-menu',
            parent_id: null,
            label: 'KES',
            path: '/app/cases',
            icon: 'bi-folder2-open',
            sort_order: Number(firRootMenu?.sort_order || complaintsMenu?.sort_order || 0) + 1,
            is_active: 1,
        };

        const insertAfterPath = firRootMenu ? '/app/aduan' : '/app/complaints';
        const insertIndex = menuItems.findIndex((menu) => (menu?.path || '') === insertAfterPath);
        if (insertIndex < 0) {
            return [...menuItems, injectedMenu];
        }

        const nextMenus = [...menuItems];
        nextMenus.splice(insertIndex + 1, 0, injectedMenu);
        return placeCasesAfterJanaTindakan(nextMenus);
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
                const withPendingBadge = attachPendingApprovalCount(menuItems, pendingCount);
                const withFirMenu = normalizeFirMenu(withPendingBadge);
                setMenus(ensureCasesMenu(withFirMenu));
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
        const bypassPaths = ['/app/appointments', '/app/profile'];
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
        localStorage.removeItem('user_name');
        localStorage.removeItem('district_name');
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
