import React, { useMemo, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const AppSidebar = ({ menus = [], isLoading = false, isCollapsed = false, onToggleCollapse }) => {
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

    useEffect(() => {
        const nextOpen = {};
        roots.forEach((menu) => {
            if (childrenMap.has(menu.id)) {
                nextOpen[menu.id] = true;
            }
        });
        setOpenGroups(nextOpen);
    }, [roots, childrenMap]);

    const toggleGroup = (menuId) => {
        setOpenGroups((prev) => ({ ...prev, [menuId]: !prev[menuId] }));
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
                                    <span className="app-nav-label">{item.label}</span>
                                    <i className={`bi app-nav-caret ${isOpen ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                                </button>
                                {isOpen && (
                                    <div className="app-nav-group-items">
                                        {children.map((child) => (
                                            <Link
                                                key={child.id}
                                                to={child.path}
                                                className="app-nav-link app-nav-link-sub"
                                                title={child.label}
                                            >
                                                <i className={`bi ${child.icon || 'bi-dot'}`}></i>
                                                <span className="app-nav-label">{child.label}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    }
                    return (
                        <Link key={item.id} to={item.path} className="app-nav-link" title={item.label}>
                            <i className={`bi ${item.icon || 'bi-dot'}`}></i>
                            <span className="app-nav-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <div className="app-side-footer">
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
