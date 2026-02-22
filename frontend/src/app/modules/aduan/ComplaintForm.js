import { useEffect, useState } from 'react';
import { Row, Col, Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputSelect, InputText, InputTextarea } from '../../../libs/FormInput';
import SubmitButton from '../../../libs/SubmitButton';
import BORANG5_OFFICER_TEMPLATES from './borang5OfficerTemplates';
import SharedOffenseSelect from '../../components/SharedOffenseSelect';

const escapePdfText = (value = '') => String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');

const buildSimplePdf = (lines = []) => {
    const safeLines = (Array.isArray(lines) ? lines : []).slice(0, 20);
    const lineHeight = 18;
    const startY = 780;
    const contentLines = safeLines.map((line, index) => `1 0 0 1 50 ${startY - (index * lineHeight)} Tm (${escapePdfText(line)}) Tj`).join('\n');
    const stream = `BT\n/F1 14 Tf\n${contentLines}\nET`;
    const streamLength = stream.length;

    const objects = [];
    objects.push('1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj');
    objects.push('2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj');
    objects.push('3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj');
    objects.push(`4 0 obj << /Length ${streamLength} >> stream\n${stream}\nendstream endobj`);
    objects.push('5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj');

    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj) => {
        offsets.push(pdf.length);
        pdf += `${obj}\n`;
    });

    const xrefStart = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i <= objects.length; i += 1) {
        pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer << /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
    return pdf;
};

