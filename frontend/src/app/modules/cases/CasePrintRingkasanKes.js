import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import logoBpnJais from '../../../assets/logo_bpn_jais.png';

const pad2 = (value) => String(value ?? '').padStart(2, '0');

const formatDateSlash = (value) => {
    if (!value) return '-';
    const str = String(value);
    const datePart = str.includes('T')
        ? str.split('T')[0]
        : (str.includes(' ') ? str.split(' ')[0] : str);
    const parts = datePart.split('-');
    if (parts.length !== 3) return value;
    return `${pad2(parts[2])} / ${pad2(parts[1])} / ${parts[0]}`;
};

const formatTimeMalay = (value) => {
    if (!value) return '-';
    const str = String(value);
    const timePart = str.includes('T')
        ? (str.split('T')[1] || '')
        : (str.includes(' ') ? (str.split(' ')[1] || '') : str);
    const raw = timePart.replace('Z', '').split('.')[0];
    const [hhStr = '0', mmStr = '0'] = raw.split(':');
    const hh = Number(hhStr) || 0;
    const mm = Number(mmStr) || 0;
    const session = hh < 12 ? 'PAGI' : 'PETANG';
    const hh12 = ((hh + 11) % 12) + 1;
    return `${hh12}.${pad2(mm)} ${session}`;
};

const renderValue = (value, fallback = '-') => {
    const next = String(value || '').trim();
    return next || fallback;
};

