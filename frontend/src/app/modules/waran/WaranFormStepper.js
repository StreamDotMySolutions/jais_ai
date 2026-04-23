import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/SharedToastProvider';
import InlineAlert from '../../components/SharedInlineAlert';
import AttachmentSection from '../../components/SharedAttachmentSection';
import SharedStaffSelect from '../../components/SharedStaffSelect';

const emptyForm = {
    jenis_waran: '',
    no_ruj_fail: '',
    tarikh_masa_terima: '',
    tahun: '',
    no_kes: '',
    jenis_kes_mal_id: '',
    jenis_kes_mal_lain: '',
    jenis_kes_jenayah_id: '',
    jenis_kes_jenayah_lain: '',
    mahkamah_id: '',
    daerah_id: '',
    emel: '',
    emel_mahkamah: '',
    tarikh_bicara: '',
    nama_okt: '',
    no_kp_okt: '',
    alamat_okt: '',
    telefon_okt: '',
    catatan_pendaftar: '',
    tindakan_oleh_staff_id: '',
    alamat_pejabat: '',
    status: '',
    jumlah_perlaksanaan: '',
    tarikh_masa_perlaksanaan_1: '',
    tarikh_masa_perlaksanaan_2: '',
    tarikh_masa_perlaksanaan_3: '',
    hasil_perlaksanaan_id: '',
    laporan_1: '',
    laporan_2: '',
    catatan_pelaksana: '',
};
const ADD_MAHKAMAH_OPTION = '__add_mahkamah__';
const emptyMahkamahDraft = {
    nama: '',
    daerah_id: '',
    emel: '',
};

