import React, { useMemo, useState, useEffect, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';

const AppSidebar = ({
    menus = [],
    isLoading = false,
    isCollapsed = false,
    onToggleCollapse,
    userName = 'Pengguna',
    role = 'awam',
    onLogout,
}) => {
    const location = useLocation();
    const navigate = useNavigate();
    const skeletonItems = Array.from({ length: 6 }, (_, index) => index);
    const { roots, childrenMap } = useMemo(() => {
        const map = new Map();
        const rootItems = [];
        menus.forEach((menu) => {
            const parentId = menu.parent_id || null;
            if (!parentId) {
                rootItems.push(menu);
                return;
            }
            if (!map.has(parentId)) {
                map.set(parentId, []);
            }
            map.get(parentId).push(menu);
        });
        return { roots: rootItems, childrenMap: map };
    }, [menus]);
    const [openGroups, setOpenGroups] = useState({});
    const [userMenuOpen, setUserMenuOpen] = useState(false);
    const userMenuRef = useRef(null);

    useEffect(() => {
        const nextOpen = {};
        roots.forEach((menu) => {
            if (childrenMap.has(menu.id)) {
                const children = childrenMap.get(menu.id) || [];
                // Default collapsed, but auto-open the group if the current route is inside it.
                nextOpen[menu.id] = children.some((child) => (
                    child.path === location.pathname
                    || (child.path && location.pathname.startsWith(`${child.path}/`))
                ));
            }
        });
        setOpenGroups(nextOpen);
    }, [roots, childrenMap, location.pathname]);

    useEffect(() => {
        setUserMenuOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        if (!userMenuOpen) {
            return undefined;
        }

        const handlePointerDown = (event) => {
            if (!userMenuRef.current) {
                return;
            }
            if (!userMenuRef.current.contains(event.target)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
        };
    }, [userMenuOpen]);

    const toggleGroup = (menuId) => {
        setOpenGroups((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
    };

    const shouldShowVerificationNotification = (label) => {
        const text = (label || '').toString().toLowerCase();
        return text.includes('disahkan') || text.includes('pengesahan');
    };

    const parseLabelAndCount = (label) => {
        const raw = (label || '').toString();
        const match = raw.match(/^(.*?)(?:\s*\((\d+)\))\s*$/);
        if (!match) {
            return { text: raw, count: 0 };
        }
        return {
            text: (match[1] || '').trim(),
            count: Number(match[2] || 0),
        };
    };

    const renderMenuLabel = (label) => {
        const { text, count } = parseLabelAndCount(label);
        const shouldShowBadge = shouldShowVerificationNotification(label) && Number.isFinite(count) && count > 0;
        return (
            <>
                <span>{shouldShowBadge ? text : label}</span>
                {shouldShowBadge && (
                    <span className="app-nav-alert-badge" aria-label={`${count} aduan perlu disahkan`}>
                        {count}
                    </span>
                )}
            </>
        );
    };

    const handleOpenProfile = () => {
        setUserMenuOpen(false);
        navigate('/app/profile');
    };

    const handleOpenChangePassword = () => {
        setUserMenuOpen(false);
        navigate('/app/profile?changePassword=1');
    };

    const handleLogoutClick = () => {
        setUserMenuOpen(false);
        onLogout?.();
    };

    return (
        <div className="app-sidebar">
            <div className="app-brand">
                <div className="app-brand-text">
                    <span className="app-brand-mark">JAIS</span>
                    <span className="app-brand-sub">{isCollapsed ? '' : 'Aduan'}</span>
                </div>
                <button
                    className="app-collapse-toggle"
                    type="button"
                    onClick={onToggleCollapse}
                    aria-label="Toggle sidebar"
                >
                    <i className={`bi ${isCollapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`}></i>
                </button>
            </div>

            <nav className="app-nav">
                {isLoading && menus.length === 0 && skeletonItems.map((item) => (
                    <div key={`skeleton-${item}`} className="app-nav-link app-skeleton-row">
                        <span className="app-skeleton-circle"></span>
                        <span className="app-skeleton-line"></span>
                    </div>
                ))}
                {roots.map((item) => {
                    const children = childrenMap.get(item.id) || [];
                    if (children.length > 0) {
                        const isOpen = openGroups[item.id];
                        return (
                            <div key={item.id} className="app-nav-group">
                                <button
                                    type="button"
                                    className="app-nav-group-header"
                                    onClick={() => toggleGroup(item.id)}
                                    title={item.label}
                                >
                                    <i className={`bi ${item.icon || 'bi-dot'}`}></i>
                                    <span className="app-nav-label">{renderMenuLabel(item.label)}</span>
                                    <i className={`bi app-nav-caret ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </button>
                                {isOpen && (
                                    <div className="app-nav-group-items">
                                        {children.map((child) => (
                                            <NavLink
                                                key={child.id}
                                                to={child.path}
                                                end
                                                className={({ isActive }) => (
                                                    `app-nav-link app-nav-link-sub${isActive ? ' is-active' : ''}`
                                                )}
                                                title={child.label}
                                            >
                                                <i className={`bi ${child.icon || 'bi-dot'}`}></i>
                                                <span className="app-nav-label">{renderMenuLabel(child.label)}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <NavLink
                            key={item.id}
                            to={item.path}
                            end
                            className={({ isActive }) => (
                                `app-nav-link${isActive ? ' is-active' : ''}`
                            )}
                            title={item.label}
                        >
                            <i className={`bi ${item.icon || 'bi-dot'}`}></i>
                            <span className="app-nav-label">{renderMenuLabel(item.label)}</span>
                        </NavLink>
                    );
                })}
            </nav>

            <div className="app-side-footer">
                <div className="app-side-user-wrap" ref={userMenuRef}>
                <div className="app-side-user">
                    <span className="app-side-user-icon">
                        <i className="bi bi-person-circle"></i>
                    </span>
                    <div className="app-side-user-meta">
                        <div className="app-side-user-name">{userName}</div>
                        <div className="app-side-user-role">{role}</div>
                    </div>
                    <button
                        type="button"
                        className="app-side-logout"
                        onClick={() => setUserMenuOpen((prev) => !prev)}
                        title="Menu Akaun"
                        aria-label="Menu Akaun"
                        aria-expanded={userMenuOpen}
                    >
                        <i className="bi bi-three-dots-vertical"></i>
                    </button>
                </div>
                {userMenuOpen && (
                    <div className="app-side-user-menu" role="menu" aria-label="Menu Akaun">
                        <button type="button" className="app-side-user-menu-item" onClick={handleOpenProfile}>
                            <i className="bi bi-person"></i>
                            <span>Profil Saya</span>
                        </button>
                        <button type="button" className="app-side-user-menu-item" onClick={handleOpenChangePassword}>
                            <i className="bi bi-key"></i>
                            <span>Tukar Kata Laluan</span>
                        </button>
                        <button type="button" className="app-side-user-menu-item is-danger" onClick={handleLogoutClick}>
                            <i className="bi bi-box-arrow-right"></i>
                            <span>Log Keluar</span>
                        </button>
                    </div>
                )}
                </div>
                <div className="app-status">
                    <span className="app-dot"></span>
                    <span className="app-nav-label">Sistem Aktif</span>
                </div>
                <a href="/" target="_blank" rel="noreferrer" className="app-exit">
                    <i className="bi bi-box-arrow-left"></i>
                    <span className="app-nav-label">Laman Awam</span>
                </a>
            </div>
        </div>
    );
};

export default AppSidebar;
