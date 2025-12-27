import React, { useEffect, useState } from 'react';
import axios from 'axios';

const emptyForm = {
    label: '',
    path: '',
    icon: '',
    sort_order: 0,
    is_active: true,
    role_ids: [],
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
    const [isReordering, setIsReordering] = useState(false);

    const loadMenus = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/menus`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setMenus(response?.data?.data || []);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan menu.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadMenus();
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
        const payload = { ...form };
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
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal simpan menu.');
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
        const current = [...menus];
        const sourceIndex = current.findIndex((menu) => menu.id === sourceId);
        const targetIndex = current.findIndex((menu) => menu.id === targetId);
        if (sourceIndex === -1 || targetIndex === -1) {
            return;
        }
        const [moved] = current.splice(sourceIndex, 1);
        current.splice(targetIndex, 0, moved);
        const confirmMove = window.confirm(`Simpan susunan baharu untuk "${moved.label}"?`);
        if (!confirmMove) {
            return;
        }
        setMenus(current);
        saveOrder(current.map((menu) => menu.id));
    };

    const deleteMenu = (menu) => {
        if (!apiUrl) {
            return;
        }
        const confirmed = window.confirm(`Padam menu "${menu.label}"?`);
        if (!confirmed) {
            return;
        }
        axios.delete(`${apiUrl}/menus/${menu.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => loadMenus())
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal padam menu.');
            });
    };

    const filtered = menus.filter((menu) => {
        if (!keyword) {
            return true;
        }
        const search = keyword.toLowerCase();
        return (
            (menu.label || '').toLowerCase().includes(search) ||
            (menu.path || '').toLowerCase().includes(search)
        );
    });

    return (
        <div className="app-complaints">
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
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="Cari menu..."
                            />
                        </div>
                        {isReordering && <span className="app-muted">Menyimpan...</span>}
                        <button type="button" className="app-button" onClick={openCreate}>
                            <i className="bi bi-plus-lg"></i>
                            Tambah Menu
                        </button>
                    </div>
            </div>

            {error && <div className="app-form-error">{error}</div>}
            {keyword && (
                <div className="app-detail-note">Kosongkan carian untuk susun menu menggunakan drag.</div>
            )}

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-empty">Memuatkan menu...</div>
                ) : (
                    <div className="app-table">
                        <div className="app-table-header app-menu-header">
                            <span>Nama</span>
                            <span>Path</span>
                            <span>Icon</span>
                            <span>Status</span>
                            <span>Role</span>
                            <span></span>
                        </div>
                        {filtered.length === 0 ? (
                            <div className="app-empty">Tiada menu ditemui.</div>
                        ) : (
                            filtered.map((menu) => (
                                <div
                                    className={`app-table-row app-menu-row ${draggingId === menu.id ? 'is-dragging' : ''}`}
                                    key={menu.id}
                                    draggable={!keyword}
                                    onDragStart={() => setDraggingId(menu.id)}
                                    onDragOver={(event) => {
                                        if (!keyword) {
                                            event.preventDefault();
                                        }
                                    }}
                                    onDrop={() => {
                                        if (!keyword && draggingId) {
                                            reorderMenus(draggingId, menu.id);
                                        }
                                    }}
                                    onDragEnd={() => setDraggingId(null)}
                                >
                                    <div className="app-code">{menu.label}</div>
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
                                        <button type="button" className="app-link app-link-danger" onClick={() => deleteMenu(menu)}>
                                            Padam
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

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
        </div>
    );
};

export default MenuList;
