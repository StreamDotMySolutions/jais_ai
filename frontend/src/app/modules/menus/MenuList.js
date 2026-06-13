import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import ConfirmModal from '../../components/SharedConfirmModal';

const MENU_COLLAPSE_STORAGE_KEY = 'app.menus.collapsed';

const emptyForm = {
    label: '',
    path: '',
    icon: '',
    sort_order: 0,
    is_active: true,
    parent_id: '',
    role_ids: [],
};

const sortMenuNodes = (items = []) => [...items].sort((a, b) => {
    const sortDiff = Number(a.sort_order || 0) - Number(b.sort_order || 0);
    if (sortDiff !== 0) {
        return sortDiff;
    }

    return String(a.label || '').localeCompare(String(b.label || ''));
});

const buildMenuTree = (menus = []) => {
    const nodes = new Map();

    menus.forEach((item) => {
        nodes.set(item.id, { ...item, children: [] });
    });

    const roots = [];

    nodes.forEach((node) => {
        if (node.parent_id && nodes.has(node.parent_id)) {
            nodes.get(node.parent_id).children.push(node);
            return;
        }

        roots.push(node);
    });

    const sortBranch = (branch) => {
        const sorted = sortMenuNodes(branch);
        sorted.forEach((node) => {
            node.children = sortBranch(node.children);
        });
        return sorted;
    };

    return sortBranch(roots);
};

const pruneMenuTree = (nodes, visibleIds) => nodes
    .map((node) => {
        const children = pruneMenuTree(node.children || [], visibleIds);
        if (visibleIds.has(node.id) || children.length > 0) {
            return { ...node, children };
        }
        return null;
    })
    .filter(Boolean);

const collectSubtreeIds = (node) => {
    let subtreeIds = [node.id];
    (node.children || []).forEach((child) => {
        subtreeIds = subtreeIds.concat(collectSubtreeIds(child));
    });
    return subtreeIds;
};

const flattenMenuTree = (nodes, options = {}) => {
    const {
        level = 0,
        parentLabel = '-',
        collapsedIds = new Set(),
    } = options;
    const rows = [];

    const visit = (node, depth, inheritedParentLabel) => {
        const subtreeIds = collectSubtreeIds(node);
        const isCollapsed = collapsedIds.has(node.id);

        rows.push({
            ...node,
            level: depth,
            parentLabel: inheritedParentLabel,
            hasChildren: (node.children || []).length > 0,
            isCollapsed,
            subtreeIds,
        });

        return subtreeIds;
    };

    const walk = (node, depth, inheritedParentLabel) => {
        visit(node, depth, inheritedParentLabel);

        if (collapsedIds.has(node.id)) {
            return;
        }

        (node.children || []).forEach((child) => {
            walk(child, depth + 1, node.label || '-');
        });
    };

    nodes.forEach((node) => walk(node, level, parentLabel));
    return rows;
};

