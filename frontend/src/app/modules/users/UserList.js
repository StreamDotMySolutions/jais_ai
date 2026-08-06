import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import { sortRows } from '../../utils/sort';

const emptyForm = {
    name: '',
    email: '',
    password: '',
    role: '',
    status: '1',
    office_type: '',
};

const UserList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [keyword, setKeyword] = useState('');
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');

    const loadUsers = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/users`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                keyword: keyword.trim() || undefined,
            },
        })
            .then((response) => {
                setUsers(response?.data?.data || []);
                setTotal(response?.data?.meta?.total ?? 0);
                setLastPage(response?.data?.meta?.last_page ?? 1);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan pengguna.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadUsers();
    }, [apiUrl, page, perPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadUsers();
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

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
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setForm({
            name: item.name || '',
            email: item.email || '',
            password: '',
            role: item.roles?.[0]?.name || '',
            status: item.status ? '1' : '0',
            office_type: item.office_type || '',
        });
        setEditingId(item.id);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setError('');
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const saveUser = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }
        setError('');
        const payload = {
            name: form.name,
            email: form.email,
            role: form.role || null,
            status: form.status === '1' ? 1 : 0,
            office_type: form.office_type || null,
        };
        if (form.password) {
            payload.password = form.password;
        }

        const request = editingId
            ? axios.post(`${apiUrl}/users/${editingId}/update`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/users`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

        request
            .then(() => {
                closeModal();
                loadUsers();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal simpan pengguna.');
            });
    };

    const toggleUserStatus = (item) => {
        if (!apiUrl) {
            return;
        }
        const nextStatus = item.status ? 0 : 1;
        axios.post(`${apiUrl}/users/${item.id}/update`, {
            status: nextStatus,
        }, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                loadUsers();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal mengemaskini status pengguna.');
            });
    };

    const startIndex = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIndex = Math.min(page * perPage, total);
    const sortColumns = [
        { key: 'bil', label: 'BIL', sortable: false },
        { key: 'name', label: 'Nama', sortable: true },
        { key: 'email', label: 'Emel', sortable: true },
        { key: 'role', label: 'Role Akses', sortable: true },
        { key: 'office_type', label: 'Penempatan Operasi', sortable: true },
        { key: 'status', label: 'Status', sortable: true },
        { key: '', label: '', sortable: false },
    ];
    const sortAccessors = useMemo(() => ({
        name: (item) => item.name || '',
        email: (item) => item.email || '',
        role: (item) => item.roles?.[0]?.name || '',
        office_type: (item) => item.office_type === 'hq' ? 'HQ' : item.office_type === 'daerah' ? 'Daerah' : '',
        status: (item) => item.status ? 'Aktif' : 'Tidak Aktif',
    }), []);
    const sortedUsers = useMemo(
        () => sortRows(users, sortKey, sortDir, sortAccessors),
        [users, sortKey, sortDir, sortAccessors]
    );

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

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pengurusan Pengguna</span>
                    <h3>Senarai Pengguna</h3>
                    <p>Tambah dan kemaskini akaun pengguna sistem.</p>
                </div>
                <div className="app-complaints-actions">
                    <div className="app-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Cari nama atau emel..."
                        />
                        {keyword && (
                            <button
                                type="button"
                                className="app-search-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => setKeyword('')}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                    <button type="button" className="app-button" onClick={openCreate}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Pengguna
                    </button>
                </div>
            </div>

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-table app-table-skeleton">
                        <div className="app-table-header app-user-header">
                            <span>BIL</span>
                            <span>Nama</span>
                            <span>Emel</span>
                            <span>Role Akses</span>
                            <span>Penempatan Operasi</span>
                            <span>Status</span>
                            <span></span>
                        </div>
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={`user-skeleton-${index}`} className="app-table-row app-user-row">
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="app-table">
                        <SortableHeader
                            className="app-table-header app-user-header"
                            columns={sortColumns}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {users.length === 0 ? (
                            <div className="app-empty">Tiada pengguna ditemui.</div>
                        ) : (
                            sortedUsers.map((item, index) => (
                                <div className="app-table-row app-user-row" key={item.id}>
                                    <div>{startIndex + index}</div>
                                    <div className="app-code">{item.name}</div>
                                    <div>{item.email}</div>
                                    <div>{item.roles?.[0]?.name || '-'}</div>
                                    <div>{item.office_type === 'hq' ? 'HQ' : item.office_type === 'daerah' ? 'Daerah' : '-'}</div>
                                    <div className="app-user-status-cell">
                                        <label className="app-toggle-switch" title={item.status ? 'Aktif' : 'Tidak Aktif'}>
                                            <input
                                                type="checkbox"
                                                checked={Boolean(item.status)}
                                                onChange={() => toggleUserStatus(item)}
                                            />
                                            <span className="app-toggle-slider"></span>
                                        </label>
                                        <span className="app-user-status-label">{item.status ? 'Aktif' : 'Tidak Aktif'}</span>
                                    </div>
                                    <button
                                        type="button"
                                        className="app-link"
                                        onClick={() => openEdit(item)}
                                    >
                                        Kemaskini
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
            {!isLoading && users.length > 0 && (
                <PaginationBar
                    page={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={perPage}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
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
                                <h4>{editingId ? 'Kemaskini Pengguna' : 'Tambah Pengguna'}</h4>
                                <p>Lengkapkan maklumat akaun.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {error && <div className="app-form-error">{error}</div>}
                        <form onSubmit={saveUser} className="app-form-grid">
                            <label className="app-form-field">
                                <span>Nama</span>
                                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
                            </label>
                            <label className="app-form-field">
                                <span>Emel</span>
                                <input value={form.email} onChange={(e) => updateField('email', e.target.value)} required />
                            </label>
                            <label className="app-form-field">
                                <span>Kata Laluan {editingId ? '(optional)' : ''}</span>
                                <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Role Akses</span>
                                <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                                    <option value="">Pilih Role Akses</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label className="app-form-field">
                                <span>Penempatan Operasi</span>
                                <select value={form.office_type} onChange={(e) => updateField('office_type', e.target.value)}>
                                    <option value="">Pilih Penempatan</option>
                                    <option value="hq">HQ</option>
                                    <option value="daerah">Daerah</option>
                                </select>
                            </label>
                            <label className="app-form-field">
                                <span>Status</span>
                                <select value={form.status} onChange={(e) => updateField('status', e.target.value)}>
                                    <option value="1">Aktif</option>
                                    <option value="0">Tidak Aktif</option>
                                </select>
                            </label>
                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    {editingId ? 'Simpan Perubahan' : 'Tambah Pengguna'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserList;