function ComplaintForm({
    onSuccess,
    showSuccessMessage = true,
    channelSource = 'portal',
    officerMode = false,
    fixedCaseType = '',
}) {
    const store = useStore();
    const url = process.env.REACT_APP_API_URL;
    const [isLoading, setIsLoading] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [success, setSuccess] = useState(false);
    const [referenceNo, setReferenceNo] = useState('');
    const [copiedReference, setCopiedReference] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [summaryTemplate, setSummaryTemplate] = useState('');
    const [templateError, setTemplateError] = useState('');
    const [officerOffenseId, setOfficerOffenseId] = useState('');
    const [officerAkTemplateKey, setOfficerAkTemplateKey] = useState('');
    const [officerOffenseError, setOfficerOffenseError] = useState('');
    const [addressDraft, setAddressDraft] = useState('');
    const [maskedFields, setMaskedFields] = useState({
        complainant_name: false,
        identification_number: false,
        contact_number: false,
    });

    useEffect(() => {
        store.emptyData();

        const now = new Date();
        const year = now.getFullYear();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5);
        store.setValue('complaint_year', year);
        store.setValue('complaint_date', date);
        store.setValue('complaint_time', time);
        // Incident datetime can be past/future; default date to today and keep time optional.
        store.setValue('incident_date', date);
        store.setValue('incident_time', '');
        store.setValue('reference_no', 'Akan dijana sistem');
        const normalizedFixedCaseType = ['AJ', 'AK'].includes((fixedCaseType || '').toUpperCase())
            ? (fixedCaseType || '').toUpperCase()
            : '';
        store.setValue('case_type', normalizedFixedCaseType || 'AJ');
        store.setValue('borang5_statement', '');
        store.setValue('offense_id', '');
        setAddressDraft('');
        setOfficerAkTemplateKey('');
    }, [fixedCaseType]);

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

    const pickAutoTemplate = (type, addressText) => {
        const text = (addressText || '').toString().toUpperCase();
        if (!text.trim()) {
            return '';
        }

        if (type === 'AJ') {
            if (/(\\bHOTEL\\b|\\bBILIK\\b|\\bAPARTMENT\\b|\\bRESORT\\b|\\bHOMESTAY\\b)/.test(text)) return 'aj_hotel';
            if (/BERSEKEDUDUKAN/.test(text)) return 'aj_bersekedudukan';
            if (/(RUMAH\\s*URUT|PUSAT\\s*URUT|PREMIS\\s*URUT|SPA)/.test(text)) return 'aj_rumah_urut';
            if (/(BERCERAI|CERAI|RUJUK)/.test(text)) return 'aj_pasangan_bercerai';
            if (/(NIKAH|KAHWIN|KAWIN)/.test(text)) return 'aj_nikah_tanpa_kebenaran';
            return '';
        }

        if (type === 'AK') {
            if (/POLIGAMI/.test(text)) return 'ak_poligami_tanpa_kebenaran';
            if (/(LAFAZ\\s*CERAI|CERAI)/.test(text)) return 'ak_cerai_luar_mahkamah';
            if (/RUJUK/.test(text)) return 'ak_rujuk_tidak_lapor';
            if (/(LEWAT\\s*DAFTAR|TAK\\s*DAFTAR|BELUM\\s*DAFTAR)/.test(text)) return 'ak_lewat_daftar_kahwin';
            if (/(NIKAH\\s*LUAR|THAILAND|INDONESIA)/.test(text)) return 'ak_nikah_tanpa_kebenaran';
            return '';
        }

        return '';
    };

    const handleSubmit = (e) => {
        e.preventDefault();

        const selectedCaseType = store.getValue('case_type') || 'AJ';
        const hasTemplates = selectedCaseType === 'AJ' || selectedCaseType === 'AK';
        const localErrors = {};
        const complainantName = (store.getValue('complainant_name') || '').trim();
        const idNo = (store.getValue('identification_number') || '').trim();
        const phone = (store.getValue('contact_number') || '').trim();
        const districtId = (store.getValue('district_id') || '').toString().trim();
        const address = (store.getValue('address') || '').trim();
        const incidentDate = (store.getValue('incident_date') || '').trim();
        const incidentTime = (store.getValue('incident_time') || '').trim();
        const summary = (store.getValue('summary') || '').trim();
        const borang5Statement = (store.getValue('borang5_statement') || '').trim();

        store.setValue('errors', null);
        setErrorMessage('');
        setTemplateError('');
        setOfficerOffenseError('');

        if (!complainantName) localErrors.complainant_name = 'Wajib diisi';
        if (!idNo) localErrors.identification_number = 'Wajib diisi';
        if (!phone) localErrors.contact_number = 'Wajib diisi';
        if (!districtId) localErrors.district_id = 'Wajib diisi';
        if (!address) localErrors.address = 'Wajib diisi';
        if (!incidentDate) localErrors.incident_date = 'Wajib diisi';
        // incident_time is optional (can be empty)

        if (Object.keys(localErrors).length > 0) {
            store.setValue('errors', localErrors);
            setErrorMessage('Sila lengkapkan Butir-butir Pemberi Maklumat / Pengadu dan Butiran Kejadian.');
            return;
        }

        if (!officerMode) {
            if (hasTemplates && !summaryTemplate) {
                setTemplateError('Sila pilih kategori template aduan.');
                setErrorMessage('Sila pilih kategori template aduan sebelum menghantar.');
                return;
            }
            if (!summary) {
                setErrorMessage('Sila isi Ringkasan Aduan.');
                return;
            }
        } else {
            if (selectedCaseType === 'AK') {
                if (!officerAkTemplateKey) {
                    setOfficerOffenseError('Template keluarga wajib dipilih.');
                    setErrorMessage('Sila pilih template keluarga sebelum menghantar.');
                    return;
                }
            } else {
                if (!officerOffenseId) {
                    setOfficerOffenseError('Kesalahan Disyaki wajib dipilih.');
                    setErrorMessage('Sila pilih Kesalahan Disyaki sebelum menghantar.');
                    return;
                }
            }
            if (!borang5Statement) {
                setErrorMessage('Sila isi Butiran Aduan (Borang 5) sebelum menghantar.');
                return;
            }
        }

        setIsLoading(true);

        const formData = new FormData();
        const dataArray = [
            { key: 'complainant_name', value: store.getValue('complainant_name') },
            { key: 'identification_number', value: store.getValue('identification_number') },
            { key: 'contact_number', value: store.getValue('contact_number') },
            { key: 'address', value: store.getValue('address') },
            { key: 'district_id', value: store.getValue('district_id') },
            { key: 'summary', value: store.getValue('summary') },
            { key: 'borang5_statement', value: store.getValue('borang5_statement') },
            { key: 'offense_id', value: store.getValue('offense_id') },
            { key: 'case_type', value: store.getValue('case_type') || 'AJ' },
            { key: 'channel', value: channelSource },
            { key: 'incident_date', value: store.getValue('incident_date') },
            { key: 'incident_time', value: store.getValue('incident_time') },
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
            const createdId = response?.data?.data?.id;
            setReferenceNo(response?.data?.reference_no || '');
            setCopiedReference(false);
            setSuccess(true);
            if (onSuccess) {
                onSuccess({
                    id: createdId,
                    caseType: selectedCaseType,
                    referenceNo: response?.data?.reference_no || '',
                });
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

    const caseType = store.getValue('case_type') || 'AJ';
    const incidentTitle = 'Butiran Kejadian';
    const districtPlaceholder = caseType === 'AJ' ? 'Pilih Daerah Kejadian *' : 'Pilih Daerah *';
    const addressPlaceholder = caseType === 'AJ' ? 'Alamat/Lokasi Kejadian *' : 'Alamat *';
    const addressValue = addressDraft || store.getValue('address') || '';
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
    const isFixedCaseType = ['AJ', 'AK'].includes((fixedCaseType || '').toUpperCase());
    const shouldLockSummary = Boolean(
        templatesByCaseType[caseType]?.length > 0
        && !summaryTemplate
        && !(store.getValue('summary') || '').trim()
        && !officerMode
    );

    const formatBorang5TemplateDate = (isoDate) => {
        if (!isoDate) return '';
        const match = String(isoDate).trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!match) return '';
        return `${match[3]}.${match[2]}.${match[1]}`;
    };

    const formatBorang5TemplateTime = (hhmm) => {
        if (!hhmm) return '';
        const match = String(hhmm).trim().match(/^(\d{1,2}):(\d{2})$/);
        if (!match) return '';
        const hh = match[1].padStart(2, '0');
        return `${hh}.${match[2]}`;
    };

    const hydrateBorang5Template = (rawText) => {
        if (!rawText) return '';
        let text = String(rawText);
        // Borang 5 statement uses Tarikh/Masa Aduan (auto now) like public flow.
        const dateDot = formatBorang5TemplateDate(store.getValue('complaint_date'));
        const timeDot = formatBorang5TemplateTime(store.getValue('complaint_time'));
        const address = (store.getValue('address') || '').toString().trim();

        if (dateDot) {
            text = text.replace(/PADA\\s+__________/i, `PADA ${dateDot}`);
            text = text.replace(/PADA\\s+(\\d{1,2}[./-]\\d{1,2}[./-]\\d{4}|\\d{4}-\\d{2}-\\d{2})/i, `PADA ${dateDot}`);
        }
        if (timeDot) {
            text = text.replace(/(JAM\\s+(?:LEBIH\\s+KURANG\\s+)?)_____/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\\s+KURANG\\s+JAM\\s+)_____/i, `$1${timeDot}`);
            text = text.replace(/(JAM\\s+(?:LEBIH\\s+KURANG\\s+)?)\\d{1,2}(?:[.:]\\d{2})?/i, `$1${timeDot}`);
            text = text.replace(/(LEBIH\\s+KURANG\\s+JAM\\s+)\\d{1,2}(?:[.:]\\d{2})?/i, `$1${timeDot}`);
        }
        if (address) {
            text = text.replace(/(LOKASI KEJADIAN\\s*:)\\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\\s*:)\\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\\s*:)\\s*__________/gi, `$1 ${address}`);
            text = text.replace(/(LOKASI KEJADIAN\\s*:)[^\\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT LOKASI KEJADIAN\\s*:)[^\\n]*/gi, `$1 ${address}`);
            text = text.replace(/(ALAMAT KEJADIAN\\s*:)[^\\n]*/gi, `$1 ${address}`);
        }

        return text.trim();
    };

    const resolveTemplateKeyFromOffense = (offense) => {
        const code = (offense?.code || '').toString().toUpperCase();
        const section = (offense?.section || '').toString().toUpperCase();

        // Prefer parsing from code (stable).
        let num = '';
        let isEpais = false;
        const ejss = code.match(/^EJSS-(\d+)/);
        const epaisNum = code.match(/^EPAIS-(\d+)/);
        if (ejss) {
            num = ejss[1];
        } else if (epaisNum) {
            num = epaisNum[1];
            isEpais = true;
        } else if (code.startsWith('EPAIS-')) {
            isEpais = true;
        }

        if (!num) {
            const match = section.match(/\b(?:SEC|SEKSYEN)\s*([0-9]+)/);
            if (match) {
                num = match[1];
                isEpais = isEpais || section.includes('EPAIS');
            }
        }

        if (num === '32' || num === '33' || num === '34') return 'seksyen_32_33_34';
        if (isEpais && num) return `epais_${num}`;
        if (num) return `seksyen_${num}`;
        return '';
    };

    const applyOfficerTemplateByKey = (key) => {
        if (!key) return;
        const tpl = BORANG5_OFFICER_TEMPLATES.find((item) => item.key === key)
            || BORANG5_OFFICER_TEMPLATES.find((item) => item.key === 'generic');
        if (!tpl) return;

        const nextText = hydrateBorang5Template(tpl.text || '');
        const existing = (store.getValue('borang5_statement') || '').toString().trim();
        if (existing && existing !== nextText) {
            const ok = window.confirm('Butiran Aduan (Borang 5) akan diganti dengan template yang dicadangkan. Teruskan?');
            if (!ok) return;
        }
        store.setValue('borang5_statement', nextText);
    };

    const formatOffenseLabel = (offense) => {
        if (!offense) return '';
        const code = (offense.code || '').toString().trim();
        const section = (offense.section || '').toString().trim();
        const name = (offense.name || '').toString().trim();
        const parts = [];
        if (code) parts.push(code);
        if (section) parts.push(section);
        const head = parts.length ? `${parts.join(' / ')}` : '';
        if (head && name) return `${head} - ${name}`;
        return name || head;
    };

    const applyOfficerTemplateFromOffense = (offense) => {
        const suggestedKey = resolveTemplateKeyFromOffense(offense) || 'generic';
        const tpl = BORANG5_OFFICER_TEMPLATES.find((item) => item.key === suggestedKey)
            || BORANG5_OFFICER_TEMPLATES.find((item) => item.key === 'generic');
        if (!tpl) return;

        const raw = (tpl.text || '').replace('{{OFFENSE}}', formatOffenseLabel(offense));
        const nextText = hydrateBorang5Template(raw);

        const existing = (store.getValue('borang5_statement') || '').toString().trim();
        if (existing && existing !== nextText) {
            const ok = window.confirm('Butiran Aduan (Borang 5) akan diganti dengan template yang dicadangkan. Teruskan?');
            if (!ok) return;
        }
        store.setValue('borang5_statement', nextText);
    };

    const tryAutoSuggestTemplate = (nextAddress) => {
        if (isLoading) return;
        if (officerMode) return;
        if (summaryTemplate) return; // user already picked
        if ((store.getValue('summary') || '').trim()) return; // don't override typed content

        const suggested = pickAutoTemplate(caseType, nextAddress);
        if (!suggested) return;

        const next = buildSummaryTemplate(suggested);
        if (!next) return;

        setTemplateError('');
        store.setValue('summary', next);
        setSummaryTemplate(suggested);
    };

    useEffect(() => {
        // Fallback auto-suggest (e.g., initial value restored).
        tryAutoSuggestTemplate(addressValue);
    }, [caseType, addressValue, isLoading, summaryTemplate]); // eslint-disable-line react-hooks/exhaustive-deps

    if (success && showSuccessMessage) {
        const submittedAt = new Date().toLocaleString('ms-MY');
        const pdfFileName = `aduan-${(referenceNo || 'rujukan').replace(/[^A-Za-z0-9-_]/g, '_')}.pdf`;
        const shareText = [
            'Aduan JAIS berjaya dihantar.',
            `No Aduan: ${referenceNo || '-'}`,
            `Tarikh/Masa: ${submittedAt}`,
        ].join('\n');

        return (
            <div className="complaint-card complaint-card-success">
                <div className="complaint-success-icon">
                    <i className="bi bi-check2-circle"></i>
                </div>
                <div>
                    <h2>Terima Kasih!</h2>
                    <p>Aduan anda telah berjaya dihantar. Kami akan memproses aduan anda secepat mungkin.</p>
                    {referenceNo && (
                        <div className="complaint-ref-row">
                            <div className="complaint-ref">
                                No Aduan anda: <strong>{referenceNo}</strong>
                            </div>
                            <button
                                type="button"
                                className="complaint-ref-copy"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(referenceNo);
                                        setCopiedReference(true);
                                        window.setTimeout(() => setCopiedReference(false), 1800);
                                    } catch (error) {
                                        console.warn('clipboard copy failed', error);
                                    }
                                }}
                            >
                                {copiedReference ? 'Disalin' : 'Salin No Aduan'}
                            </button>
                        </div>
                    )}
                    <div className="complaint-ref-actions">
                        <button
                            type="button"
                            className="complaint-ref-copy"
                            onClick={() => {
                                const lines = [
                                    'PENGESAHAN ADUAN JAIS',
                                    '',
                                    `No Aduan: ${referenceNo || '-'}`,
                                    `Tarikh/Masa Hantar: ${submittedAt}`,
                                    '',
                                    'Sila simpan nombor aduan ini untuk rujukan semakan status.',
                                ];
                                const pdfString = buildSimplePdf(lines);
                                const blob = new Blob([pdfString], { type: 'application/pdf' });
                                const blobUrl = URL.createObjectURL(blob);
                                const link = document.createElement('a');
                                link.href = blobUrl;
                                link.download = pdfFileName;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                                URL.revokeObjectURL(blobUrl);
                            }}
                        >
                            Muat Turun PDF
                        </button>
                        <button
                            type="button"
                            className="complaint-ref-copy"
                            onClick={() => {
                                const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
                                window.open(waUrl, '_blank', 'noopener,noreferrer');
                            }}
                        >
                            Kongsi WhatsApp
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (success && !showSuccessMessage) {
        return null;
    }

    const buildSummaryTemplate = (key) => {
        const date = store.getValue('incident_date') || '[TARIKH]';
        const time = store.getValue('incident_time') || '[MASA]';
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

    const applySummaryTemplate = (key) => {
        if (!key) {
            return;
        }
        const next = buildSummaryTemplate(key);
        if (!next) {
            return;
        }
        store.setValue('summary', next);
    };

    const handleSelectTemplate = (nextKey) => {
        if (!nextKey) {
            setSummaryTemplate('');
            return;
        }
        setTemplateError('');
        // Avoid re-applying the same template (and avoid redundant confirmations).
        if (nextKey === summaryTemplate) {
            return;
        }

        const next = buildSummaryTemplate(nextKey);
        if (!next) {
            return;
        }

        const existing = (store.getValue('summary') || '').trim();
        if (existing && existing !== next.trim()) {
            const ok = window.confirm('Ringkasan Aduan sudah diisi. Anda mahu gantikan dengan template?');
            if (!ok) {
                return;
            }
        }
        store.setValue('summary', next);
        setSummaryTemplate(nextKey);
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
                    <span>Tarikh Aduan</span>
                    <strong>{store.getValue('complaint_date')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>Masa Aduan</span>
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
                        <h3>Jenis Aduan <span className="complaint-required">*</span></h3>
                        {!isFixedCaseType && (
                            <p>Sila pilih sama ada aduan berkaitan Penguatkuasaan atau Keluarga.</p>
                        )}
                    </div>
                    <div className="complaint-category-options">
                        {isFixedCaseType ? (
                            <label className="complaint-category-card active">
                                <input type="radio" checked readOnly />
                                <span>
                                    {store.getValue('case_type') === 'AK'
                                        ? 'Aduan Keluarga (Nikah/Cerai/Rujuk/Poligami)'
                                        : 'Aduan Penguatkuasaan (Khalwat/Hotel/Rumah Urut/Lain-lain Kesalahan Syariah)'}
                                </span>
                            </label>
                        ) : (
                            [
                                { value: 'AJ', label: 'Aduan Penguatkuasaan (Khalwat/Hotel/Rumah Urut/Lain-lain Kesalahan Syariah)' },
                                { value: 'AK', label: 'Aduan Keluarga (Nikah/Cerai/Rujuk/Poligami)' },
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
                                        onChange={() => {
                                            store.setValue('case_type', option.value);
                                            setSummaryTemplate('');
                                            setTemplateError('');
                                            setOfficerAkTemplateKey('');
                                            setOfficerOffenseId('');
                                            setOfficerOffenseError('');
                                            store.setValue('summary', '');
                                            store.setValue('offense_id', '');
                                            store.setValue('borang5_statement', '');
                                            setAddressDraft('');
                                        }}
                                    />
                                    <span>{option.label}</span>
                                </label>
                            ))
                        )}
                    </div>
                </div>

                <div className="complaint-grid">
                    <div className="complaint-section">
                        <h3>Butir-butir Pemberi Maklumat / Pengadu <span className="complaint-required">*</span></h3>
                        <Row className='mb-4'>
                            <InputText 
                                fieldName='complainant_name' 
                                placeholder='Nama Pengadu *'
                                icon='bi-person'
                                isLoading={isLoading}
                                canMask
                                isMasked={maskedFields.complainant_name}
                                onToggleMask={() => setMaskedFields((prev) => ({ ...prev, complainant_name: !prev.complainant_name }))}
                                maskOnLabel="HIDE"
                                maskOffLabel="SHOW"
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='identification_number' 
                                placeholder='No Kad Pengenalan *'
                                icon='bi-card-text'
                                isLoading={isLoading}
                                canMask
                                isMasked={maskedFields.identification_number}
                                onToggleMask={() => setMaskedFields((prev) => ({ ...prev, identification_number: !prev.identification_number }))}
                                maskOnLabel="HIDE"
                                maskOffLabel="SHOW"
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='contact_number' 
                                placeholder='No HP *'
                                icon='bi-phone'
                                isLoading={isLoading}
                                canMask
                                isMasked={maskedFields.contact_number}
                                onToggleMask={() => setMaskedFields((prev) => ({ ...prev, contact_number: !prev.contact_number }))}
                                maskOnLabel="HIDE"
                                maskOffLabel="SHOW"
                            />
                        </Row>
                    </div>

                    <div className="complaint-section">
                        <h3>{incidentTitle} <span className="complaint-required">*</span></h3>
                        <Row className='mb-4'>
                            <Col md={6} className="mb-4 mb-md-0">
                                <InputText
                                    fieldName='incident_date'
                                    placeholder='Tarikh Kejadian *'
                                    icon='bi-calendar'
                                    type='date'
                                    isLoading={isLoading}
                                />
                            </Col>
                            <Col md={6}>
                                <InputText
                                    fieldName='incident_time'
                                    placeholder='Masa Kejadian (Jika ada)'
                                    icon='bi-clock'
                                    type='time'
                                    isLoading={isLoading}
                                />
                            </Col>
                        </Row>
                        <Row className='mb-4'>
                            <InputSelect
                                fieldName='district_id'
                                placeholder={districtPlaceholder}
                                icon='bi-geo'
                                isLoading={isLoading}
                                options={districtOptions}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputTextarea 
                                type='text'
                                fieldName='address' 
                                placeholder={addressPlaceholder}
                                icon='bi-geo-alt'
                                rows='4'
                                isLoading={isLoading}
                                onValueChange={(val) => {
                                    setAddressDraft(val);
                                    tryAutoSuggestTemplate(val);
                                }}
                            />
                        </Row>
                    </div>
                </div>

                {!officerMode && (
                    <div className="complaint-section complaint-span-full">
                        <h3>Ringkasan Aduan <span className="complaint-required">*</span></h3>
                        {templatesByCaseType[caseType]?.length > 0 && (
                            <div className="complaint-template">
                                <div className="complaint-template-left">
                                    <strong>Kategori Template <span className="complaint-required">*</span></strong>
                                    <small>
                                        Pilih kategori untuk masukkan contoh format ringkasan aduan secara automatik.
                                        {shouldLockSummary ? ' Ringkasan akan dibuka selepas kategori dipilih.' : ''}
                                    </small>
                                </div>
                                <div className="complaint-template-actions">
                                    <Form.Select
                                        value={summaryTemplate}
                                        onChange={(e) => handleSelectTemplate(e.target.value)}
                                        onFocus={() => tryAutoSuggestTemplate(addressValue)}
                                        disabled={isLoading}
                                        isInvalid={Boolean(templateError)}
                                    >
                                        <option value="">Pilih template *</option>
                                        {templatesByCaseType[caseType].map((t) => (
                                            <option key={t.key} value={t.key}>{t.label}</option>
                                        ))}
                                    </Form.Select>
                                    {templateError && (
                                        <Form.Control.Feedback type="invalid" style={{ display: 'block' }}>
                                            {templateError}
                                        </Form.Control.Feedback>
                                    )}
                                </div>
                            </div>
                        )}
                        <Row className='mb-4'>
                            <InputTextarea
                                type='text'
                                fieldName='summary'
                                placeholder={shouldLockSummary ? 'Sila pilih template aduan dahulu.' : 'Ringkasan Aduan *'}
                                icon='bi-pencil'
                                rows='8'
                                autoGrow
                                isLoading={isLoading}
                                readOnly={shouldLockSummary}
                            />
                        </Row>
                    </div>
                )}

                {officerMode && (
                    <div className="complaint-section complaint-span-full">
                        <h3>Butiran Aduan (Borang 5) <span className="complaint-required">*</span></h3>
                        <div className="complaint-template complaint-template-stack">
                            <div className="complaint-template-left">
                                <strong>Kesalahan Disyaki <span className="complaint-required">*</span></strong>
                                <small>
                                    Pilih kesalahan disyaki. Template Borang 5 akan dicadangkan ikut seksyen/kesalahan.
                                </small>
                            </div>
                            <div className="complaint-template-actions">
                                {caseType === 'AK' ? (
                                    <Form.Select
                                        value={officerAkTemplateKey}
                                        onChange={(e) => {
                                            const nextKey = e.target.value || '';
                                            setOfficerAkTemplateKey(nextKey);
                                            setOfficerOffenseError('');
                                            setOfficerOffenseId('');
                                            store.setValue('offense_id', '');
                                            if (!nextKey) {
                                                return;
                                            }
                                            const nextText = buildSummaryTemplate(nextKey);
                                            if (nextText) {
                                                const existing = (store.getValue('borang5_statement') || '').toString().trim();
                                                if (existing && existing !== nextText.trim()) {
                                                    const ok = window.confirm('Butiran Aduan (Borang 5) akan diganti dengan template keluarga. Teruskan?');
                                                    if (!ok) return;
                                                }
                                                store.setValue('borang5_statement', nextText);
                                            }
                                        }}
                                        disabled={isLoading}
                                    >
                                        <option value="">-- Pilih Template Keluarga --</option>
                                        {(templatesByCaseType.AK || []).map((item) => (
                                            <option key={item.key} value={item.key}>{item.label}</option>
                                        ))}
                                    </Form.Select>
                                ) : (
                                    <SharedOffenseSelect
                                        apiUrl={url}
                                        value={officerOffenseId}
                                        label=""
                                        onChange={(value) => {
                                            setOfficerOffenseId(value);
                                            setOfficerAkTemplateKey('');
                                            setOfficerOffenseError('');
                                            store.setValue('offense_id', value || '');
                                        }}
                                        onItemSelected={(item) => {
                                            if (!item) return;
                                            applyOfficerTemplateFromOffense(item);
                                        }}
                                    />
                                )}
                                {officerOffenseError && (
                                    <div className="app-input-error" style={{ marginTop: '0.35rem' }}>
                                        {officerOffenseError}
                                    </div>
                                )}
                            </div>
                        </div>
                        <Row className='mb-4'>
                            <InputTextarea
                                type='text'
                                fieldName='borang5_statement'
                                placeholder={officerOffenseId ? 'Butiran Aduan (Borang 5) *' : 'Sila pilih Kesalahan Disyaki dahulu.'}
                                icon='bi-file-earmark-text'
                                rows='10'
                                isLoading={isLoading}
                                readOnly={!officerOffenseId && !store.getValue('borang5_statement')}
                            />
                        </Row>
                    </div>
                )}

                <div className="complaint-actions">
                    <SubmitButton isLoading={isLoading} value="Hantar Aduan" />
                </div>
            </Form>
        </div>
    );
}

export default ComplaintForm;