const MenuList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [menus, setMenus] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [draggingId, setDraggingId] = useState(null);
    const [dropRootActive, setDropRootActive] = useState(false);
    const [isReordering, setIsReordering] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkRoles, setBulkRoles] = useState([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [collapsedMenuIds, setCollapsedMenuIds] = useState(() => {
        try {
            const saved = window.localStorage.getItem(MENU_COLLAPSE_STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    });
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [reorderConfirm, setReorderConfirm] = useState(null);

    const authHeaders = useMemo(
        () => (token ? { Authorization: `Bearer ${token}` } : undefined),
        [token]
    );

    const loadMenus = useCallback(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/menus`, {
            headers: authHeaders,
            params: { per_page: 500 },
        })
            .then((response) => {
                const nextMenus = response?.data?.data || [];
                setMenus(nextMenus);
                setSelectedIds([]);
                setCollapsedMenuIds((prev) => prev.filter((id) => nextMenus.some((menu) => menu.id === id)));
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan menu.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, authHeaders]);

    useEffect(() => {
        loadMenus();
    }, [loadMenus]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }

        axios.get(`${apiUrl}/roles`, { headers: authHeaders })
            .then((response) => {
                setRoles(response?.data?.data || []);
            })
            .catch(() => {});
    }, [apiUrl, authHeaders]);

    useEffect(() => {
        try {
            window.localStorage.setItem(MENU_COLLAPSE_STORAGE_KEY, JSON.stringify(collapsedMenuIds));
        } catch (error) {}
    }, [collapsedMenuIds]);

    const menuTreeRows = useMemo(() => {
        const fullTree = buildMenuTree(menus);
        const keywordText = keyword.trim().toLowerCase();
        const collapsedIds = new Set(collapsedMenuIds);

        if (!keywordText) {
            return flattenMenuTree(fullTree, { collapsedIds });
        }

        const menuMap = new Map(menus.map((item) => [item.id, item]));
        const visibleIds = new Set();

        menus.forEach((item) => {
            const parentLabel = item.parent_id && menuMap.has(item.parent_id)
                ? (menuMap.get(item.parent_id)?.label || '')
                : '';

            const searchable = [
                item.label,
                item.path,
                item.icon,
                parentLabel,
            ].join(' ').toLowerCase();

            if (!searchable.includes(keywordText)) {
                return;
            }

            let current = item;
            while (current) {
                visibleIds.add(current.id);
                current = current.parent_id ? menuMap.get(current.parent_id) : null;
            }
        });

        return flattenMenuTree(pruneMenuTree(fullTree, visibleIds));
    }, [menus, keyword, collapsedMenuIds]);

    const menuOptions = useMemo(
        () => flattenMenuTree(buildMenuTree(menus)).map((item) => ({
            id: item.id,
            label: `${item.level > 0 ? `${'-- '.repeat(item.level)}` : ''}${item.label}`,
        })),
        [menus]
    );

    const totalRows = menuTreeRows.length;
    const lastPage = Math.max(1, Math.ceil(totalRows / perPage));

    useEffect(() => {
        if (page > lastPage) {
            setPage(lastPage);
        }
    }, [page, lastPage]);

    const displayMenus = useMemo(() => {
        const startIndex = (page - 1) * perPage;
        return menuTreeRows.slice(startIndex, startIndex + perPage);
    }, [menuTreeRows, page, perPage]);

    const canReorder = !keyword && totalRows > 0;
    const parentMenuIds = useMemo(
        () => Array.from(new Set(
            menus
                .filter((menu) => menus.some((candidate) => Number(candidate.parent_id) === Number(menu.id)))
                .map((menu) => menu.id)
        )),
        [menus]
    );
    const hasCollapsedMenus = collapsedMenuIds.length > 0;

    const toggleCollapsed = (menuId) => {
        setCollapsedMenuIds((prev) => {
            const next = new Set(prev);
            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
            }
            return Array.from(next);
        });
    };

    const expandAllMenus = () => {
        setCollapsedMenuIds([]);
    };

    const collapseAllMenus = () => {
        setCollapsedMenuIds(parentMenuIds);
    };

    useEffect(() => {
        setCollapsedMenuIds((prev) => prev.filter((id) => parentMenuIds.includes(id)));
    }, [parentMenuIds]);

    const openCreate = () => {
        setEditing(null);
        setForm(emptyForm);
        setError('');
        setShowModal(true);
    };

    const openEdit = (menu) => {
        setEditing(menu);
        setForm({
            label: menu.label || '',
            path: menu.path || '',
            icon: menu.icon || '',
            sort_order: menu.sort_order || 0,
            is_active: menu.is_active,
            parent_id: menu.parent_id ? String(menu.parent_id) : '',
            role_ids: menu.roles?.map((role) => role.id) || [],
        });
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setForm(emptyForm);
        setError('');
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const toggleRole = (roleId) => {
        setForm((prev) => {
            const next = new Set(prev.role_ids);
            if (next.has(roleId)) {
                next.delete(roleId);
            } else {
                next.add(roleId);
            }

            return { ...prev, role_ids: Array.from(next) };
        });
    };

    const saveMenu = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }

        setError('');

        const payload = {
            ...form,
            parent_id: form.parent_id ? Number(form.parent_id) : null,
        };

        const request = editing
            ? axios.put(`${apiUrl}/menus/${editing.id}`, payload, { headers: authHeaders })
            : axios.post(`${apiUrl}/menus`, payload, { headers: authHeaders });

        request
            .then(() => {
                closeModal();
                loadMenus();
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal simpan menu.');
            });
    };

    const openBulk = () => {
        if (selectedIds.length === 0) {
            setError('Sila pilih sekurang-kurangnya satu menu.');
            return;
        }

        setBulkRoles([]);
        setShowBulk(true);
    };

    const closeBulk = () => {
        setShowBulk(false);
        setBulkRoles([]);
    };

    const toggleBulkRole = (roleId) => {
        setBulkRoles((prev) => {
            const next = new Set(prev);
            if (next.has(roleId)) {
                next.delete(roleId);
            } else {
                next.add(roleId);
            }

            return Array.from(next);
        });
    };

    const applyBulkRoles = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }

        setError('');

        axios.post(`${apiUrl}/menus/bulk-roles`, {
            menu_ids: selectedIds,
            role_ids: bulkRoles,
        }, { headers: authHeaders })
            .then(() => {
                closeBulk();
                setSelectedIds([]);
                loadMenus();
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal apply role secara pukal.');
            });
    };

    const saveOrder = (nextMenus) => {
        if (!apiUrl) {
            return;
        }

        setIsReordering(true);
        axios.post(`${apiUrl}/menus/reorder`, {
            items: nextMenus.map((menu, index) => ({
                id: menu.id,
                parent_id: menu.parent_id || null,
                sort_order: index + 1,
            })),
        }, { headers: authHeaders })
            .then(() => {
                setMenus(nextMenus);
                setError('');
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal kemaskini susunan.');
                loadMenus();
            })
            .finally(() => {
                setIsReordering(false);
                setDraggingId(null);
                setDropRootActive(false);
            });
    };

    const inferParentIdAfterDrop = (rows, insertIndex, movedRootId) => {
        const previousRow = rows[insertIndex - 1] || null;
        if (!previousRow) {
            return null;
        }

        if (Array.isArray(previousRow.subtreeIds) && previousRow.subtreeIds.includes(movedRootId)) {
            return previousRow.parent_id || null;
        }

        if (previousRow.level === 0) {
            return previousRow.id;
        }

        return previousRow.parent_id || null;
    };

    const buildReorderedMenuList = (nextRows, movedRootId, nextParentId) => {
        const nextMenuMap = new Map(menus.map((menu) => [menu.id, { ...menu }]));
        const movedRoot = nextMenuMap.get(movedRootId);

        if (!movedRoot) {
            return null;
        }

        movedRoot.parent_id = nextParentId;

        return {
            movedLabel: movedRoot.label,
            nextMenus: nextRows.map((row, index) => ({
                ...nextMenuMap.get(row.id),
                sort_order: index + 1,
            })),
        };
    };

    const reorderMenus = (sourceId, targetId) => {
        if (!canReorder || sourceId === targetId) {
            return;
        }

        const currentRows = menuTreeRows;
        const sourceRow = currentRows.find((menu) => menu.id === sourceId);
        if (!sourceRow) {
            return;
        }

        const movedIds = sourceRow.subtreeIds || [sourceId];
        if (movedIds.includes(targetId)) {
            return;
        }

        const movedRows = currentRows.filter((row) => movedIds.includes(row.id));
        const remainingRows = currentRows.filter((row) => !movedIds.includes(row.id));
        const targetIndex = remainingRows.findIndex((row) => row.id === targetId);

        if (targetIndex === -1) {
            return;
        }

        const insertIndex = targetIndex + 1;
        const nextRows = [
            ...remainingRows.slice(0, insertIndex),
            ...movedRows,
            ...remainingRows.slice(insertIndex),
        ];
        const nextParentId = inferParentIdAfterDrop(nextRows, insertIndex, sourceId);
        const nextState = buildReorderedMenuList(nextRows, sourceId, nextParentId);

        if (!nextState) {
            return;
        }

        setReorderConfirm(nextState);
    };

    const reorderToTop = () => {
        if (!canReorder || !draggingId) {
            return;
        }

        const currentRows = menuTreeRows;
        const sourceRow = currentRows.find((menu) => menu.id === draggingId);
        if (!sourceRow) {
            return;
        }

        const movedIds = sourceRow.subtreeIds || [draggingId];
        const movedRows = currentRows.filter((row) => movedIds.includes(row.id));
        const remainingRows = currentRows.filter((row) => !movedIds.includes(row.id));
        const nextRows = [...movedRows, ...remainingRows];
        const nextState = buildReorderedMenuList(nextRows, draggingId, null);

        if (!nextState) {
            return;
        }

        setReorderConfirm(nextState);
        setDraggingId(null);
        setDropRootActive(false);
    };

    const deleteMenu = (menu) => {
        if (!apiUrl) {
            return;
        }

        axios.delete(`${apiUrl}/menus/${menu.id}`, { headers: authHeaders })
            .then(() => {
                loadMenus();
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal padam menu.');
            });
    };

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(displayMenus.map((menu) => menu.id));
            return;
        }

        setSelectedIds([]);
    };

    const toggleSelect = (menuId) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(menuId)) {
                next.delete(menuId);
            } else {
                next.add(menuId);
            }
            return Array.from(next);
        });
    };

    return (
        <div className="app-complaints">
            <ConfirmModal
                isOpen={!!reorderConfirm}
                title="Simpan Susunan Menu"
                description={reorderConfirm ? `Simpan susunan baharu untuk "${reorderConfirm.movedLabel}"?` : ''}
                confirmText="Simpan"
                cancelText="Batal"
                variant="primary"
                onCancel={() => {
                    setReorderConfirm(null);
                    setDraggingId(null);
                    setDropRootActive(false);
                }}
                onConfirm={() => {
                    if (reorderConfirm?.nextMenus) {
                        saveOrder(reorderConfirm.nextMenus);
                    }
                    setReorderConfirm(null);
                }}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Padam Menu"
                description={deleteTarget ? `Padam menu "${deleteTarget.label}"? Tindakan ini tidak boleh dikembalikan.` : ''}
                confirmText="Padam"
                cancelText="Batal"
                variant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget) {
                        deleteMenu(deleteTarget);
                    }
                    setDeleteTarget(null);
                }}
            />

            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pengurusan Menu</span>
                    <h3>Senarai Menu</h3>
                    <p>Tambah menu dan tetapkan role yang boleh akses.</p>
                </div>
                <div className="app-complaints-actions">
                    <div className="app-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={keyword}
                            onChange={(event) => {
                                setKeyword(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Cari menu..."
                        />
                        {keyword && (
                            <button
                                type="button"
                                className="app-search-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => {
                                    setKeyword('');
                                    setPage(1);
                                }}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                    {isReordering && <span className="app-muted">Menyimpan...</span>}
                    <button type="button" className="app-button app-button-ghost" onClick={openBulk}>
                        Set Role
                    </button>
                    <button type="button" className="app-button" onClick={openCreate}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Menu
                    </button>
                </div>
            </div>

            {error && <div className="app-form-error">{error}</div>}
            {keyword && (
                <div className="app-detail-note">Carian aktif akan menutup fungsi drag dan drop supaya susunan menu tidak mengelirukan.</div>
            )}
            {!keyword && parentMenuIds.length > 0 && (
                <div className="app-menu-tree-actions">
                    <button
                        type="button"
                        className="app-button app-button-ghost"
                        onClick={expandAllMenus}
                        disabled={!hasCollapsedMenus}
                    >
                        <i className="bi bi-arrows-expand"></i>
                        Buka Semua
                    </button>
                    <button
                        type="button"
                        className="app-button app-button-ghost"
                        onClick={collapseAllMenus}
                        disabled={parentMenuIds.length === 0 || collapsedMenuIds.length === parentMenuIds.length}
                    >
                        <i className="bi bi-arrows-collapse"></i>
                        Tutup Semua
                    </button>
                </div>
            )}

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-table app-table-skeleton">
                        <div className="app-table-header app-menu-header">
                            <span></span>
                            <span>Nama</span>
                            <span>Menu Utama</span>
                            <span>Path</span>
                            <span>Icon</span>
                            <span>Status</span>
                            <span>Role</span>
                            <span></span>
                        </div>
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={`menu-skeleton-${index}`} className="app-table-row">
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="app-table">
                        <div className="app-table-header app-menu-header">
                            <div>
                                <input
                                    type="checkbox"
                                    checked={displayMenus.length > 0 && selectedIds.length === displayMenus.length}
                                    onChange={(event) => toggleSelectAll(event.target.checked)}
                                />
                            </div>
                            <div>Nama</div>
                            <div>Menu Utama</div>
                            <div>Path</div>
                            <div>Icon</div>
                            <div>Status</div>
                            <div>Role</div>
                            <div></div>
                        </div>

                        {canReorder && displayMenus.length > 0 && (
                            <div
                                className={`app-menu-dropzone ${dropRootActive ? 'is-active' : ''}`}
                                onDragOver={(event) => {
                                    event.preventDefault();
                                    setDropRootActive(true);
                                }}
                                onDragLeave={() => setDropRootActive(false)}
                                onDrop={(event) => {
                                    event.preventDefault();
                                    reorderToTop();
                                }}
                            >
                                Lepaskan di sini untuk jadikan Menu Utama
                            </div>
                        )}

                        {displayMenus.length === 0 ? (
                            <div className="app-empty">Tiada menu ditemui.</div>
                        ) : (
                            displayMenus.map((menu) => (
                                <div
                                    className={`app-table-row app-menu-row ${draggingId === menu.id ? 'is-dragging' : ''} ${menu.level > 0 ? 'is-child' : 'is-parent'}`}
                                    key={menu.id}
                                    draggable={canReorder}
                                    onDragStart={() => setDraggingId(menu.id)}
                                    onDragOver={(event) => {
                                        if (!canReorder) {
                                            return;
                                        }
                                        event.preventDefault();
                                        setDropRootActive(false);
                                    }}
                                    onDrop={(event) => {
                                        event.preventDefault();
                                        if (canReorder && draggingId) {
                                            reorderMenus(draggingId, menu.id);
                                        }
                                    }}
                                    onDragEnd={() => {
                                        setDraggingId(null);
                                        setDropRootActive(false);
                                    }}
                                >
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(menu.id)}
                                            onChange={() => toggleSelect(menu.id)}
                                        />
                                    </div>

                                    <div className="app-menu-name-cell" style={{ '--menu-level': menu.level }}>
                                        {menu.hasChildren ? (
                                            <button
                                                type="button"
                                                className="app-menu-toggle"
                                                draggable={false}
                                                onClick={(event) => {
                                                    event.preventDefault();
                                                    event.stopPropagation();
                                                    toggleCollapsed(menu.id);
                                                }}
                                                aria-label={menu.isCollapsed ? 'Buka submenu' : 'Tutup submenu'}
                                                title={menu.isCollapsed ? 'Buka submenu' : 'Tutup submenu'}
                                            >
                                                <i className={`bi ${menu.isCollapsed ? 'bi-chevron-right' : 'bi-chevron-down'}`}></i>
                                            </button>
                                        ) : (
                                            <span className="app-menu-toggle-placeholder" aria-hidden="true"></span>
                                        )}
                                        <span className={`app-menu-level-indicator ${menu.level > 0 ? 'is-child' : 'is-parent'}`}>
                                            <i className={`bi ${menu.level > 0 ? 'bi-arrow-return-right' : 'bi-diagram-3-fill'}`}></i>
                                        </span>
                                        <div className="app-menu-name-stack">
                                            <span className="app-code">{menu.label}</span>
                                            {menu.level > 0 ? (
                                                <span className="app-menu-sub-label">Submenu</span>
                                            ) : (
                                                <span className="app-menu-parent-label">Menu Utama</span>
                                            )}
                                        </div>
                                    </div>

                                    <div>{menu.parentLabel || '-'}</div>
                                    <div>{menu.path}</div>
                                    <div>{menu.icon || '-'}</div>
                                    <div>{menu.is_active ? 'Aktif' : 'Tidak Aktif'}</div>
                                    <div className="app-menu-roles">
                                        {menu.roles?.map((role) => role.name).join(', ') || '-'}
                                    </div>
                                    <div className="app-role-actions">
                                        <button type="button" className="app-link" onClick={() => openEdit(menu)}>
                                            Kemaskini
                                        </button>
                                        <button type="button" className="app-link app-link-danger" onClick={() => setDeleteTarget(menu)}>
                                            Padam
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {!isLoading && (
                <PaginationBar
                    page={page}
                    lastPage={lastPage}
                    total={totalRows}
                    perPage={perPage}
                    startIndex={totalRows === 0 ? 0 : ((page - 1) * perPage) + 1}
                    endIndex={Math.min(page * perPage, totalRows)}
                    onPageChange={(nextPage) => setPage(nextPage)}
                    onPerPageChange={(size) => {
                        setPerPage(size);
                        setPage(1);
                    }}
                />
            )}

            {showModal && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeModal}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <div>
                                <h4>{editing ? 'Kemaskini Menu' : 'Tambah Menu'}</h4>
                                <p>Setting menu dan role akses.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {error && <div className="app-form-error">{error}</div>}

                        <form onSubmit={saveMenu} className="app-form-grid">
                            <label className="app-form-field">
                                <span>Nama Menu</span>
                                <input value={form.label} onChange={(e) => updateField('label', e.target.value)} required />
                            </label>

                            <label className="app-form-field">
                                <span>Path</span>
                                <input value={form.path} onChange={(e) => updateField('path', e.target.value)} required />
                            </label>

                            <label className="app-form-field">
                                <span>Icon (bi-)</span>
                                <input value={form.icon} onChange={(e) => updateField('icon', e.target.value)} />
                            </label>

                            <label className="app-form-field">
                                <span>Menu Utama</span>
                                <select value={form.parent_id} onChange={(e) => updateField('parent_id', e.target.value)}>
                                    <option value="">Tiada (Menu Utama)</option>
                                    {menuOptions
                                        .filter((item) => !editing || item.id !== editing.id)
                                        .map((item) => (
                                            <option key={item.id} value={String(item.id)}>
                                                {item.label}
                                            </option>
                                        ))}
                                </select>
                            </label>

                            <label className="app-form-field">
                                <span>Susunan</span>
                                <input
                                    type="number"
                                    value={form.sort_order}
                                    onChange={(e) => updateField('sort_order', Number(e.target.value))}
                                />
                            </label>

                            <label className="app-form-field">
                                <span>Status</span>
                                <select
                                    value={form.is_active ? '1' : '0'}
                                    onChange={(e) => updateField('is_active', e.target.value === '1')}
                                >
                                    <option value="1">Aktif</option>
                                    <option value="0">Tidak Aktif</option>
                                </select>
                            </label>

                            <label className="app-form-field app-span-full">
                                <span>Role Akses</span>
                                <div className="app-checkbox-grid">
                                    {roles.map((role) => (
                                        <label key={role.id} className="app-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={form.role_ids.includes(role.id)}
                                                onChange={() => toggleRole(role.id)}
                                            />
                                            <span>{role.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </label>

                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    {editing ? 'Simpan Perubahan' : 'Tambah Menu'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showBulk && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeBulk}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <div>
                                <h4>Set Role (Pukal)</h4>
                                <p>Role akan ditukar untuk {selectedIds.length} menu terpilih.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeBulk}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>

                        {error && <div className="app-form-error">{error}</div>}

                        <form onSubmit={applyBulkRoles} className="app-form-grid">
                            <label className="app-form-field app-span-full">
                                <span>Role Akses</span>
                                <div className="app-checkbox-grid">
                                    {roles.map((role) => (
                                        <label key={role.id} className="app-checkbox">
                                            <input
                                                type="checkbox"
                                                checked={bulkRoles.includes(role.id)}
                                                onChange={() => toggleBulkRole(role.id)}
                                            />
                                            <span>{role.name}</span>
                                        </label>
                                    ))}
                                </div>
                            </label>

                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    Simpan Role
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MenuList;