const WaranFormStepper = ({ mode = 'create' }) => {
    const toast = useToast();
    const [step, setStep] = useState(1);
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [formData, setFormData] = useState({ ...emptyForm });
    const [isLoading, setIsLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [showMessage, setShowMessage] = useState(false);
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [mahkamahOptions, setMahkamahOptions] = useState([]);
    const [jenisKesMalOptions, setJenisKesMalOptions] = useState([]);
    const [jenisKesJenayahOptions, setJenisKesJenayahOptions] = useState([]);
    const [hasilOptions, setHasilOptions] = useState([]);
    const [attachments, setAttachments] = useState([]);
    const [validationErrors, setValidationErrors] = useState({});
    const [isMahkamahModalOpen, setIsMahkamahModalOpen] = useState(false);
    const [mahkamahDraft, setMahkamahDraft] = useState({ ...emptyMahkamahDraft });
    const [mahkamahDraftErrors, setMahkamahDraftErrors] = useState({});
    const [savingMahkamah, setSavingMahkamah] = useState(false);
    const [openSections, setOpenSections] = useState({
        waran: true,
        mahkamah: true,
        penama: true,
        pelaksana: true,
        hasil: true,
        laporan: true,
        lampiran: true,
    });

    const isEdit = mode === 'edit';

    const laporanText = useMemo(() => {
        if (!formData.laporan_1 && !formData.laporan_2) {
            return '';
        }
        if (!formData.laporan_2) {
            return formData.laporan_1;
        }
        return `${formData.laporan_1}\n\nTAHAP 2\n${formData.laporan_2}`;
    }, [formData.laporan_1, formData.laporan_2]);

    const selectedMalOption = useMemo(() => {
        const idValue = String(formData.jenis_kes_mal_id || '');
        if (!idValue) {
            return null;
        }
        return (jenisKesMalOptions || []).find((item) => String(item.id) === idValue) || null;
    }, [formData.jenis_kes_mal_id, jenisKesMalOptions]);

    const showMalOther = useMemo(() => {
        if (formData.jenis_kes_mal_lain) {
            return true;
        }
        const name = String(selectedMalOption?.nama || '').toLowerCase().trim();
        return name === 'lain-lain' || name === 'lain lain' || name.startsWith('lain');
    }, [formData.jenis_kes_mal_lain, selectedMalOption]);

    const selectedJenayahOption = useMemo(() => {
        const idValue = String(formData.jenis_kes_jenayah_id || '');
        if (!idValue) {
            return null;
        }
        return (jenisKesJenayahOptions || []).find((item) => String(item.id) === idValue) || null;
    }, [formData.jenis_kes_jenayah_id, jenisKesJenayahOptions]);

    const showJenayahOther = useMemo(() => {
        if (formData.jenis_kes_jenayah_lain) {
            return true;
        }
        const name = String(selectedJenayahOption?.nama || '').toLowerCase().trim();
        return name === 'lain-lain' || name === 'lain lain' || name.startsWith('lain');
    }, [formData.jenis_kes_jenayah_lain, selectedJenayahOption]);

    const updateField = (field) => (event) => {
        setValidationErrors((prev) => {
            if (!prev || !prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const updateFieldValue = (field) => (value) => {
        setValidationErrors((prev) => {
            if (!prev || !prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setFormData((prev) => ({
            ...prev,
            [field]: value,
        }));
    };

    const openMahkamahModal = () => {
        setMahkamahDraft({ ...emptyMahkamahDraft, daerah_id: String(formData.daerah_id || '') });
        setMahkamahDraftErrors({});
        setIsMahkamahModalOpen(true);
    };

    const closeMahkamahModal = () => {
        if (savingMahkamah) {
            return;
        }
        setIsMahkamahModalOpen(false);
    };

    const updateMahkamahDraftField = (field) => (event) => {
        const nextValue = event?.target?.value ?? '';
        setMahkamahDraftErrors((prev) => {
            if (!prev || !prev[field]) {
                return prev;
            }
            const next = { ...prev };
            delete next[field];
            return next;
        });
        setMahkamahDraft((prev) => ({
            ...prev,
            [field]: nextValue,
        }));
    };

    const onMahkamahSelectChange = (event) => {
        const value = String(event?.target?.value || '');
        if (value === ADD_MAHKAMAH_OPTION) {
            openMahkamahModal();
            return;
        }
        updateField('mahkamah_id')(event);
    };

    const updateJenisKesMal = (event) => {
        const value = event.target.value;
        // Clear "lain-lain" text when switching away from other.
        const nextOption = (jenisKesMalOptions || []).find((item) => String(item.id) === String(value)) || null;
        const name = String(nextOption?.nama || '').toLowerCase().trim();
        const isOther = name === 'lain-lain' || name === 'lain lain' || name.startsWith('lain');

        setValidationErrors((prev) => {
            if (!prev || (!prev.jenis_kes_mal_id && !prev.jenis_kes_mal_lain)) {
                return prev;
            }
            const next = { ...prev };
            delete next.jenis_kes_mal_id;
            if (!isOther) {
                delete next.jenis_kes_mal_lain;
            }
            return next;
        });

        setFormData((prev) => ({
            ...prev,
            jenis_kes_mal_id: value,
            jenis_kes_mal_lain: isOther ? prev.jenis_kes_mal_lain : '',
        }));
    };

    const updateJenisKesJenayah = (event) => {
        const value = event.target.value;
        // Clear "lain-lain" text when switching away from other.
        const nextOption = (jenisKesJenayahOptions || []).find((item) => String(item.id) === String(value)) || null;
        const name = String(nextOption?.nama || '').toLowerCase().trim();
        const isOther = name === 'lain-lain' || name === 'lain lain' || name.startsWith('lain');

        setValidationErrors((prev) => {
            if (!prev || (!prev.jenis_kes_jenayah_id && !prev.jenis_kes_jenayah_lain)) {
                return prev;
            }
            const next = { ...prev };
            delete next.jenis_kes_jenayah_id;
            if (!isOther) {
                delete next.jenis_kes_jenayah_lain;
            }
            return next;
        });

        setFormData((prev) => ({
            ...prev,
            jenis_kes_jenayah_id: value,
            jenis_kes_jenayah_lain: isOther ? prev.jenis_kes_jenayah_lain : '',
        }));
    };

    const toggleSection = (key) => {
        setOpenSections((prev) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    useEffect(() => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/districts`)
            .then((response) => {
                setDistrictOptions(response?.data?.data || []);
            })
            .catch(() => setDistrictOptions([]));

        axios.get(`${apiUrl}/references/iwaran-jenis-kes`, { params: { kategori: 'mal' } })
            .then((response) => {
                setJenisKesMalOptions(response?.data?.data || []);
            })
            .catch(() => setJenisKesMalOptions([]));

        axios.get(`${apiUrl}/references/iwaran-jenis-kes`, { params: { kategori: 'jenayah' } })
            .then((response) => {
                setJenisKesJenayahOptions(response?.data?.data || []);
            })
            .catch(() => setJenisKesJenayahOptions([]));

        axios.get(`${apiUrl}/references/iwaran-hasil`)
            .then((response) => {
                setHasilOptions(response?.data?.data || []);
            })
            .catch(() => setHasilOptions([]));

        axios.get(`${apiUrl}/references/mahkamah`)
            .then((response) => {
                setMahkamahOptions(response?.data?.data || []);
            })
            .catch(() => setMahkamahOptions([]));
    }, [apiUrl, token]);

    const saveNewMahkamah = () => {
        if (!apiUrl || savingMahkamah) {
            return;
        }

        const localErrors = {};
        const nama = String(mahkamahDraft.nama || '').trim();
        const emel = String(mahkamahDraft.emel || '').trim();
        if (!nama) {
            localErrors.nama = 'Nama mahkamah wajib diisi.';
        }
        if (emel) {
            const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailPattern.test(emel)) {
                localErrors.emel = 'Format emel tidak sah.';
            }
        }
        if (Object.keys(localErrors).length > 0) {
            setMahkamahDraftErrors(localErrors);
            return;
        }

        setSavingMahkamah(true);
        setMahkamahDraftErrors({});

        axios.post(
            `${apiUrl}/references/mahkamah`,
            {
                nama,
                daerah_id: mahkamahDraft.daerah_id ? Number(mahkamahDraft.daerah_id) : null,
                emel: emel || null,
            },
            {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }
        )
            .then((response) => {
                const created = response?.data?.data;
                const createdId = created?.id ? String(created.id) : '';
                const createdName = String(created?.nama || '').trim();
                const createdEmail = String(created?.emel || '').trim();

                setMahkamahOptions((prev) => {
                    const next = Array.isArray(prev) ? [...prev] : [];
                    if (createdId && !next.some((item) => String(item.id) === createdId)) {
                        next.push(created);
                    }
                    return next.sort((a, b) => String(a?.nama || '').localeCompare(String(b?.nama || ''), 'ms', { sensitivity: 'base' }));
                });

                if (createdId) {
                    setFormData((prev) => ({
                        ...prev,
                        mahkamah_id: createdId,
                        emel_mahkamah: prev.emel_mahkamah || createdEmail || '',
                        daerah_id: prev.daerah_id || String(created?.daerah_id || ''),
                    }));
                    setValidationErrors((prev) => {
                        if (!prev) {
                            return prev;
                        }
                        const next = { ...prev };
                        delete next.mahkamah_id;
                        return next;
                    });
                }

                setIsMahkamahModalOpen(false);
                setMahkamahDraft({ ...emptyMahkamahDraft });
                toast.success(response?.data?.message || `Mahkamah "${createdName || nama}" berjaya ditambah.`);
            })
            .catch((err) => {
                const apiErrors = err?.response?.data?.errors || {};
                const nextErrors = {};
                if (Array.isArray(apiErrors?.nama) && apiErrors.nama.length) {
                    nextErrors.nama = apiErrors.nama[0];
                }
                if (Array.isArray(apiErrors?.emel) && apiErrors.emel.length) {
                    nextErrors.emel = apiErrors.emel[0];
                }
                if (Array.isArray(apiErrors?.daerah_id) && apiErrors.daerah_id.length) {
                    nextErrors.daerah_id = apiErrors.daerah_id[0];
                }
                if (Object.keys(nextErrors).length > 0) {
                    setMahkamahDraftErrors(nextErrors);
                }
                toast.error(err?.response?.data?.message || 'Gagal tambah mahkamah.');
            })
            .finally(() => {
                setSavingMahkamah(false);
            });
    };

    useEffect(() => {
        if (!isEdit || !apiUrl || !id) {
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/i-waran/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => {
                const data = response?.data?.data;
                if (!data) {
                    return;
                }
                setFormData((prev) => ({
                    ...prev,
                    jenis_waran: data.jenis_waran || '',
                    no_ruj_fail: data.no_ruj_fail || '',
                    tarikh_masa_terima: data.tarikh_masa_terima || '',
                    tahun: data.tahun || '',
                    no_kes: data.no_kes || '',
                    jenis_kes_mal_id: data.jenis_kes_mal_id || '',
                    jenis_kes_mal_lain: data.jenis_kes_mal_lain || '',
                    jenis_kes_jenayah_id: data.jenis_kes_jenayah_id || '',
                    jenis_kes_jenayah_lain: data.jenis_kes_jenayah_lain || '',
                    mahkamah_id: data.mahkamah_id || '',
                    daerah_id: data.daerah_id || '',
                    emel: data.emel || '',
                    emel_mahkamah: data.emel_mahkamah || '',
                    tarikh_bicara: data.tarikh_bicara || '',
                    nama_okt: data.nama_okt || '',
                    no_kp_okt: data.no_kp_okt || '',
                    alamat_okt: data.alamat_okt || '',
                    telefon_okt: data.telefon_okt || '',
                    catatan_pendaftar: data.catatan_pendaftar || '',
                    tindakan_oleh_staff_id: data.tindakan_oleh_staff_id || '',
                    alamat_pejabat: data.alamat_pejabat || '',
                    status: data.status || '',
                    jumlah_perlaksanaan: data.jumlah_perlaksanaan || '',
                    tarikh_masa_perlaksanaan_1: data.tarikh_masa_perlaksanaan_1 || '',
                    tarikh_masa_perlaksanaan_2: data.tarikh_masa_perlaksanaan_2 || '',
                    tarikh_masa_perlaksanaan_3: data.tarikh_masa_perlaksanaan_3 || '',
                    hasil_perlaksanaan_id: data.hasil_perlaksanaan_id || '',
                    laporan_1: data.laporan || '',
                    laporan_2: '',
                    catatan_pelaksana: data.catatan_pelaksana || '',
                }));
                setAttachments(Array.isArray(data.attachments) ? data.attachments : []);
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan waran.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, isEdit, token]);

    const validateForStep = (targetStep) => {
        const errors = {};

        if (targetStep === 1) {
            if (!formData.jenis_waran) {
                errors.jenis_waran = 'Jenis waran wajib dipilih.';
            }
            if (!formData.mahkamah_id) {
                errors.mahkamah_id = 'Mahkamah wajib dipilih.';
            }
            if (!formData.daerah_id) {
                errors.daerah_id = 'Daerah wajib dipilih.';
            }
            if (!formData.tarikh_bicara) {
                errors.tarikh_bicara = 'Tarikh perbicaraan wajib diisi.';
            }
            if (!formData.nama_okt) {
                errors.nama_okt = 'Nama OKT wajib diisi.';
            }
        }

        if (targetStep === 2) {
            if (!formData.tindakan_oleh_staff_id) {
                errors.tindakan_oleh_staff_id = 'Tindakan oleh wajib dipilih.';
            }
            if (!formData.status) {
                errors.status = 'Status wajib dipilih.';
            }
        }

        return errors;
    };

    const handleSubmit = (options = {}) => {
        if (!apiUrl) {
            return;
        }
        if (saving) {
            return;
        }

        const errors = step === 2
            ? { ...validateForStep(1), ...validateForStep(2) }
            : validateForStep(step);
        if (Object.keys(errors).length) {
            setValidationErrors(errors);
            setError('Sila lengkapkan medan wajib yang ditanda *.');
            setMessage('');
            return;
        }

        setSaving(true);
        setShowMessage(false);
        setMessage('');
        setError('');
        const payload = {
            ...formData,
            laporan: laporanText,
        };
        delete payload.laporan_1;
        delete payload.laporan_2;

        const request = isEdit
            ? axios.put(`${apiUrl}/i-waran/${id}`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            })
            : axios.post(`${apiUrl}/i-waran`, payload, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });

        request
            .then((response) => {
                setMessage(response?.data?.message || 'Waran disimpan.');
                setShowMessage(true);
                toast.success(response?.data?.message || (isEdit ? 'Waran dikemaskini.' : 'Waran disimpan.'));
                if (options.nextStep) {
                    setStep(options.nextStep);
                }
                if (!isEdit) {
                    const createdId = response?.data?.data?.id;
                    if (createdId) {
                        navigate(`/app/i-waran/${createdId}/edit`);
                        return;
                    }
                    setFormData({ ...emptyForm });
                    setStep(1);
                }
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal menyimpan waran.');
                toast.error(err?.response?.data?.message || 'Gagal menyimpan waran.');
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className="app-waran">
            <div className="app-waran-header">
                <div>
                    <Link className="app-back" to="/app/i-waran">
                        <i className="bi bi-arrow-left"></i>
                        Kembali ke Senarai
                    </Link>
                    <span className="app-eyebrow">i-WARAN</span>
                    <h3>{isEdit ? 'Kemaskini Waran' : 'Borang Pendaftaran Waran (Stepper)'}</h3>
                    <p>{isEdit ? 'Kemaskini maklumat waran yang dipilih.' : 'Lengkapkan maklumat mengikut turutan untuk simpan rekod waran.'}</p>
                </div>
            </div>

            <div className="app-card app-waran-section">
                {isLoading && <div className="app-empty">Memuatkan waran...</div>}
                {error && !isLoading && (
                    <InlineAlert type="error" message={error} dismissible onClose={() => setError('')} />
                )}
                {!isLoading && message && showMessage && (
                    <InlineAlert
                        type="success"
                        message={message}
                        dismissible
                        onClose={() => setShowMessage(false)}
                    />
                )}
                <div className="app-stepper">
                    <button
                        type="button"
                        className={`app-step ${step === 1 ? 'active' : ''}`}
                        onClick={() => setStep(1)}
                    >
                        <span className="app-step-number">1</span>
                        Pendaftar Waran
                    </button>
                    <button
                        type="button"
                        className={`app-step ${step === 2 ? 'active' : ''}`}
                        onClick={() => setStep(2)}
                    >
                        <span className="app-step-number">2</span>
                        Pelaksana Waran
                    </button>
                </div>

                {step === 1 && (
                    <div className="app-step-body app-step-body-sticky">
                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('waran')}>
                                <span>Butiran Waran</span>
                                <i className={`bi ${openSections.waran ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.waran && (
                                <div className="app-accordion-body app-form-grid">
                                    <div className="app-form-field span-2">
                                        <label>Jenis Waran *</label>
                                        <div className="app-radio-row">
                                        <label className={`app-radio-card ${validationErrors.jenis_waran ? 'app-input-error' : ''}`}>
                                            <input
                                                type="radio"
                                                name="jenis_waran_step"
                                                value="tangkap"
                                                checked={formData.jenis_waran === 'tangkap'}
                                                onChange={updateField('jenis_waran')}
                                            />
                                            Waran Tangkap
                                        </label>
                                        <label className={`app-radio-card ${validationErrors.jenis_waran ? 'app-input-error' : ''}`}>
                                            <input
                                                type="radio"
                                                name="jenis_waran_step"
                                                value="geledah"
                                                checked={formData.jenis_waran === 'geledah'}
                                                onChange={updateField('jenis_waran')}
                                            />
                                            Waran Geledah
                                        </label>
                                    </div>
                                    {validationErrors.jenis_waran && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.jenis_waran}</small>
                                    )}
                                </div>
                                <div className="app-form-field">
                                    <label>No. Ruj Fail Waran</label>
                                    <input type="text" placeholder="Contoh: 494" value={formData.no_ruj_fail} onChange={updateField('no_ruj_fail')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Tarikh / Masa Waran Diterima</label>
                                    <input type="datetime-local" value={formData.tarikh_masa_terima} onChange={updateField('tarikh_masa_terima')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Tahun</label>
                                    <input type="number" placeholder="2026" value={formData.tahun} onChange={updateField('tahun')} />
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('mahkamah')}>
                                <span>Butiran Mahkamah</span>
                                <i className={`bi ${openSections.mahkamah ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.mahkamah && (
                                <div className="app-accordion-body app-form-grid">
                                    <div className="app-form-field">
                                        <label>Nombor Kes</label>
                                        <input type="text" placeholder="Contoh: 2505-L0510-651-0418" value={formData.no_kes} onChange={updateField('no_kes')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Jenis Kesalahan (Mal)</label>
                                    <select value={formData.jenis_kes_mal_id} onChange={updateJenisKesMal}>
                                        <option value="">Pilih kesalahan</option>
                                        {jenisKesMalOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                {showMalOther && (
                                    <div className="app-form-field">
                                        <label>Lain-lain Kes (Mal)</label>
                                        <input
                                            type="text"
                                            placeholder="Nyatakan jika pilih lain-lain"
                                            value={formData.jenis_kes_mal_lain}
                                            onChange={updateField('jenis_kes_mal_lain')}
                                        />
                                    </div>
                                )}
                                <div className="app-form-field">
                                    <label>Jenis Kesalahan (Jenayah)</label>
                                    <select value={formData.jenis_kes_jenayah_id} onChange={updateJenisKesJenayah}>
                                        <option value="">Pilih kesalahan</option>
                                        {jenisKesJenayahOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                {showJenayahOther && (
                                    <div className="app-form-field">
                                        <label>Lain-lain Kes (Jenayah)</label>
                                        <input
                                            type="text"
                                            placeholder="Nyatakan jika pilih lain-lain"
                                            value={formData.jenis_kes_jenayah_lain}
                                            onChange={updateField('jenis_kes_jenayah_lain')}
                                        />
                                    </div>
                                )}
                                <div className="app-form-field">
                                    <label>Mahkamah *</label>
                                    <select className={validationErrors.mahkamah_id ? 'app-input-error' : ''} value={formData.mahkamah_id} onChange={onMahkamahSelectChange}>
                                        <option value="">Pilih mahkamah</option>
                                        {mahkamahOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                        <option value={ADD_MAHKAMAH_OPTION}>+ Tambah Mahkamah</option>
                                    </select>
                                    {validationErrors.mahkamah_id && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.mahkamah_id}</small>
                                    )}
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Daerah *</label>
                                    <div className="app-radio-row">
                                        {districtOptions.map((district) => (
                                            <label key={district.id} className={`app-radio-card is-compact ${validationErrors.daerah_id ? 'app-input-error' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="daerah_step"
                                                    value={district.id}
                                                    checked={String(formData.daerah_id) === String(district.id)}
                                                    onChange={updateField('daerah_id')}
                                                />
                                                {district.name}
                                            </label>
                                        ))}
                                    </div>
                                    {validationErrors.daerah_id && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.daerah_id}</small>
                                    )}
                                </div>
                                <div className="app-form-field">
                                    <label>Email</label>
                                    <input type="email" placeholder="nama@domain.gov.my" value={formData.emel} onChange={updateField('emel')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Email Mahkamah</label>
                                    <input type="email" placeholder="mahkamah@domain.gov.my" value={formData.emel_mahkamah} onChange={updateField('emel_mahkamah')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Tarikh Perbicaraan *</label>
                                    <input type="date" className={validationErrors.tarikh_bicara ? 'app-input-error' : ''} value={formData.tarikh_bicara} onChange={updateField('tarikh_bicara')} />
                                    {validationErrors.tarikh_bicara && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.tarikh_bicara}</small>
                                    )}
                                </div>
                                <div className="app-form-field">
                                    <label>Waran</label>
                                    <div className="app-detail-note">Gunakan seksyen Lampiran untuk muat naik PDF/gambar waran.</div>
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Catatan Pendaftar</label>
                                    <textarea rows="3" value={formData.catatan_pendaftar} onChange={updateField('catatan_pendaftar')} />
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('penama')}>
                                <span>Butiran Penama</span>
                                <i className={`bi ${openSections.penama ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.penama && (
                                <div className="app-accordion-body app-form-grid">
                                    <div className="app-form-field span-2">
                                        <label>Nama OKT *</label>
                                        <input type="text" className={validationErrors.nama_okt ? 'app-input-error' : ''} placeholder="Nama penuh" value={formData.nama_okt} onChange={updateField('nama_okt')} />
                                        {validationErrors.nama_okt && (
                                            <small className="app-inline-note app-inline-note-error">{validationErrors.nama_okt}</small>
                                        )}
                                </div>
                                <div className="app-form-field">
                                    <label>Kad Pengenalan / Passport</label>
                                    <input type="text" placeholder="950117055451" value={formData.no_kp_okt} onChange={updateField('no_kp_okt')} />
                                </div>
                                <div className="app-form-field">
                                    <label>No. Telefon</label>
                                    <input type="text" placeholder="01X-XXXXXXX" value={formData.telefon_okt} onChange={updateField('telefon_okt')} />
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Alamat</label>
                                    <textarea rows="3" placeholder="Alamat penuh" value={formData.alamat_okt} onChange={updateField('alamat_okt')}></textarea>
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('lampiran')}>
                                <span>Lampiran</span>
                                <i className={`bi ${openSections.lampiran ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.lampiran && (
                                <div className="app-accordion-body">
                                    <AttachmentSection
                                        apiUrl={apiUrl}
                                        token={token}
                                        recordId={id}
                                        attachments={attachments}
                                        onAttachmentsChange={setAttachments}
                                        label="Muat naik fail (PDF/JPG/PNG)"
                                        accept=".pdf,image/png,image/jpeg"
                                        canUpload
                                        canDelete
                                        maxFiles={20}
                                        maxSizeMb={50}
                                    />
                                </div>
                            )}
                        </div>

                        <div className="app-form-actions app-actions-sticky">
                            <button type="button" className="app-button" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Menyimpan...' : (isEdit ? 'Kemaskini' : 'Simpan')}
                            </button>
                            <button
                                type="button"
                                className="app-button app-button-outline"
                                onClick={() => handleSubmit({ nextStep: 2 })}
                                disabled={saving}
                            >
                                Seterusnya
                            </button>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="app-step-body app-step-body-sticky">
                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('pelaksana')}>
                                <span>Laporan Perlaksanaan</span>
                                <i className={`bi ${openSections.pelaksana ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.pelaksana && (
                                <div className="app-accordion-body app-form-grid">
                                <div className="app-form-field">
                                    <label>Tindakan Oleh *</label>
                                    <SharedStaffSelect
                                        apiUrl={apiUrl}
                                        token={token}
                                        value={formData.tindakan_oleh_staff_id}
                                        onChange={updateFieldValue('tindakan_oleh_staff_id')}
                                        placeholder="Pilih pegawai"
                                        searchable
                                        searchPlaceholder="Cari pegawai..."
                                        disabled={saving}
                                        className={validationErrors.tindakan_oleh_staff_id ? 'app-input-error' : ''}
                                    />
                                    {validationErrors.tindakan_oleh_staff_id && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.tindakan_oleh_staff_id}</small>
                                    )}
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Alamat Pejabat</label>
                                    <textarea rows="2" placeholder="Alamat pejabat" value={formData.alamat_pejabat} onChange={updateField('alamat_pejabat')}></textarea>
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Status *</label>
                                    <div className="app-radio-row">
                                        {[
                                            { label: 'Berjaya', value: 'berjaya' },
                                            { label: 'Tidak Berjaya', value: 'tidak_berjaya' },
                                            { label: 'Dalam Proses', value: 'dalam_proses' },
                                            { label: 'Kembalian', value: 'kembalian' },
                                        ].map((item) => (
                                            <label key={item.value} className={`app-radio-card ${validationErrors.status ? 'app-input-error' : ''}`}>
                                                <input
                                                    type="radio"
                                                    name="status_step"
                                                    value={item.value}
                                                    checked={formData.status === item.value}
                                                    onChange={updateField('status')}
                                                />
                                                {item.label}
                                            </label>
                                        ))}
                                    </div>
                                    {validationErrors.status && (
                                        <small className="app-inline-note app-inline-note-error">{validationErrors.status}</small>
                                    )}
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Jumlah Perlaksanaan</label>
                                    <div className="app-radio-row">
                                        {[1, 2, 3].map((value) => (
                                            <label key={value} className="app-radio-card">
                                                <input
                                                    type="radio"
                                                    name="jumlah_step"
                                                    value={value}
                                                    checked={String(formData.jumlah_perlaksanaan) === String(value)}
                                                    onChange={updateField('jumlah_perlaksanaan')}
                                                />
                                                {value} Kali
                                            </label>
                                        ))}
                                    </div>
                                </div>
                                <div className="app-form-field">
                                    <label>Tarikh / Masa Perlaksanaan (Pertama)</label>
                                    <input type="datetime-local" value={formData.tarikh_masa_perlaksanaan_1} onChange={updateField('tarikh_masa_perlaksanaan_1')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Tarikh / Masa Perlaksanaan (Kedua)</label>
                                    <input type="datetime-local" value={formData.tarikh_masa_perlaksanaan_2} onChange={updateField('tarikh_masa_perlaksanaan_2')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Tarikh / Masa Perlaksanaan (Ketiga)</label>
                                    <input type="datetime-local" value={formData.tarikh_masa_perlaksanaan_3} onChange={updateField('tarikh_masa_perlaksanaan_3')} />
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('hasil')}>
                                <span>Hasil Perlaksanaan</span>
                                <i className={`bi ${openSections.hasil ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.hasil && (
                                <div className="app-accordion-body app-radio-grid">
                                    {hasilOptions.map((item) => (
                                        <label key={item.id} className="app-radio-card is-compact">
                                            <input
                                            type="radio"
                                            name="hasil_step"
                                            value={item.id}
                                            checked={String(formData.hasil_perlaksanaan_id) === String(item.id)}
                                            onChange={updateField('hasil_perlaksanaan_id')}
                                        />
                                        {item.nama}
                                    </label>
                                ))}
                                </div>
                            )}
                        </div>

                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('laporan')}>
                                <span>Laporan</span>
                                <i className={`bi ${openSections.laporan ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.laporan && (
                                <div className="app-accordion-body app-form-grid">
                                    <div className="app-form-field span-2">
                                        <label>Laporan Tahap 1</label>
                                        <textarea rows="5" placeholder="Catatan tahap 1" value={formData.laporan_1} onChange={updateField('laporan_1')}></textarea>
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Laporan Tahap 2</label>
                                    <textarea rows="5" placeholder="Catatan tahap 2" value={formData.laporan_2} onChange={updateField('laporan_2')}></textarea>
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Catatan Pelaksana</label>
                                    <textarea rows="3" placeholder="Catatan tambahan" value={formData.catatan_pelaksana} onChange={updateField('catatan_pelaksana')}></textarea>
                                </div>
                                </div>
                            )}
                        </div>

                        <div className="app-form-actions app-actions-sticky">
                            <button type="button" className="app-button" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Menyimpan...' : (isEdit ? 'Kemaskini' : 'Simpan')}
                            </button>
                            <button type="button" className="app-button app-button-ghost" onClick={() => setStep(1)}>
                                Kembali
                            </button>
                        </div>
                    </div>
                )}
            </div>
            {isMahkamahModalOpen && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={closeMahkamahModal}></div>
                    <div className="app-modal-content">
                        <div className="app-modal-header">
                            <h4>Tambah Mahkamah</h4>
                            <p>Mahkamah baru akan terus dipilih selepas simpan.</p>
                            <button className="app-modal-close" onClick={closeMahkamahModal} disabled={savingMahkamah}>
                                &times;
                            </button>
                        </div>
                        <div className="app-modal-body">
                            <div className="app-form-field">
                                <label>Nama Mahkamah *</label>
                                <input
                                    type="text"
                                    value={mahkamahDraft.nama}
                                    onChange={updateMahkamahDraftField('nama')}
                                    className={mahkamahDraftErrors.nama ? 'app-input-error' : ''}
                                    placeholder="Contoh: Mahkamah Rendah Syariah Shah Alam"
                                />
                                {mahkamahDraftErrors.nama && (
                                    <small className="app-inline-note app-inline-note-error">{mahkamahDraftErrors.nama}</small>
                                )}
                            </div>
                            <div className="app-form-field">
                                <label>Daerah</label>
                                <select
                                    value={mahkamahDraft.daerah_id}
                                    onChange={updateMahkamahDraftField('daerah_id')}
                                    className={mahkamahDraftErrors.daerah_id ? 'app-input-error' : ''}
                                >
                                    <option value="">Pilih daerah</option>
                                    {districtOptions.map((district) => (
                                        <option key={district.id} value={district.id}>{district.name}</option>
                                    ))}
                                </select>
                                {mahkamahDraftErrors.daerah_id && (
                                    <small className="app-inline-note app-inline-note-error">{mahkamahDraftErrors.daerah_id}</small>
                                )}
                            </div>
                            <div className="app-form-field">
                                <label>Emel Mahkamah</label>
                                <input
                                    type="email"
                                    value={mahkamahDraft.emel}
                                    onChange={updateMahkamahDraftField('emel')}
                                    className={mahkamahDraftErrors.emel ? 'app-input-error' : ''}
                                    placeholder="mahkamah@domain.gov.my"
                                />
                                {mahkamahDraftErrors.emel && (
                                    <small className="app-inline-note app-inline-note-error">{mahkamahDraftErrors.emel}</small>
                                )}
                            </div>
                        </div>
                        <div className="app-modal-footer">
                            <button type="button" className="app-button app-button-ghost" onClick={closeMahkamahModal} disabled={savingMahkamah}>
                                Batal
                            </button>
                            <button type="button" className="app-button" onClick={saveNewMahkamah} disabled={savingMahkamah}>
                                {savingMahkamah ? 'Menyimpan...' : 'Simpan Mahkamah'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WaranFormStepper;
