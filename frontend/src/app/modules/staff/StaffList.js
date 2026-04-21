import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import { sortRows } from '../../utils/sort';

const emptyForm = {
    name: '',
    ic_number: '',
    staff_id: '',
    phone: '',
    address: '',
    office_address: '',
    marital_status: '',
    position: '',
    grade: '',
    department: '',
    department_code: '',
    office_type: '',
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
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [sortKey, setSortKey] = useState('');
    const [sortDir, setSortDir] = useState('asc');

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
            params: {
                page,
                per_page: perPage,
                keyword: keyword.trim() || undefined,
            },
        })
            .then((response) => {
                setStaff(response?.data?.data || []);
                setTotal(response?.data?.meta?.total ?? 0);
                setLastPage(response?.data?.meta?.last_page ?? 1);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan senarai staff.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadStaff();
    }, [apiUrl, page, perPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadStaff();
        }, 300);
        return () => clearTimeout(timer);
    }, [keyword]);

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
            office_address: item.office_address || '',
            marital_status: item.marital_status || '',
            position: item.position || '',
            grade: item.grade || '',
            department: item.department || '',
            department_code: item.department_code || '',
            office_type: item.office_type || '',
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

    const startIndex = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIndex = Math.min(page * perPage, total);
    const sortColumns = [
        { key: 'bil', label: 'BIL', sortable: false },
        { key: 'name', label: 'Nama', sortable: true },
        { key: 'staff_id', label: 'ID Kakitangan', sortable: true },
        { key: 'phone', label: 'Telefon', sortable: true },
        { key: 'grade', label: 'Gred', sortable: true },
        { key: 'office_type', label: 'Penempatan Operasi', sortable: true },
        { key: 'district', label: 'Daerah', sortable: true },
        { key: 'account', label: 'Akaun', sortable: true },
        { key: '', label: '', sortable: false },
    ];
    const sortAccessors = useMemo(() => ({
        bil: () => 0,
        name: (item) => item.name || '',
        staff_id: (item) => item.staff_id || '',
        phone: (item) => item.phone || '',
        grade: (item) => item.grade || '',
        office_type: (item) => item.office_type === 'hq' ? 'HQ' : item.office_type === 'daerah' ? 'Daerah' : '',
        district: (item) => item.district?.name || '',
        account: (item) => item.user?.email || '',
    }), []);
    const sortedStaff = useMemo(
        () => sortRows(staff, sortKey, sortDir, sortAccessors),
        [staff, sortKey, sortDir, sortAccessors]
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
                    <span className="app-eyebrow">Pengurusan Kakitangan</span>
                    <h3>Senarai Kakitangan</h3>
                    <p>Tambah dan kemaskini maklumat kakitangan serta akaun pengguna.</p>
                </div>
                <div className="app-complaints-actions">
                    <div className="app-search">
                        <i className="bi bi-search"></i>
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Cari nama atau ID staff..."
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
                        Tambah Kakitangan
                    </button>
                </div>
            </div>

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-empty">Memuatkan senarai staff...</div>
                ) : (
                    <div className="app-table">
                        <SortableHeader
                            className="app-table-header app-staff-header"
                            columns={sortColumns}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {staff.length === 0 ? (
                            <div className="app-empty">Tiada staff ditemui.</div>
                        ) : (
                            sortedStaff.map((item, index) => (
                                <div className="app-table-row app-staff-row" key={item.id}>
                                    <div className="app-bil-cell">{startIndex + index}</div>
                                    <div className="app-code">{item.name}</div>
                                    <div>{item.staff_id || '-'}</div>
                                    <div>{item.phone || '-'}</div>
                                    <div>{item.grade || '-'}</div>
                                    <div>{item.office_type === 'hq' ? 'HQ' : item.office_type === 'daerah' ? 'Daerah' : '-'}</div>
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
            {!isLoading && staff.length > 0 && (
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
                                <h4>{editingId ? 'Kemaskini Kakitangan' : 'Tambah Kakitangan'}</h4>
                                <p>Isi maklumat kakitangan dan pilihan akaun pengguna.</p>
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
                                <span>ID Kakitangan</span>
                                <input value={form.staff_id} onChange={(e) => updateField('staff_id', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>No HP</span>
                                <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Alamat Rumah</span>
                                <input value={form.address} onChange={(e) => updateField('address', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Alamat Pejabat</span>
                                <input value={form.office_address} onChange={(e) => updateField('office_address', e.target.value)} />
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
                                <span>Gred</span>
                                <input value={form.grade} onChange={(e) => updateField('grade', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Jabatan</span>
                                <input value={form.department} onChange={(e) => updateField('department', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Kod Jabatan</span>
                                <input value={form.department_code} onChange={(e) => updateField('department_code', e.target.value)} />
                            </label>
                            <label className="app-form-field">
                                <span>Penempatan Operasi</span>
                                <select value={form.office_type} onChange={(e) => updateField('office_type', e.target.value)}>
                                    <option value="">Pilih Penempatan</option>
                                    <option value="hq">HQ</option>
                                    <option value="daerah">Daerah</option>
                                </select>
                            </label>
                            {form.office_type === 'daerah' && (
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
                            )}
                            <div className="app-span-full app-form-section">
                                <h5>Akaun Login</h5>
                                <p>Isi e-mel untuk paut akaun sedia ada. Jika belum ada akaun, isi kata laluan untuk cipta akaun baru.</p>
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
                                <span>Role Akses (optional)</span>
                                <select value={form.role} onChange={(e) => updateField('role', e.target.value)}>
                                    <option value="">Pilih Role Akses</option>
                                    {roles.map((role) => (
                                        <option key={role.id} value={role.name}>
                                            {role.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <div className="app-form-actions app-span-full">
                                <button className="app-button" type="submit">
                                    {editingId ? 'Simpan Perubahan' : 'Tambah Kakitangan'}
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
