import React, { useEffect, useState } from 'react';
import axios from 'axios';

const emptyForm = {
    name: '',
    ic_number: '',
    staff_id: '',
    phone: '',
    address: '',
    marital_status: '',
    position: '',
    department: '',
    district_id: '',
    email: '',
    password: '',
    role: '',
};

const StaffList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [staff, setStaff] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [roles, setRoles] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');

    const token = localStorage.getItem('token');

    const loadStaff = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/staff`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                setStaff(response?.data?.data || []);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan senarai staff.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadStaff();
    }, [apiUrl]);

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/districts`)
            .then((response) => {
                setDistricts(response?.data?.data || []);
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
        setForm(emptyForm);
        setEditingId(null);
        setShowModal(true);
    };

    const openEdit = (item) => {
        setForm({
            name: item.name || '',
            ic_number: item.ic_number || '',
            staff_id: item.staff_id || '',
            phone: item.phone || '',
            address: item.address || '',
            marital_status: item.marital_status || '',
            position: item.position || '',
            department: item.department || '',
            district_id: item.district_id || '',
            email: item.user?.email || '',
            password: '',
            role: item.user?.roles?.[0]?.name || '',
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

    const saveStaff = (event) => {
        event.preventDefault();
        if (!apiUrl) {
            return;
        }
        setError('');
        const payload = { ...form };
        if (!payload.password) {
            delete payload.password;
        }
        if (!payload.email) {
            delete payload.email;
        }
        if (!payload.role) {
            delete payload.role;
        }

        const request = editingId
            ? axios.put(`${apiUrl}/staff/${editingId}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/staff`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

        request
            .then(() => {
                closeModal();
                loadStaff();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal simpan staff.');
            });
    };

    const filtered = staff.filter((item) => {
        if (!keyword) {
            return true;
        }
        const search = keyword.toLowerCase();
        return (
            (item.name || '').toLowerCase().includes(search) ||
            (item.staff_id || '').toLowerCase().includes(search) ||
            (item.ic_number || '').toLowerCase().includes(search)
        );
    });

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pengurusan Staff</span>
                    <h3>Senarai Staff</h3>
                    <p>Tambah dan kemaskini maklumat staff serta akaun pengguna.</p>
                </div>
                <div className="app-complaints-actions">
                    <div className="app-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Cari nama atau ID staff..."
                        />
                    </div>
                    <button type="button" className="app-button" onClick={openCreate}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah Staff
                    </button>
                </div>
            </div>

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-empty">Memuatkan senarai staff...</div>
                ) : (
                    <div className="app-table">
                        <div className="app-table-header app-staff-header">
                            <span>Nama</span>
                            <span>ID Staff</span>
                            <span>Telefon</span>
                            <span>Daerah</span>
                            <span>Akaun</span>
                            <span></span>
                        </div>
                        {filtered.length === 0 ? (
                            <div className="app-empty">Tiada staff ditemui.</div>
                        ) : (
                            filtered.map((item) => (
                                <div className="app-table-row app-staff-row" key={item.id}>
                                    <div className="app-code">{item.name}</div>
                                    <div>{item.staff_id || '-'}</div>
                                    <div>{item.phone || '-'}</div>
                                    <div>{item.district?.name || '-'}</div>
                                    <div>{item.user?.email || 'Belum daftar'}</div>
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

            {showModal && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeModal}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <div>
                                <h4>{editingId ? 'Kemaskini Staff' : 'Tambah Staff'}</h4>
                                <p>Isi maklumat staff dan pilihan akaun pengguna.</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={closeModal}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {error && <div className="app-form-error">{error}</div>}
                        <form onSubmit={saveStaff} className="app-form-grid">
                            <label className="app-form-field">
                                <span>Nama</span>
                                <input value={form.name} onChange={(e) => updateField('name', e.target.value)} required />
                            </label>
                            <label className="app-form-field">
                                <span>No IC</span>
                                <input value={form.ic_number} onChange={(e) => updateField('ic_number', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>ID Staff</span>
                                <input value={form.staff_id} onChange={(e) => updateField('staff_id', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>No HP</span>
                                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Alamat</span>
                                <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Status Kahwin</span>
                                <input value={form.marital_status} onChange={(e) => updateField('marital_status', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Jawatan</span>
                                <input value={form.position} onChange={(e) => updateField('position', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Jabatan</span>
                                <input value={form.department} onChange={(e) => updateField('department', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Daerah</span>
                                <select value={form.district_id} onChange={(e) => updateField('district_id', e.target.value)}>
                                    <option value="">Pilih Daerah</option>
                                    {districts.map((district) => (
                                        <option key={district.id} value={district.id}>
                                            {district.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="app-span-full app-form-section">
                                <h5>Register Akaun</h5>
                                <p>Sila isi maklumat di bawah untuk auto register akaun.</p>
                            </div>
                            <label className="app-form-field">
                                <span>E-mel Akaun (optional)</span>
                                <input value={form.email} onChange={(e) => updateField('email', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Kata Laluan (optional)</span>
                                <input type="password" value={form.password} onChange={(e) => updateField('password', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Role Akaun (optional)</span>
                                <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                                    <option value="">Pilih Role</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    {editingId ? 'Simpan Perubahan' : 'Tambah Staff'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StaffList;
