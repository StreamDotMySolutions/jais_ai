import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { QRCodeSVG } from 'qrcode.react';

const POLL_MS = 3000;

const STATE_BADGE = {
  'connected':        { variant: 'success', label: 'Connected' },
  'waiting-for-scan': { variant: 'warning', label: 'Waiting for scan' },
  'authenticated':    { variant: 'info',    label: 'Authenticated — finalising…' },
  'booting':          { variant: 'secondary', label: 'Booting…' },
  'disconnected':     { variant: 'danger',  label: 'Disconnected' },
  'auth_failure':     { variant: 'danger',  label: 'Auth failure' },
  'offline':          { variant: 'dark',    label: 'Offline' },
};

const ScanQr = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const timerRef = useRef(null);

    const [status, setStatus] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        if (!apiUrl) {
            setError('REACT_APP_API_URL is not set.');
            setLoading(false);
            return;
        }
        try {
            const res = await axios.get(`${apiUrl}/admin/whatsappweb/status`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setStatus(res.data);
            setError('');
        } catch (err) {
            const msg = err?.response?.data?.message || err?.message || 'Failed to fetch status';
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
        timerRef.current = setInterval(fetchStatus, POLL_MS);
        return () => clearInterval(timerRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const state = status?.state || 'offline';
    const badge = STATE_BADGE[state] || STATE_BADGE.offline;

    return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center mb-3">
                <h3 className="mb-0 me-3">
                    <i className="bi bi-qr-code-scan me-2" />
                    Scan QR — WhatsApp Web
                </h3>
                <span className={`badge bg-${badge.variant}`}>{badge.label}</span>
            </div>

            <p className="text-muted">
                Halaman ini memaparkan status bridge WhatsApp Web (<code>server-3.js</code>) dan, jika perlu, QR code
                untuk memautkan semula peranti. Buka WhatsApp pada telefon → <strong>Linked Devices</strong> → <strong>Link a device</strong> dan imbas kod di bawah.
            </p>

            {error && (
                <div className="alert alert-danger" role="alert">
                    {error}
                </div>
            )}

            {loading && !status && (
                <div className="text-muted">
                    <span className="spinner-border spinner-border-sm me-2" />
                    Memuatkan status…
                </div>
            )}

            <div className="card shadow-sm">
                <div className="card-body">
                    {state === 'waiting-for-scan' && status?.qr ? (
                        <div className="text-center">
                            <QRCodeSVG value={status.qr} size={320} includeMargin />
                            <div className="mt-3 text-muted small">
                                Kod ini biasanya berputar setiap ~20 saat. Halaman akan refresh automatik.
                            </div>
                        </div>
                    ) : state === 'connected' ? (
                        <div className="text-center text-success">
                            <i className="bi bi-check-circle-fill" style={{ fontSize: '3rem' }} />
                            <h4 className="mt-3">WhatsApp Web sedang dalam talian</h4>
                            <p className="text-muted mb-0">Tidak perlu sebarang tindakan.</p>
                        </div>
                    ) : state === 'disconnected' || state === 'auth_failure' ? (
                        <div className="text-center">
                            <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }} />
                            <h5 className="mt-3">{badge.label}</h5>
                            {status?.reason && (
                                <p className="text-muted"><code>{status.reason}</code></p>
                            )}
                            <p className="text-muted small mb-0">
                                Bridge akan cuba semula secara automatik. Jika halaman kekal di status ini, mulakan semula proses bridge:
                                <br />
                                <code>pm2 restart whatsapp-web</code>
                            </p>
                        </div>
                    ) : state === 'offline' ? (
                        <div className="text-center text-muted">
                            <i className="bi bi-cloud-slash" style={{ fontSize: '3rem' }} />
                            <h5 className="mt-3">Bridge tidak melaporkan status</h5>
                            <p className="small mb-0">
                                Proses <code>server-3.js</code> mungkin tidak berjalan. Pada server, jalankan:
                                <br />
                                <code>pm2 restart whatsapp-web</code>
                            </p>
                        </div>
                    ) : (
                        <div className="text-center text-muted">
                            <span className="spinner-border me-2" />
                            <span>{badge.label}</span>
                        </div>
                    )}
                </div>
                <div className="card-footer text-muted small">
                    <div>State: <code>{state}</code></div>
                    {status?.pid ? <div>PID: {status.pid}</div> : null}
                    {status?.last_heartbeat_at ? (
                        <div>Last heartbeat: {new Date(status.last_heartbeat_at).toLocaleString()}</div>
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ScanQr;
