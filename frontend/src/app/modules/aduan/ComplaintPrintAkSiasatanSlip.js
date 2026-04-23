import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';

const pad2 = (value) => String(value ?? '').padStart(2, '0');

const formatDateDMY = (value) => {
    if (!value) return '-';
    const str = String(value);
    const datePart = str.includes('T')
        ? str.split('T')[0]
        : (str.includes(' ') ? str.split(' ')[0] : str);
    const parts = datePart.split('-');
    if (parts.length !== 3) return value;
    return `${pad2(parts[2])}-${pad2(parts[1])}-${parts[0]}`;
};

const formatDateTimeDMY = (value) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return String(value);
    const dd = pad2(parsed.getDate());
    const mm = pad2(parsed.getMonth() + 1);
    const yyyy = parsed.getFullYear();
    const hh = pad2(parsed.getHours());
    const min = pad2(parsed.getMinutes());
    const ss = pad2(parsed.getSeconds());
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
};

const resolveOffenseLabel = (complaint) => {
    const offense =
        complaint?.ak_offense ||
        complaint?.akOffense ||
        complaint?.offense ||
        complaint?.aj_offense ||
        null;
    if (offense) {
        const code = String(offense?.code || '').trim();
        const section = String(offense?.section || '').trim();
        const name = String(offense?.name || '').trim();
        const left = [code, section].filter(Boolean).join(' ');
        return [left, name].filter(Boolean).join(' - ') || '-';
    }

    const directLabel = String(
        complaint?.ak_offense_label ||
        complaint?.offense_label ||
        complaint?.offense_name ||
        ''
    ).trim();
    return directLabel || '-';
};

const ComplaintPrintAkSiasatanSlip = () => {
    const { id } = useParams();
    const apiUrl = process.env.REACT_APP_API_URL;
    const [complaint, setComplaint] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        const token = localStorage.getItem('token');
        axios.get(`${apiUrl}/complaints/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => setComplaint(response?.data?.data || null))
            .catch((err) => setError(err?.message || 'Gagal mendapatkan aduan.'))
            .finally(() => setIsLoading(false));
    }, [apiUrl, id]);

    const nowStamp = useMemo(() => formatDateTimeDMY(new Date()), []);

    if (isLoading) return <div className="print-loading">Memuatkan borang...</div>;
    if (error) return <div className="print-loading">{error}</div>;
    if (!complaint) return <div className="print-loading">Aduan tidak ditemui.</div>;

    const caseType = String(complaint?.case_type || '').toUpperCase();
    if (caseType !== 'AK') {
        return <div className="print-loading">Borang ini hanya untuk aduan keluarga (AK).</div>;
    }

    const district = complaint?.district_name || complaint?.district?.name || '-';
    const referenceNo = complaint?.reference_no || '-';
    const oydsName = complaint?.complainant_name || complaint?.ak_partner_name || '-';
    const offense = resolveOffenseLabel(complaint);
    const temujanji = formatDateTimeDMY(complaint?.ak_investigation_datetime);
    const tempat = complaint?.ak_event_place || complaint?.ak_event_location || complaint?.address || '-';
    const signName = complaint?.complainant_name || '-';
    const signId = complaint?.identification_number || '-';

    return (
        <div className="print-page">
            <div className="print-toolbar no-print">
                <Link className="app-button app-button-ghost" to={`/app/complaints/${id}`}>
                    Kembali
                </Link>
                <button className="app-button" type="button" onClick={() => window.print()}>
                    Cetak Slip Kehadiran
                </button>
            </div>

            <div className="print-sheet print-sheet-ak-slip">
                <div className="print-ak-slip-center print-ak-slip-title-strong">
                    BAHAGIAN PENGURUSAN PENGUATKUASAAN
                </div>
                <div className="print-ak-slip-center print-ak-slip-title-strong">
                    JABATAN AGAMA ISLAM SELANGOR
                </div>

                <div className="print-ak-slip-center print-ak-slip-note">
                    Subseksyen 58(1) Enakmen Tatacara Jenayah Syariah (Negeri Selangor) tahun 2003.
                    Kuasa untuk mengkehendaki kehadiran saksi bagi menjalankan siasatan
                </div>
                <div className="print-ak-slip-center print-ak-slip-note">
                    Subseksyen 58(2) Enakmen Tatacara Jenayah Syariah (Negeri Selangor) tahun 2003.
                    Jika mana-mana orang enggan hadir, waran memastikan kehadiran boleh dikeluarkan.
                </div>

                <div className="print-ak-slip-band">SLIP KEHADIRAN MEMBERI KETERANGAN</div>

                <div className="print-ak-slip-center">
                    Kehadiran tuan/puan untuk memberi keterangan dipersetujui sebagaimana ketetapan di bawah.
                </div>
                <div className="print-ak-slip-center">
                    Sila ambil perhatian, ketetapan tarikh dan masa adalah dituntut.
                    Sebarang ketidakhadiran boleh dikenakan tindakan di atas.
                </div>

                <div className="print-ak-slip-table">
                    <div className="print-ak-slip-row"><span>Daerah</span><strong>{district}</strong></div>
                    <div className="print-ak-slip-row"><span>No. Aduan</span><strong>{referenceNo}</strong></div>
                    <div className="print-ak-slip-row"><span>Nama OYDS</span><strong>{oydsName}</strong></div>
                    <div className="print-ak-slip-row"><span>Kesalahan</span><strong>{offense}</strong></div>
                    <div className="print-ak-slip-row"><span>Tarikh dan Masa Temujanji</span><strong>{temujanji}</strong></div>
                    <div className="print-ak-slip-row"><span>Tempat</span><strong>{tempat}</strong></div>
                </div>

                <div className="print-ak-slip-band">PERINGATAN</div>
                <ol className="print-ak-slip-list">
                    <li>Setiap pelanggaran Enakmen Undang-undang Keluarga Islam (Negeri Selangor) 2003 perlu melalui proses perundangan.</li>
                    <li>Siasatan akan dijalankan dan akan melalui proses pendakwaan seterusnya hukuman bagi setiap kesalahan.</li>
                    <li>Saman untuk hadir ke mahkamah akan diberikan untuk proses perbicaraan bagi setiap kesalahan tersebut.</li>
                    <li>Sijil akan dikeluarkan setelah proses-proses perundangan selesai.</li>
                    <li>Hanya keterangan bersama saksi dan dokumen yang lengkap sahaja akan diproses.</li>
                </ol>

                <div className="print-ak-slip-band">PENGESAHAN</div>
                <p className="print-ak-slip-confirmation">
                    Saya bersetuju segala maklumat yang telah diberikan adalah benar dan di atas persetujuan saya sendiri
                    untuk hadir memberi pernyataan pada {temujanji}.
                </p>

                <div className="print-ak-slip-sign-row">
                    <div className="print-ak-slip-sign-left">
                        <div className="print-ak-slip-sign-line" />
                        <div>({signName})</div>
                        <div>No. K/P : {signId}</div>
                    </div>
                    <div className="print-ak-slip-sign-right">
                        <div>Tarikh / Masa : <strong>{nowStamp}</strong></div>
                        <div>No. Daftar Aduan : <strong>{referenceNo}</strong></div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComplaintPrintAkSiasatanSlip;

