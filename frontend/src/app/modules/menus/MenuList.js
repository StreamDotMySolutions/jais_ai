import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import ConfirmModal from '../../components/SharedConfirmModal';
import { sortRows } from '../../utils/sort';

const emptyForm = {
    label: '',
    path: '',
    icon: '',
    sort_order: 0,
    is_active: true,
    parent_id: '',
    role_ids: [],
};

const MenuList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [menus, setMenus] = useState([]);
    const [menuOptions, setMenuOptions] = useState([]);
    const [roles, setRoles] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [draggingId, setDraggingId] = useState(null);
    const [isReordering, setIsReordering] = useState(false);
    const [selectedIds, setSelectedIds] = useState([]);
    const [showBulk, setShowBulk] = useState(false);
    const [bulkRoles, setBulkRoles] = useState([]);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [reorderConfirm, setReorderConfirm] = useState(null);

    const loadMenus = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        const params = {
            page,
            per_page: perPage,
        };
        if (keyword) {
            params.keyword = keyword;
        }
        axios.get(`${apiUrl}/menus`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => {
                setMenus(response?.data?.data || []);
                setPagination(response?.data?.meta || {
                    current_page: page,
                    last_page: 1,
                    per_page: perPage,
                    total: 0,
                });
                setSelectedIds([]);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan menu.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadMenus();
    }, [apiUrl, page, perPage, keyword]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/menus`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: { per_page: 200 },
        })
            .then((response) => {
                setMenuOptions(response?.data?.data || []);
            })
            .catch(() => {});
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/roles`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRoles(response?.data?.data || []);
            })
            .catch(() => {});
    }, [apiUrl]);

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
            ? axios.put(`${apiUrl}/menus/${editing.id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/menus`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

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
        const payload = { menu_ids: selectedIds, role_ids: bulkRoles };
        setError('');
        axios.post(`${apiUrl}/menus/bulk-roles`, payload, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
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

    const saveOrder = (orderIds) => {
        if (!apiUrl) {
            return;
        }
        setIsReordering(true);
        axios.post(`${apiUrl}/menus/reorder`, { order: orderIds }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                setError('');
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal kemaskini susunan.');
                loadMenus();
            })
            .finally(() => {
                setIsReordering(false);
            });
    };

    const reorderMenus = (sourceId, targetId) => {
        if (sourceId === targetId) {
            return;
        }
        const nextMenus = [...menus];
        const sourceIndex = nextMenus.findIndex((menu) => menu.id === sourceId);
        const targetIndex = nextMenus.findIndex((menu) => menu.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) {
            return;
        }
        const [moved] = nextMenus.splice(sourceIndex, 1);
        nextMenus.splice(targetIndex, 0, moved);
        setReorderConfirm({
            movedLabel: moved.label,
            nextMenus,
        });
    };

    const deleteMenu = (menu) => {
        if (!apiUrl) {
            return;
        }
        axios.delete(`${apiUrl}/menus/${menu.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                loadMenus();
                window.dispatchEvent(new Event('menus:updated'));
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal padam menu.');
            });
    };

    const canReorder = !keyword && !sortKey && page === 1;
    const sortColumns = [
        { key: 'label', label: 'Nama', sortable: true },
        { key: 'parent', label: 'Menu Utama', sortable: true },
        { key: 'path', label: 'Path', sortable: true },
        { key: 'icon', label: 'Icon', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: 'roles', label: 'Role', sortable: true },
        { key: '', label: '', sortable: false },
    ];
    const sortAccessors = useMemo(() => ({
        label: (item) => item.label || '',
        parent: (item) => item.parent?.label || '',
        path: (item) => item.path || '',
        icon: (item) => item.icon || '',
        status: (item) => (item.is_active ? 'Aktif' : 'Tidak Aktif'),
        roles: (item) => item.roles?.map((role) => role.name).join(', ') || '',
    }), []);
    const sortedMenus = useMemo(
        () => sortRows(menus, sortKey, sortDir, sortAccessors),
        [menus, sortKey, sortDir, sortAccessors]
    );
    const displayMenus = sortKey ? sortedMenus : menus;

    const handleSort = (key) => {
        if (!key) {
            return;
        }
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const toggleSelectAll = (checked) => {
        if (checked) {
            setSelectedIds(displayMenus.map((menu) => menu.id));
        } else {
            setSelectedIds([]);
        }
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
                description={reorderConfirm ? `Simpan susunan baharu untuk \"${reorderConfirm.movedLabel}\"?` : ''}
                confirmText="Simpan"
                cancelText="Batal"
                variant="primary"
                onCancel={() => setReorderConfirm(null)}
                onConfirm={() => {
                    if (reorderConfirm?.nextMenus) {
                        setMenus(reorderConfirm.nextMenus);
                        saveOrder(reorderConfirm.nextMenus.map((menu) => menu.id));
                    }
                    setReorderConfirm(null);
                }}
            />
            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Padam Menu"
                description={deleteTarget ? `Padam menu \"${deleteTarget.label}\"? Tindakan ini tidak boleh dikembalikan.` : ''}
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
            {!canReorder && (
                <div className="app-detail-note">Susun menu hanya di halaman pertama tanpa carian atau susunan.</div>
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
                        <SortableHeader
                            className="app-table-header app-menu-header"
                            columns={[
                                { key: 'select', label: (
                                    <input
                                        type="checkbox"
                                        checked={selectedIds.length > 0 && selectedIds.length === displayMenus.length}
                                        onChange={(event) => toggleSelectAll(event.target.checked)}
                                    />
                                ), sortable: false },
                                ...sortColumns,
                            ]}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {displayMenus.length === 0 ? (
                            <div className="app-empty">Tiada menu ditemui.</div>
                        ) : (
                            displayMenus.map((menu) => (
                                <div
                                    className={`app-table-row app-menu-row ${draggingId === menu.id ? 'is-dragging' : ''}`}
                                    key={menu.id}
                                    draggable={canReorder}
                                    onDragStart={() => setDraggingId(menu.id)}
                                    onDragOver={(event) => {
                                        if (canReorder) {
                                            event.preventDefault();
                                        }
                                    }}
                                    onDrop={() => {
                                        if (canReorder && draggingId) {
                                            reorderMenus(draggingId, menu.id);
                                        }
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                >
                                    <div>
                                        <input
                                            type="checkbox"
                                            checked={selectedIds.includes(menu.id)}
                                            onChange={() => toggleSelect(menu.id)}
                                        />
                                    </div>
                                    <div className="app-code">{menu.label}</div>
                                    <div>{menu.parent?.label || '-'}</div>
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
                    page={pagination.current_page}
                    lastPage={pagination.last_page}
                    total={pagination.total}
                    perPage={pagination.per_page}
                    startIndex={pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1}
                    endIndex={Math.min(pagination.current_page * pagination.per_page, pagination.total)}
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
                                <select
                                    value={form.parent_id}
                                    onChange={(e) => updateField('parent_id', e.target.value)}
                                >
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