const CasePrintRingkasanKes = () => {
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const [caseRecord, setCaseRecord] = useState(null);
    const [offenses, setOffenses] = useState([]);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        Promise.all([
            axios.get(`${apiUrl}/cases/${id}`, { headers }),
            axios.get(`${apiUrl}/references/offenses`, { headers }),
        ])
            .then(([caseResponse, offenseResponse]) => {
                setCaseRecord(caseResponse?.data?.data || null);
                setOffenses(Array.isArray(offenseResponse?.data?.data) ? offenseResponse.data.data : []);
            })
            .catch((err) => {
                setError(err?.response?.data?.message || err?.message || 'Gagal memuatkan borang Ringkasan KES.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [apiUrl, id, token]);

    const linkedComplaint = useMemo(() => (
        (Array.isArray(caseRecord?.complaints) && caseRecord.complaints.length)
            ? caseRecord.complaints[0]
            : null
    ), [caseRecord]);

    const offenseLabel = useMemo(() => {
        const picked = (offenses || []).find((item) => String(item.id) === String(caseRecord?.report_offense_id || ''));
        if (!picked) return 'TIADA';
        return `${picked.section ? `${picked.section} - ` : ''}${picked.name || ''}`.trim().toUpperCase();
    }, [offenses, caseRecord]);

    if (isLoading) {
        return <div className="print-loading">Memuatkan borang...</div>;
    }

    if (error) {
        return <div className="print-loading">{error}</div>;
    }

    if (!caseRecord) {
        return <div className="print-loading">Kes tidak ditemui.</div>;
    }

    const firstPoliceReport = Array.isArray(caseRecord.police_reports) && caseRecord.police_reports.length
        ? caseRecord.police_reports[0]
        : null;
    const seizureItems = Array.isArray(caseRecord.seizure_items) ? caseRecord.seizure_items : [];
    const seizureSummary = seizureItems.length
        ? seizureItems.map((item, index) => `${index + 1}. ${item.description || item.item_no || '-'}`).join('\n')
        : 'TIADA';
    const laporanTindakan = String(caseRecord.case_summary || '').trim().toUpperCase();
    const statusSemasa = String(caseRecord.current_status || linkedComplaint?.current_stage || '').trim().toUpperCase();
    const noAduanFir = String(caseRecord.case_register_no || linkedComplaint?.reference_no || '').trim();
    const tarikhTerima = formatDateSlash(linkedComplaint?.complaint_date);
    const masaTerima = formatTimeMalay(linkedComplaint?.complaint_time);
    const tarikhTindakan = formatDateSlash(caseRecord.action_datetime);
    const masaTindakan = formatTimeMalay(caseRecord.action_datetime);
    const pegawaiPenangkap = renderValue(caseRecord?.arrest_staff?.name || caseRecord?.arrestStaff?.name, '-').toUpperCase();
    const noBorangAkuanPemeriksaan = 'TIADA';

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/cases/${id}`}>
                    Kembali
                </Link>
                <button className="app-button" type="button" onClick={() => window.print()}>
                    Cetak Ringkasan KES
                </button>
            </div>

            <div className="print-sheet print-sheet-ringkasan-kes">
                <div className="print-ringkasan-top-right">REK-BPN-03</div>
                <div className="print-ringkasan-logo-wrap">
                    <img src={logoBpnJais} alt="Logo JAIS" className="print-ringkasan-logo" />
                </div>
                <div className="print-ringkasan-department">
                    BAHAGIAN PENGURUSAN PENGUATKUASAAN
                    <br />
                    JABATAN AGAMA ISLAM SELANGOR
                </div>
                <div className="print-ringkasan-title">LAPORAN TINDAKAN (KES)</div>

                <div className="print-ringkasan-label-grid print-ringkasan-label-grid-3">
                    <div>NO. ADUAN / FIR:</div>
                    <div>TARIKH TERIMA:</div>
                    <div>MASA TERIMA:</div>
                </div>
                <div className="print-ringkasan-value-grid print-ringkasan-value-grid-3">
                    <div>{renderValue(noAduanFir)}</div>
                    <div>{renderValue(tarikhTerima)}</div>
                    <div>{renderValue(masaTerima)}</div>
                </div>

                <div className="print-ringkasan-inline-row">
                    <div className="print-ringkasan-inline-label">STATUS SEMASA ADUAN:</div>
                    <div className="print-ringkasan-inline-box print-ringkasan-inline-box-wide">{renderValue(statusSemasa)}</div>
                </div>

                <div className="print-ringkasan-inline-row">
                    <div className="print-ringkasan-inline-label">PEGAWAI PENANGKAP:</div>
                    <div className="print-ringkasan-inline-box print-ringkasan-inline-box-full">{pegawaiPenangkap}</div>
                </div>

                <div className="print-ringkasan-label-grid print-ringkasan-label-grid-4">
                    <div>TARIKH TINDAKAN:</div>
                    <div>MASA TINDAKAN:</div>
                    <div>BALAI POLIS:</div>
                    <div>NO. REPORT:</div>
                </div>
                <div className="print-ringkasan-value-grid print-ringkasan-value-grid-4">
                    <div>{renderValue(tarikhTindakan)}</div>
                    <div>{renderValue(masaTindakan)}</div>
                    <div>{renderValue(firstPoliceReport?.station)}</div>
                    <div>{renderValue(firstPoliceReport?.report_no)}</div>
                </div>

                <div className="print-ringkasan-bottom-grid">
                    <div className="print-ringkasan-column">
                        <div className="print-ringkasan-big-box print-ringkasan-report-box">
                            {laporanTindakan || 'RINGKASAN KES MASIH BELUM DIISI'}
                        </div>
                    </div>

                    <div className="print-ringkasan-column">
                        <div className="print-ringkasan-small-box">{offenseLabel}</div>
                        <div className="print-ringkasan-column-label print-ringkasan-column-label-spaced">NO. BORANG AKUAN PEMERIKSAAN:</div>
                        <div className="print-ringkasan-small-box">{noBorangAkuanPemeriksaan}</div>
                        <div className="print-ringkasan-column-label print-ringkasan-column-label-spaced">SENARAI BARANG KES:</div>
                        <div className="print-ringkasan-small-box print-ringkasan-seizure-box">{seizureSummary.toUpperCase()}</div>
                    </div>
                </div>

                <div className="print-ringkasan-sign-grid">
                    <div>
                        <div className="print-ringkasan-sign-label">DISEDIAKAN:</div>
                        <div className="print-ringkasan-sign-box"></div>
                    </div>
                    <div>
                        <div className="print-ringkasan-sign-label">DISEMAK &amp; DISAHKAN (KKG/KUG)</div>
                        <div className="print-ringkasan-sign-box"></div>
                    </div>
                </div>

                <div className="print-ringkasan-footnote">Kemaskini pada 11 September 2024</div>
            </div>
        </div>
    );
};

export default CasePrintRingkasanKes;
