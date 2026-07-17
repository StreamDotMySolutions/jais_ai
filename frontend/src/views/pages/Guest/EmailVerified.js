import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

function EmailVerified() {
    const [searchParams] = useSearchParams();
    const status = searchParams.get('status') || '';
    const [icon, setIcon] = useState('bi-check-circle-fill text-success');
    const [title, setTitle] = useState('Emel Disahkan');
    const [message, setMessage] = useState('');

    useEffect(() => {
        switch (status) {
            case 'success':
                setIcon('bi-check-circle-fill text-success');
                setTitle('Emel Berjaya Disahkan');
                setMessage('Akaun anda telah berjaya disahkan. Sila log masuk untuk meneruskan.');
                break;
            case 'already_verified':
                setIcon('bi-info-circle-fill text-info');
                setTitle('Emel Telah Disahkan');
                setMessage('Emel anda telah disahkan sebelum ini. Sila log masuk untuk meneruskan.');
                break;
            case 'invalid':
                setIcon('bi-exclamation-triangle-fill text-danger');
                setTitle('Pautan Tidak Sah');
                setMessage('Pautan verifikasi tidak sah atau telah tamat tempoh. Sila daftar semula atau hubungi pentadbir.');
                break;
            default:
                setIcon('bi-question-circle-fill text-warning');
                setTitle('Status Tidak Diketahui');
                setMessage('Tiada status verifikasi yang boleh dipaparkan.');
        }
    }, [status]);

    return (
        <div className="auth-shell">
            <div className="auth-card">
                <div className="auth-hero">
                    <div>
                        <span className="auth-badge">JAIS AI</span>
                        <h2 className="auth-hero-title">Verifikasi Emel</h2>
                        <p className="auth-hero-subtitle">Pengesahan alamat emel untuk akaun Portal Aduan JAIS.</p>
                    </div>
                </div>

                <div className="auth-form">
                    <div className="text-center py-4">
                        <div className="mb-3">
                            <i className={`bi ${icon}`} style={{ fontSize: '3rem' }}></i>
                        </div>
                        <h2 className="auth-title">{title}</h2>
                        <p className="text-muted">{message}</p>
                        <div className="mt-4">
                            <Link className="btn btn-primary" to="/sign-in">Log masuk</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default EmailVerified;
