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
    const [logoutBusy, setLogoutBusy] = useState(false);
    const [logoutMessage, setLogoutMessage] = useState('');

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

    const requestLogout = async () => {
        if (!apiUrl) return;
        const ok = window.confirm('Log keluar akaun WhatsApp yang sedang dipautkan? QR code baru akan dipaparkan untuk imbasan semula.');
        if (!ok) return;
        setLogoutBusy(true);
        setLogoutMessage('');
        try {
            await axios.post(`${apiUrl}/admin/whatsappweb/logout`, {}, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            });
            setLogoutMessage('Arahan logout telah dihantar. QR baru akan dipaparkan dalam beberapa saat.');
            // Fresh status right away.
            fetchStatus();
        } catch (err) {
            const msg = err?.response?.data?.error || err?.message || 'Logout gagal';
            setLogoutMessage(`Ralat: ${msg}`);
        } finally {
            setLogoutBusy(false);
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
    const platform = status?.platform || null;
    const script = status?.script || null;

    const restartHint = () => {
        if (platform === 'linux') {
            return <code>pm2 restart whatsapp-web</code>;
        }
        if (platform === 'win32') {
            return <code>node {script || 'server-dev.js'}</code>;
        }
        return (
            <>
                Linux: <code>pm2 restart whatsapp-web</code>
                <br />
                Windows: <code>node server-dev.js</code>
            </>
        );
    };

    return (
        <div className="container-fluid py-4">
            <div className="d-flex align-items-center mb-3">
                <h3 className="mb-0 me-3">
                    <i className="bi bi-qr-code-scan me-2" />
                    Scan QR — WhatsApp Web
                </h3>
                <span className={`badge bg-${badge.variant}`}>{badge.label}</span>
                <button
                    type="button"
                    className="btn btn-outline-danger btn-sm ms-auto"
                    onClick={requestLogout}
                    disabled={logoutBusy || state === 'offline'}
                    title="Paksa logout peranti yang sedang dipautkan dan paparkan QR baru"
                >
                    {logoutBusy ? (
                        <><span className="spinner-border spinner-border-sm me-2" />Logging out…</>
                    ) : (
                        <><i className="bi bi-box-arrow-right me-1" />Logout peranti</>
                    )}
                </button>
            </div>

            {logoutMessage && (
                <div className="alert alert-info py-2" role="alert">
                    {logoutMessage}
                </div>
            )}

            <p className="text-muted">
                Halaman ini memaparkan status bridge WhatsApp Web dan, jika perlu, QR code untuk memautkan semula peranti.
                Buka WhatsApp pada telefon → <strong>Linked Devices</strong> → <strong>Link a device</strong> dan imbas kod di bawah.
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
                                Bridge akan cuba semula secara automatik. Jika halaman kekal di status ini, mulakan semula proses bridge: {restartHint()}
                            </p>
                        </div>
                    ) : state === 'offline' ? (
                        <div className="text-center text-muted">
                            <i className="bi bi-cloud-slash" style={{ fontSize: '3rem' }} />
                            <h5 className="mt-3">Bridge tidak melaporkan status</h5>
                            <p className="small mb-0">
                                Proses bridge mungkin tidak berjalan. Jalankan: {restartHint()}
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
                    {script ? <div>Script: <code>{script}</code>{platform ? ` (${platform})` : ''}</div> : null}
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
