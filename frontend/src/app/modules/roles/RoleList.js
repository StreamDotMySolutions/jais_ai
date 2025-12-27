import React, { useEffect, useState } from 'react';
import axios from 'axios';

const RoleList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    const loadRoles = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/roles`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setRoles(response?.data?.data || []);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan roles.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadRoles();
    }, [apiUrl]);

    const openCreate = () => {
        setEditing(null);
        setName('');
        setError('');
        setShowModal(true);
    };

    const openEdit = (role) => {
        setEditing(role);
        setName(role.name);
        setError('');
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditing(null);
        setName('');
        setError('');
    };

    const saveRole = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }
        setError('');
        const request = editing
            ? axios.put(`${apiUrl}/roles/${editing.id}`, { name }, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/roles`, { name }, {
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

    const filtered = roles.filter((role) => {
        if (!keyword) {
            return true;
        }
        return role.name.toLowerCase().includes(keyword.toLowerCase());
    });

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
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Cari role..."
                        />
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
                    <div className="app-empty">Memuatkan role...</div>
                ) : (
                    <div className="app-table">
                        <div className="app-table-header app-role-header">
                            <span>Nama Role</span>
                            <span>Guard</span>
                            <span>Bil. Pengguna</span>
                            <span></span>
                        </div>
                        {filtered.length === 0 ? (
                            <div className="app-empty">Tiada role ditemui.</div>
                        ) : (
                            filtered.map((role) => (
                                <div className="app-table-row app-role-row" key={role.id}>
                                    <div className="app-code">{role.name}</div>
                                    <div>{role.guard_name}</div>
                                    <div>{role.users_count ?? 0}</div>
                                    <div className="app-role-actions">
                                        <button type="button" className="app-link" onClick={() => openEdit(role)}>
                                            Kemaskini
                                        </button>
                                        <button type="button" className="app-link app-link-danger" onClick={() => deleteRole(role)}>
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
