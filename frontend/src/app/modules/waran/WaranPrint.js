import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';

const formatDateMalay = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString('ms-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'Asia/Kuala_Lumpur',
    });
};

const formatDateTimeMalay = (value) => {
    if (!value) {
        return '-';
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString('ms-MY', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
        timeZone: 'Asia/Kuala_Lumpur',
    });
};

const toTitle = (value) => {
    if (!value) {
        return '-';
    }
    return String(value)
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (m) => m.toUpperCase());
};

const WaranPrint = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [record, setRecord] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!apiUrl || !id) {
            setError('Rekod tidak dijumpai.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        setError('');
        axios.get(`${apiUrl}/i-waran/${id}`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then((response) => setRecord(response?.data?.data || null))
            .catch(() => setError('Gagal memuatkan maklumat waran.'))
            .finally(() => setIsLoading(false));
    }, [apiUrl, id, token]);

    const executionDateTime = useMemo(() => (
        record?.tarikh_masa_perlaksanaan_1
        || record?.tarikh_masa_perlaksanaan_2
        || record?.tarikh_masa_perlaksanaan_3
        || null
    ), [record]);

    if (isLoading) {
        return <div className="app-empty">Memuatkan...</div>;
    }

    if (error) {
        return <div className="app-empty">{error}</div>;
    }

    if (!record) {
        return <div className="app-empty">Rekod tidak dijumpai.</div>;
    }

    return (
        <div className="app-print">
            <div className="app-print-toolbar">
                <button type="button" className="app-button app-button-ghost" onClick={() => navigate(`/app/i-waran/${record.id}`)}>
                    Kembali
                </button>
                <button type="button" className="app-button" onClick={() => window.print()}>
                    <i className="bi bi-printer"></i>
                    Print / Save PDF
                </button>
            </div>

            <div className="app-print-sheet app-waran-report-sheet">
                <div className="app-waran-report-code">BORANG LW332</div>

                <div className="app-waran-report-title">
                    <h1>LAPORAN PERLAKSANAAN WARAN TANGKAP</h1>
                    <h2>BAHAGIAN PENGURUSAN PENGUATKUASAAN</h2>
                    <h2>JABATAN AGAMA ISLAM SELANGOR</h2>
                </div>

                <section className="app-waran-report-section">
                    <h3>MAKLUMAT WARAN</h3>
                    <div className="app-waran-report-table">
                        <div className="k">NO. RUJUKAN FAIL WARAN</div>
                        <div className="v">{record.no_ruj_fail || '-'}</div>

                        <div className="k">PENAMA WARAN</div>
                        <div className="v">{record.nama_okt || '-'}</div>

                        <div className="k">NO. K/P atau PASSPORT</div>
                        <div className="v">{record.no_kp_okt || '-'}</div>

                        <div className="k">ALAMAT</div>
                        <div className="v" style={{ whiteSpace: 'pre-wrap' }}>{record.alamat_okt || '-'}</div>

                        <div className="k">KES JENAYAH BILANGAN</div>
                        <div className="v">{record.no_kes || '-'}</div>

                        <div className="k">TARIKH PERBICARAAN</div>
                        <div className="v">{formatDateMalay(record.tarikh_bicara)}</div>

                        <div className="k">MAHKAMAH</div>
                        <div className="v">{record.mahkamah?.nama || '-'}</div>
                    </div>
                </section>

                <section className="app-waran-report-section">
                    <h3>LAPORAN PERLAKSANAAN</h3>
                    <div className="app-waran-report-table app-waran-report-table-compact">
                        <div className="k">STATUS</div>
                        <div className="v">{toTitle(record.status || 'draf')}</div>
                    </div>

                    <div className="app-waran-report-paragraph" style={{ marginTop: '0.45rem' }}>
                        Bahawasanya saya Pegawai Penguatkuasa Agama <strong>{record.pelaksana?.name || '-'}</strong>,
                        beralamat di <strong>{record.alamat_pejabat || 'Bahagian Pengurusan Penguatkuasaan, Jabatan Agama Islam Selangor'}</strong>,
                        dengan sesungguhnya telah melaksanakan waran tangkap seperti yang dinyatakan di atas.
                    </div>

                    <div className="app-waran-report-subtitle">LAPORAN</div>
                    <div className="app-waran-report-paragraph" style={{ whiteSpace: 'pre-wrap' }}>
                        {record.laporan || '-'}
                    </div>

                    <div className="app-waran-report-table" style={{ marginTop: '0.8rem' }}>
                        <div className="k">HASIL PERLAKSANAAN</div>
                        <div className="v">{record.hasil_perlaksanaan?.nama || '-'}</div>

                        <div className="k">TARIKH PERLAKSANAAN</div>
                        <div className="v">{formatDateTimeMalay(executionDateTime)}</div>
                    </div>
                </section>

                <section className="app-waran-signatures">
                    <div className="app-waran-signature-block">
                        <div className="t">Disediakan oleh</div>
                        <div className="line"></div>
                        <div className="name">{record.pelaksana?.name || '-'}</div>
                        <div className="role">Pegawai Penguatkuasa Agama</div>
                    </div>

                    <div className="app-waran-signature-block">
                        <div className="t">Disahkan oleh</div>
                        <div className="line"></div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default WaranPrint;
