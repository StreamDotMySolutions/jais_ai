import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const initialForm = {
    location: '',
    incidentDate: '',
    sections: [],
    otherSection: '',
    notes: '',
};

const ArahanBeredar = ({ mode = 'create' }) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const { id } = useParams();
    const navigate = useNavigate();
    const [form, setForm] = useState(initialForm);
    const [oydsList, setOydsList] = useState([
        { id: null, name: '', ic: '', phone: '', address: '', photo: null, media: [] },
    ]);
    const [sectionOptions, setSectionOptions] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
    const [isLoading, setIsLoading] = useState(mode !== 'create');
    const userName = useMemo(() => localStorage.getItem('user_name') || 'Pengguna', []);
    const userEmail = useMemo(() => localStorage.getItem('user_email') || '-', []);
    const staffNo = useMemo(() => localStorage.getItem('staff_no') || '-', []);
    const staffIc = useMemo(() => localStorage.getItem('staff_ic') || '-', []);
    const token = localStorage.getItem('token');

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/references/arahan-beredar-sections`)
            .then((response) => {
                setSectionOptions(response?.data?.data || []);
            })
            .catch(() => {
                setSectionOptions([]);
            });
    }, [apiUrl]);

    const toggleSection = (value) => {
        setForm((prev) => {
            const exists = prev.sections.includes(value);
            return {
                ...prev,
                sections: exists
                    ? prev.sections.filter((item) => item !== value)
                    : [...prev.sections, value],
            };
        });
    };

    const updateOyds = (index, field, value) => {
        setOydsList((prev) => prev.map((item, idx) => (
            idx === index ? { ...item, [field]: value } : item
        )));
    };

    const addOyds = () => {
        setOydsList((prev) => [
            ...prev,
            { id: null, name: '', ic: '', phone: '', address: '', photo: null, media: [] },
        ]);
    };

    const removeOyds = (index) => {
        setOydsList((prev) => (
            prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)
        ));
    };

    useEffect(() => {
        if (mode === 'create' || !apiUrl || !id) {
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/arahan-beredar/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const data = response?.data?.data;
                if (!data) {
                    return;
                }
                setForm({
                    location: data.location || '',
                    incidentDate: data.incident_date || '',
                    sections: (data.sections || []).map((section) => section.id),
                    otherSection: data.other_section || '',
                    notes: data.notes || '',
                });
                setOydsList(
                    (data.oyds || []).map((row) => ({
                        id: row.id,
                        name: row.name || '',
                        ic: row.ic_number || '',
                        phone: row.phone || '',
                        address: row.address || '',
                        photo: null,
                        media: row.media || [],
                    }))
                );
            })
            .catch(() => {
                setMessageType('danger');
                setMessage('Gagal memuatkan rekod arahan beredar.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, mode, token]);

    const handleSubmit = () => {
        if (!apiUrl) {
            setMessageType('danger');
            setMessage('API URL tidak diset.');
            return;
        }
        if (!form.sections.length) {
            setMessageType('danger');
            setMessage('Sila pilih sekurang-kurangnya satu Seksyen Kesalahan.');
            return;
        }
        setIsSubmitting(true);
        setMessage('');
        setMessageType('');

        const payload = new FormData();
        payload.append('location', form.location);
        payload.append('incident_date', form.incidentDate);
        payload.append('other_section', form.otherSection || '');
        payload.append('notes', form.notes || '');
        payload.append('status', 'draf');
        payload.append('oyds', JSON.stringify(
            oydsList.map((row) => ({
                id: row.id,
                name: row.name,
                ic_number: row.ic,
                phone: row.phone,
                address: row.address,
            }))
        ));
        form.sections.forEach((sectionId) => {
            payload.append('sections[]', sectionId);
        });
        oydsList.forEach((row, index) => {
            if (!row.photo) {
                return;
            }
            Array.from(row.photo).forEach((file) => {
                payload.append(`oyds_photos[${index}][]`, file);
            });
        });

        const request = mode === 'edit'
            ? axios.put(`${apiUrl}/arahan-beredar/${id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/arahan-beredar`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

        request
            .then(() => {
                setMessageType('success');
                setMessage(mode === 'edit' ? 'Rekod arahan beredar dikemaskini.' : 'Rekod arahan beredar disimpan.');
            })
            .catch((error) => {
                setMessageType('danger');
                setMessage(error?.response?.data?.message || 'Gagal menyimpan rekod.');
            })
            .finally(() => setIsSubmitting(false));
    };

    return (
        <div className="app-complaints">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Rekod Arahan Beredar</span>
                    <h3>Rekod Tindakan Nasihat & Arahan Beredar (AB 2026)</h3>
                    <p>Unit Perundangan dan Kesalahan BPN HQ.</p>
                </div>
                <div className="app-complaints-actions">
                    <button className="app-button" type="button" onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Menyimpan...' : (mode === 'edit' ? 'Kemaskini Rekod' : 'Simpan Rekod')}
                    </button>
                    {mode === 'edit' && (
                        <button
                            className="app-button app-button-ghost"
                            type="button"
                            onClick={() => navigate('/app/arahan-beredar')}
                        >
                            Kembali
                        </button>
                    )}
                </div>
            </div>

            {message && (
                <div className={`app-form-alert app-form-alert-${messageType}`}>
                    {message}
                </div>
            )}

            {isLoading && (
                <div className="app-empty">Memuatkan rekod...</div>
            )}

            {!isLoading && (
            <>
            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Kejadian</h4>
                    <span className="app-pill">Wajib</span>
                </div>
                <div className="app-form-grid">
                    <label className="app-form-field">
                        <span>Lokasi Kejadian</span>
                        <input
                            type="text"
                            placeholder="Masukkan lokasi kejadian"
                            value={form.location}
                            onChange={(event) => setForm({ ...form, location: event.target.value })}
                        />
                    </label>
                    <label className="app-form-field">
                        <span>Tarikh Kejadian</span>
                        <input
                            type="date"
                            value={form.incidentDate}
                            onChange={(event) => setForm({ ...form, incidentDate: event.target.value })}
                        />
                    </label>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Kesalahan</h4>
                    <span className="app-pill">Wajib</span>
                </div>
                <div className="app-form-section">
                    <p>Nyatakan seksyen kesalahan undang-undang yang berkaitan.</p>
                </div>
                <div className="app-checkbox-grid">
                    {sectionOptions.map((option) => (
                        <label key={option.id} className="app-checkbox">
                            <input
                                type="checkbox"
                                checked={form.sections.includes(option.id)}
                                onChange={() => toggleSection(option.id)}
                            />
                            {option.name}
                        </label>
                    ))}
                </div>
                <div className="app-form-grid" style={{ marginTop: '1rem' }}>
                    <label className="app-form-field app-span-full">
                        <span>Lain-lain Kesalahan (sila nyatakan)</span>
                        <input
                            type="text"
                            placeholder="Jika berkaitan"
                            value={form.otherSection}
                            onChange={(event) => setForm({ ...form, otherSection: event.target.value })}
                        />
                    </label>
                    <label className="app-form-field app-span-full">
                        <span>Ulasan PPA Bertugas (jika perlu)</span>
                        <textarea
                            rows={4}
                            placeholder="Catatan tambahan pegawai bertugas"
                            value={form.notes}
                            onChange={(event) => setForm({ ...form, notes: event.target.value })}
                        ></textarea>
                    </label>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat OYDS</h4>
                    <span className="app-pill">Wajib</span>
                </div>
                <div className="app-inline-table app-oyds-table">
                    <div className="app-inline-table-header">
                        <span>Nama OYDS</span>
                        <span>No. K/P</span>
                        <span>No. Telefon</span>
                        <span>Alamat</span>
                        <span>Gambar</span>
                        <span></span>
                    </div>
                    {oydsList.map((row, index) => (
                        <div key={`oyds-${index}`} className="app-inline-table-row">
                            <input
                                type="text"
                                placeholder="Nama penuh"
                                value={row.name}
                                onChange={(event) => updateOyds(index, 'name', event.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="XXXXXX-XX-XXXX"
                                value={row.ic}
                                onChange={(event) => updateOyds(index, 'ic', event.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="No telefon"
                                value={row.phone}
                                onChange={(event) => updateOyds(index, 'phone', event.target.value)}
                            />
                            <input
                                type="text"
                                placeholder="Alamat terkini"
                                value={row.address}
                                onChange={(event) => updateOyds(index, 'address', event.target.value)}
                            />
                            <input
                                type="file"
                                multiple
                                onChange={(event) => updateOyds(index, 'photo', event.target.files)}
                            />
                            {row.media?.length > 0 && (
                                <small className="app-hint">
                                    {row.media.length} fail sedia ada
                                </small>
                            )}
                            <button
                                type="button"
                                className="app-icon-button app-icon-button-danger"
                                onClick={() => removeOyds(index)}
                                title="Buang OYDS"
                                aria-label="Buang OYDS"
                            >
                                <i className="bi bi-trash"></i>
                            </button>
                        </div>
                    ))}
                </div>
                <div className="app-inline-add">
                    <button className="app-button app-button-ghost" type="button" onClick={addOyds}>
                        <i className="bi bi-plus-lg"></i>
                        Tambah OYDS
                    </button>
                </div>
            </div>

            <div className="app-card">
                <div className="app-card-header">
                    <h4>Maklumat Pegawai Bertugas</h4>
                    <span className="app-pill">Auto</span>
                </div>
                <div className="app-form-grid">
                    <div className="app-form-field">
                        <span>Email</span>
                        <div className="app-detail-value">{userEmail}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Nama PPA Bertugas</span>
                        <div className="app-detail-value">{userName}</div>
                    </div>
                    <div className="app-form-field">
                        <span>Seksyen Bertugas</span>
                        <div className="app-detail-value">-</div>
                    </div>
                    <div className="app-form-field">
                        <span>No. KP / No. BPN</span>
                        <div className="app-detail-value">
                            {staffNo !== '-' && staffNo !== '' ? staffNo : staffIc}
                        </div>
                    </div>
                </div>
            </div>
            </>
            )}
        </div>
    );
};

export default ArahanBeredar;
