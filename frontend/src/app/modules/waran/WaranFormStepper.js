import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const emptyForm = {
    jenis_waran: '',
    no_ruj_fail: '',
    tarikh_masa_terima: '',
    tahun: '',
    no_kes: '',
    jenis_kes_mal_id: '',
    jenis_kes_jenayah_id: '',
    mahkamah_id: '',
    daerah_id: '',
    emel: '',
    emel_mahkamah: '',
    tarikh_bicara: '',
    fail_waran: '',
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

const WaranFormStepper = ({ mode = 'create' }) => {
    const [step, setStep] = useState(1);
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [formData, setFormData] = useState({ ...emptyForm });
    const [isLoading, setIsLoading] = useState(mode === 'edit');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [districtOptions, setDistrictOptions] = useState([]);
    const [mahkamahOptions, setMahkamahOptions] = useState([]);
    const [jenisKesMalOptions, setJenisKesMalOptions] = useState([]);
    const [jenisKesJenayahOptions, setJenisKesJenayahOptions] = useState([]);
    const [hasilOptions, setHasilOptions] = useState([]);
    const [staffOptions, setStaffOptions] = useState([]);
    const [openSections, setOpenSections] = useState({
        waran: true,
        mahkamah: true,
        penama: true,
        pelaksana: true,
        hasil: true,
        laporan: true,
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

    const updateField = (field) => (event) => {
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
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

        axios.get(`${apiUrl}/staff/options`)
            .then((response) => {
                setStaffOptions(response?.data?.data || []);
            })
            .catch(() => setStaffOptions([]));
    }, [apiUrl]);

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
                    jenis_kes_jenayah_id: data.jenis_kes_jenayah_id || '',
                    mahkamah_id: data.mahkamah_id || '',
                    daerah_id: data.daerah_id || '',
                    emel: data.emel || '',
                    emel_mahkamah: data.emel_mahkamah || '',
                    tarikh_bicara: data.tarikh_bicara || '',
                    fail_waran: data.fail_waran || '',
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
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan waran.');
            })
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, isEdit, token]);

    const handleSubmit = (options = {}) => {
        if (!apiUrl) {
            return;
        }
        if (saving) {
            return;
        }
        setSaving(true);
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
                if (options.nextStep) {
                    setStep(options.nextStep);
                }
                if (!isEdit) {
                    setFormData({ ...emptyForm });
                    setStep(1);
                }
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal menyimpan waran.');
            })
            .finally(() => setSaving(false));
    };

    return (
        <div className="app-waran">
            <div className="app-waran-header">
                <div>
                    <span className="app-eyebrow">i-WARAN</span>
                    <h3>{isEdit ? 'Kemaskini Waran' : 'Borang Pendaftaran Waran (Stepper)'}</h3>
                    <p>{isEdit ? 'Kemaskini maklumat waran yang dipilih.' : 'Lengkapkan maklumat mengikut turutan untuk simpan rekod waran.'}</p>
                </div>
            </div>

            <div className="app-card app-waran-section">
                {isLoading && <div className="app-empty">Memuatkan waran...</div>}
                {error && !isLoading && <div className="app-empty">{error}</div>}
                {!isLoading && message && <div className="app-success">{message}</div>}
                <div className="app-stepper">
                    <button
                        type="button"
                        className={`app-step ${step === 1 ? 'active' : ''}`}
                        onClick={() => setStep(1)}
                    >
                        <span>1</span>
                        Pendaftar Waran
                    </button>
                    <button
                        type="button"
                        className={`app-step ${step === 2 ? 'active' : ''}`}
                        onClick={() => setStep(2)}
                    >
                        <span>2</span>
                        Pelaksana Waran
                    </button>
                </div>

                {step === 1 && (
                    <div className="app-step-body">
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
                                        <label className="app-radio-card">
                                            <input
                                                type="radio"
                                                name="jenis_waran_step"
                                                value="tangkap"
                                                checked={formData.jenis_waran === 'tangkap'}
                                                onChange={updateField('jenis_waran')}
                                            />
                                            Waran Tangkap
                                        </label>
                                        <label className="app-radio-card">
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
                                    <select value={formData.jenis_kes_mal_id} onChange={updateField('jenis_kes_mal_id')}>
                                        <option value="">Pilih kesalahan</option>
                                        {jenisKesMalOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="app-form-field">
                                    <label>Jenis Kesalahan (Jenayah)</label>
                                    <select value={formData.jenis_kes_jenayah_id} onChange={updateField('jenis_kes_jenayah_id')}>
                                        <option value="">Pilih kesalahan</option>
                                        {jenisKesJenayahOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="app-form-field">
                                    <label>Mahkamah *</label>
                                    <select value={formData.mahkamah_id} onChange={updateField('mahkamah_id')}>
                                        <option value="">Pilih mahkamah</option>
                                        {mahkamahOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.nama}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="app-form-field span-2">
                                    <label>Daerah *</label>
                                    <div className="app-radio-row">
                                        {districtOptions.map((district) => (
                                            <label key={district.id} className="app-radio-card is-compact">
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
                                    <input type="date" value={formData.tarikh_bicara} onChange={updateField('tarikh_bicara')} />
                                </div>
                                <div className="app-form-field">
                                    <label>Muat Naik Waran</label>
                                    <input type="text" placeholder="Fail waran (path)" value={formData.fail_waran} onChange={updateField('fail_waran')} />
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
                                        <input type="text" placeholder="Nama penuh" value={formData.nama_okt} onChange={updateField('nama_okt')} />
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

                        <div className="app-form-actions">
                            <button type="button" className="app-button" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan Pendaftar'}
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
                    <div className="app-step-body">
                        <div className="app-accordion">
                            <button type="button" className="app-accordion-header" onClick={() => toggleSection('pelaksana')}>
                                <span>Laporan Perlaksanaan</span>
                                <i className={`bi ${openSections.pelaksana ? 'bi-chevron-up' : 'bi-chevron-down'}`}></i>
                            </button>
                            {openSections.pelaksana && (
                                <div className="app-accordion-body app-form-grid">
                                    <div className="app-form-field">
                                        <label>Tindakan Oleh *</label>
                                        <select value={formData.tindakan_oleh_staff_id} onChange={updateField('tindakan_oleh_staff_id')}>
                                        <option value="">Pilih pegawai</option>
                                        {staffOptions.map((item) => (
                                            <option key={item.id} value={item.id}>{item.name}</option>
                                        ))}
                                    </select>
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
                                            <label key={item.value} className="app-radio-card">
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

                        <div className="app-form-actions">
                            <button type="button" className="app-button app-button-ghost" onClick={() => setStep(1)}>
                                Kembali
                            </button>
                            <button type="button" className="app-button" onClick={handleSubmit} disabled={saving}>
                                {saving ? 'Menyimpan...' : 'Simpan Pelaksana'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaranFormStepper;
