import { useEffect, useState } from 'react';
import { Row, Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputSelect, InputText, InputTextarea } from '../../../libs/FormInput';
import SubmitButton from '../../../libs/SubmitButton';

function ComplaintForm({ onSuccess, showSuccessMessage = true, channelSource = 'portal' }) {
    const store = useStore();
    const url = process.env.REACT_APP_API_URL;
    const [isLoading, setIsLoading] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [success, setSuccess] = useState(false);
    const [referenceNo, setReferenceNo] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [summaryTemplate, setSummaryTemplate] = useState('');

    useEffect(() => {
        store.emptyData();

        const now = new Date();
        const year = now.getFullYear();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5);
        store.setValue('complaint_year', year);
        store.setValue('complaint_date', date);
        store.setValue('complaint_time', time);
        store.setValue('reference_no', 'Akan dijana sistem');
        store.setValue('case_type', 'AJ');
    }, []);

    useEffect(() => {
        if (!url) {
            return;
        }

        axios.get(`${url}/districts`)
            .then(response => {
                const data = response?.data?.data || [];
                setDistrictOptions(data);
            })
            .catch(error => {
                console.warn('Failed to load districts', error?.message);
            });
    }, [url]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        store.setValue('errors', null);
        setErrorMessage('');

        const formData = new FormData();
        const dataArray = [
            { key: 'complainant_name', value: store.getValue('complainant_name') },
            { key: 'identification_number', value: store.getValue('identification_number') },
            { key: 'contact_number', value: store.getValue('contact_number') },
            { key: 'address', value: store.getValue('address') },
            { key: 'district_id', value: store.getValue('district_id') },
            { key: 'summary', value: store.getValue('summary') },
            { key: 'case_type', value: store.getValue('case_type') || 'AJ' },
            { key: 'channel', value: channelSource },
        ];

        appendFormData(formData, dataArray);

        const token = localStorage.getItem('token');

        axios({
            method: 'post',
            url: `${url}/complaints`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
        .then(response => {
            console.log(response);
            setReferenceNo(response?.data?.reference_no || '');
            setSuccess(true);
            if (onSuccess) {
                onSuccess();
            }
        })
        .catch(error => {
            if (error.response?.status == 422) {
                store.setValue('errors', error.response.data.errors);
            }
            setErrorMessage(error.response?.data?.message || error.message || 'Gagal menghantar aduan.');
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    if (success && showSuccessMessage) {
        return (
            <div className="complaint-card complaint-card-success">
                <div className="complaint-success-icon">
                    <i className="bi bi-check2-circle"></i>
                </div>
                <div>
                    <h2>Terima Kasih!</h2>
                    <p>Aduan anda telah berjaya dihantar. Kami akan memproses aduan anda secepat mungkin.</p>
                    {referenceNo && (
                        <div className="complaint-ref">
                            No Aduan anda: <strong>{referenceNo}</strong>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (success && !showSuccessMessage) {
        return null;
    }

    const caseType = store.getValue('case_type') || 'AJ';
    const templatesByCaseType = {
        AJ: [
            { key: 'aj_aduan_biasa', label: 'Aduan biasa' },
            { key: 'aj_bersekedudukan', label: 'Bersekedudukan' },
            { key: 'aj_rumah_urut', label: 'Rumah urut' },
            { key: 'aj_hotel', label: 'Hotel' },
            { key: 'aj_pasangan_bercerai', label: 'Pasangan bercerai' },
            { key: 'aj_nikah_tanpa_kebenaran', label: 'Pernikahan tanpa kebenaran' },
        ],
        AK: [
            { key: 'ak_poligami_tanpa_kebenaran', label: 'Poligami tanpa kebenaran' },
            { key: 'ak_cerai_luar_mahkamah', label: 'Cerai luar mahkamah / lafaz cerai' },
            { key: 'ak_rujuk_tidak_lapor', label: 'Rujuk tapi tidak lapor' },
            { key: 'ak_lewat_daftar_kahwin', label: 'Lewat daftar perkahwinan / tak daftar nikah' },
            { key: 'ak_nikah_tanpa_kebenaran', label: 'Nikah tanpa kebenaran (contoh nikah luar negara)' },
            { key: 'ak_lain_lain', label: 'Lain-lain isu keluarga' },
        ],
    };
    const districtName = districtOptions.find((d) => String(d.id) === String(store.getValue('district_id') || ''))?.name || '';
    const shouldLockSummary = Boolean(
        templatesByCaseType[caseType]?.length > 0
        && !summaryTemplate
        && !(store.getValue('summary') || '').trim()
    );

    const buildSummaryTemplate = (key) => {
        const date = store.getValue('complaint_date') || '[TARIKH]';
        const time = store.getValue('complaint_time') || '[MASA]';
        const lokasi = (store.getValue('address') || '').trim() || '[Nama premis/hotel, alamat penuh, bilik (jika ada)]';
        const daerah = districtName || '[Daerah]';

        if (key === 'aj_hotel') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran kejadian:',
                '- Saya nampak seorang lelaki dan seorang perempuan disyaki tiada hubungan mahram / bukan suami isteri.',
                '- Kejadian: [sedang berlaku / sudah berlaku]',
                '- Kenderaan (jika ada): [jenis/warna/no pendaftaran]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'aj_bersekedudukan') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran kejadian:',
                '- Saya mengesyaki seorang lelaki dan seorang perempuan yang bukan mahram / bukan suami isteri tinggal atau berada bersama di lokasi tersebut.',
                '- Kejadian: [sedang berlaku / sudah berlaku / berulang kali]',
                '- Tanda-tanda (jika ada): [contoh: kerap keluar masuk / tinggal serumah / dll]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'aj_rumah_urut') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran kejadian:',
                '- Saya ingin membuat aduan berkaitan premis urut yang disyaki menjalankan aktiviti yang melanggar peraturan/enakmen berkaitan.',
                '- Kejadian: [sedang berlaku / sudah berlaku / berulang kali]',
                '- Tanda-tanda (jika ada): [contoh: promosi tertentu / waktu operasi / pengunjung / dll]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'aj_pasangan_bercerai') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran kejadian:',
                '- Saya ingin membuat aduan berkaitan pasangan yang telah bercerai tetapi disyaki tinggal/bergaul seperti suami isteri tanpa rujuk yang sah.',
                '- Kejadian: [sedang berlaku / sudah berlaku / berulang kali]',
                '- Maklumat yang diketahui (jika ada): [nama / hubungan / status cerai / dll]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'aj_nikah_tanpa_kebenaran') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran kejadian:',
                '- Saya ingin membuat aduan berkaitan pernikahan tanpa kebenaran / nikah luar yang disyaki berlaku.',
                '- Kejadian: [sedang berlaku / sudah berlaku]',
                '- Maklumat yang diketahui (jika ada): [nama pihak terlibat / tarikh nikah / tempat / saksi / dll]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'aj_aduan_biasa') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan:',
                '- [ceritakan ringkas apa yang berlaku]',
                '- Kejadian: [sedang berlaku / sudah berlaku]',
                '- Individu terlibat (jika ada): [lelaki/perempuan/nama jika diketahui]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_poligami_tanpa_kebenaran') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Poligami tanpa kebenaran):',
                '- Saya mengesyaki suami/individu telah berkahwin lain tanpa kebenaran Mahkamah.',
                '- Nama pihak terlibat: [nama suami/individu], [nama isteri pertama], [nama isteri kedua jika diketahui]',
                '- Tarikh pernikahan (jika diketahui): [__]',
                '- Tempat pernikahan (jika diketahui): [__]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_cerai_luar_mahkamah') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Cerai luar mahkamah / lafaz cerai):',
                '- Saya ingin membuat aduan berkaitan lafaz cerai yang berlaku di luar Mahkamah.',
                '- Tarikh lafaz (jika diketahui): [__]',
                '- Tempat lafaz (jika diketahui): [__]',
                '- Lafaz/Butiran ringkas: [__]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_rujuk_tidak_lapor') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Rujuk tapi tidak lapor):',
                '- Saya ingin membuat aduan berkaitan rujuk semula selepas cerai tetapi tidak dilaporkan/ didaftarkan.',
                '- Tarikh rujuk (jika diketahui): [__]',
                '- Bukti/rujukan (jika ada): [No perintah mahkamah / dokumen / dll]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_lewat_daftar_kahwin') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Lewat daftar perkahwinan / tak daftar nikah):',
                '- Saya ingin membuat aduan berkaitan perkahwinan yang tidak/ lewat didaftarkan.',
                '- Tarikh pernikahan (jika diketahui): [__]',
                '- Tempat pernikahan (jika diketahui): [__]',
                '- Status: [tidak daftar / lewat daftar / sedang proses]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_nikah_tanpa_kebenaran') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Nikah tanpa kebenaran):',
                '- Saya ingin membuat aduan berkaitan pernikahan tanpa kebenaran / nikah luar negara.',
                '- Tarikh pernikahan (jika diketahui): [__]',
                '- Tempat pernikahan (jika diketahui): [__]',
                '- Pihak terlibat (jika diketahui): [__]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        if (key === 'ak_lain_lain') {
            return [
                `Tarikh: ${date}`,
                `Masa: ${time}`,
                `Daerah: ${daerah}`,
                `Lokasi: ${lokasi}`,
                '',
                'Butiran aduan (Keluarga):',
                '- [ceritakan ringkas isu keluarga yang berlaku]',
                '- Kejadian: [sedang berlaku / sudah berlaku]',
                '',
                'Maklumat tambahan:',
                '- [apa-apa maklumat lain]',
                '',
                'Saya bersedia memberi kerjasama jika diperlukan.',
            ].join('\n');
        }

        return '';
    };

    const insertSummaryTemplate = () => {
        if (!summaryTemplate) {
            return;
        }
        const next = buildSummaryTemplate(summaryTemplate);
        if (!next) {
            return;
        }
        const existing = (store.getValue('summary') || '').trim();
        if (existing) {
            const ok = window.confirm('Ringkasan Aduan sudah diisi. Anda mahu gantikan dengan template?');
            if (!ok) {
                return;
            }
        }
        store.setValue('summary', next);
    };

    return (
        <div className="complaint-card">
            <div className="complaint-meta">
                <div className="complaint-meta-item">
                    <span>Tahun</span>
                    <strong>{store.getValue('complaint_year')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>No Aduan</span>
                    <strong>{store.getValue('reference_no')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>Tarikh</span>
                    <strong>{store.getValue('complaint_date')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>Masa</span>
                    <strong>{store.getValue('complaint_time')}</strong>
                </div>
            </div>

            <Form onSubmit={handleSubmit}>
                {errorMessage && (
                    <div className="app-form-error">
                        {errorMessage}
                    </div>
                )}
                <div className="complaint-category">
                    <div>
                        <h3>Kategori Aduan</h3>
                        <p>Pilih kategori aduan untuk menentukan kes atau keluarga.</p>
                    </div>
                    <div className="complaint-category-options">
                        {[
                            { value: 'AJ', label: 'KES - Aduan Jenayah (AJ)' },
                            { value: 'AK', label: 'KELUARGA - Aduan Keluarga (AK)' },
                        ].map((option) => (
                            <label
                                key={option.value}
                                className={`complaint-category-card ${store.getValue('case_type') === option.value ? 'active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="case_type"
                                    value={option.value}
                                    checked={store.getValue('case_type') === option.value}
                                    onChange={() => store.setValue('case_type', option.value)}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="complaint-grid">
                    <div className="complaint-section">
                        <h3>Butir-butir Pemberi Maklumat / Pengadu</h3>
                        <Row className='mb-4'>
                            <InputText 
                                fieldName='complainant_name' 
                                placeholder='Nama Pengadu'  
                                icon='bi-person'
                                isLoading={isLoading}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='identification_number' 
                                placeholder='No Kad Pengenalan'  
                                icon='bi-card-text'
                                isLoading={isLoading}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='contact_number' 
                                placeholder='No HP'  
                                icon='bi-phone'
                                isLoading={isLoading}
                            />
                        </Row>
                    </div>

                    <div className="complaint-section">
                        <h3>Maklumat Kejadian</h3>
                        <Row className='mb-4'>
                            <InputSelect
                                fieldName='district_id'
                                placeholder='Pilih Daerah'
                                icon='bi-geo'
                                isLoading={isLoading}
                                options={districtOptions}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputTextarea 
                                type='text'
                                fieldName='address' 
                                placeholder='Alamat'  
                                icon='bi-geo-alt'
                                rows='4'
                                isLoading={isLoading}
                            />
                        </Row>
                    </div>
                </div>

                <div className="complaint-section complaint-span-full">
                    <h3>Ringkasan Aduan</h3>
                    {templatesByCaseType[caseType]?.length > 0 && (
                        <div className="complaint-template">
                            <div className="complaint-template-left">
                                <strong>Kategori Template</strong>
                                <small>
                                    Pilih kategori untuk masukkan contoh format ringkasan aduan.
                                    {shouldLockSummary ? ' Ringkasan akan dibuka selepas kategori dipilih.' : ''}
                                </small>
                            </div>
                            <div className="complaint-template-actions">
                                <Form.Select
                                    value={summaryTemplate}
                                    onChange={(e) => setSummaryTemplate(e.target.value)}
                                    disabled={isLoading}
                                >
                                    <option value="">Pilih template</option>
                                    {templatesByCaseType[caseType].map((t) => (
                                        <option key={t.key} value={t.key}>{t.label}</option>
                                    ))}
                                </Form.Select>
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary"
                                    onClick={insertSummaryTemplate}
                                    disabled={isLoading || !summaryTemplate}
                                >
                                    Masukkan template
                                </button>
                            </div>
                        </div>
                    )}
                    <Row className='mb-4'>
                        <InputTextarea 
                            type='text'
                            fieldName='summary' 
                            placeholder={shouldLockSummary ? 'Sila pilih template aduan dahulu.' : 'Ringkasan Aduan'}
                            icon='bi-pencil'
                            rows='8'
                            isLoading={isLoading}
                            readOnly={shouldLockSummary}
                        />
                    </Row>
                </div>

                <div className="complaint-actions">
                    <SubmitButton isLoading={isLoading} value="Hantar Aduan" />
                </div>
            </Form>
        </div>
    );
}

export default ComplaintForm;
