import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import { sortRows } from '../../utils/sort';

const RoleList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [isActive, setIsActive] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
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

    const sortedRoles = useMemo(
        () => sortRows(roles, sortKey, sortDir, {
            name: (item) => item.name || '',
            guard: (item) => item.guard_name || '',
            users_count: (item) => Number(item.users_count || 0),
            status: (item) => (item.is_active === false ? '0' : '1'),
        }),
        [roles, sortKey, sortDir]
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

    const loadRoles = () => {
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
        axios.get(`${apiUrl}/roles`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => {
                setRoles(response?.data?.data || []);
                setPagination(response?.data?.meta || {
                    current_page: page,
                    last_page: 1,
                    per_page: perPage,
                    total: 0,
                });
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan roles.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadRoles();
    }, [apiUrl, page, perPage, keyword]);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setIsActive(true);
        setError('');
        setShowModal(true);
    };

    const openEdit = (role) => {
        setEditing(role);
        setName(role.name);
        setIsActive(role.is_active !== false);
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setName('');
        setIsActive(true);
        setError('');
    };

    const saveRole = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }
        setError('');
        const payload = { name, is_active: isActive };
        const request = editing
            ? axios.put(`${apiUrl}/roles/${editing.id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/roles`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

        request
            .then(() => {
                closeModal();
                loadRoles();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal simpan role.');
            });
    };

    const deleteRole = (role) => {
        if (!apiUrl) {
            return;
        }
        const confirmed = window.confirm(`Padam role "${role.name}"?`);
        if (!confirmed) {
            return;
        }

        axios.delete(`${apiUrl}/roles/${role.id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                loadRoles();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal padam role.');
            });
    };

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pengurusan Role</span>
                    <h3>Senarai Role</h3>
                    <p>Tambah, kemaskini, atau padam role pengguna.</p>
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
                            placeholder="Cari role..."
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
                    <button type="button" className="app-button" onClick={openCreate}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Role
                    </button>
                </div>
            </div>

            {error && <div className="app-form-error">{error}</div>}

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-table app-table-skeleton">
                        <div className="app-table-header app-role-header">
                            <span>Nama Role</span>
                            <span>Guard</span>
                            <span>Bil. Pengguna</span>
                            <span></span>
                        </div>
                        {Array.from({ length: 6 }, (_, index) => (
                            <div key={`role-skeleton-${index}`} className="app-table-row">
                                <span className="app-skeleton-line"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="app-table">
                            <SortableHeader
                            className="app-table-header app-role-header"
                            columns={[
                                { key: 'name', label: 'Nama Role', sortable: true },
                                { key: 'guard', label: 'Guard', sortable: true },
                                { key: 'users_count', label: 'Bil. Pengguna', sortable: true },
                                { key: 'status', label: 'Status', sortable: true },
                                { key: '', label: 'Tindakan', sortable: false },
                            ]}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {roles.length === 0 ? (
                            <div className="app-empty">Tiada role ditemui.</div>
                        ) : (
                            sortedRoles.map((role) => (
                                <div className="app-table-row app-role-row" key={role.id}>
                                    <div className="app-code">{role.name}</div>
                                    <div>{role.guard_name}</div>
                                    <div>{role.users_count ?? 0}</div>
                                    <div>{role.is_active === false ? 'Tidak aktif' : 'Aktif'}</div>
                                    <div className="app-role-actions">
                                        <button type="button" className="app-icon-button" onClick={() => openEdit(role)} title="Kemaskini">
                                            <i className="bi bi-pencil-square"></i>
                                        </button>
                                        <button type="button" className="app-icon-button app-icon-button-danger" onClick={() => deleteRole(role)} title="Padam">
                                            <i className="bi bi-trash3"></i>
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
                                <h4>{editing ? 'Kemaskini Role' : 'Tambah Role'}</h4>
                                <p>Role digunakan untuk kawalan akses modul.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {error && <div className="app-form-error">{error}</div>}
                        <form onSubmit={saveRole} className="app-form-grid">
                            <label className="app-form-field app-span-full">
                                <span>Nama Role</span>
                                <input
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    required
                                />
                            </label>
                            <label className="app-form-field">
                                <span>Status</span>
                                <select value={isActive ? '1' : '0'} onChange={(event) => setIsActive(event.target.value === '1')}>
                                    <option value="1">Aktif</option>
                                    <option value="0">Tidak aktif</option>
                                </select>
                            </label>
                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    {editing ? 'Simpan Perubahan' : 'Tambah Role'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RoleList;
