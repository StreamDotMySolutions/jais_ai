import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext({
    success: () => {},
    error: () => {},
    info: () => {},
});

const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const nextId = useRef(1);

    const remove = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const push = useCallback((type, message, opts = {}) => {
        const id = nextId.current++;
        const durationMs = Number.isFinite(opts.durationMs) ? opts.durationMs : 3500;
        setToasts((prev) => [...prev, { id, type, message }]);
        window.setTimeout(() => remove(id), durationMs);
    }, [remove]);

    const api = useMemo(() => ({
        success: (message, opts) => push('success', message, opts),
        error: (message, opts) => push('error', message, opts),
        info: (message, opts) => push('info', message, opts),
    }), [push]);

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div className="app-toasts" role="region" aria-label="Notifications">
                {toasts.map((t) => (
                    <div key={t.id} className={`app-toast app-toast--${t.type}`} role="status" aria-live="polite">
                        <div className="app-toast-body">{t.message}</div>
                        <button
                            type="button"
                            className="app-toast-close"
                            aria-label="Tutup notifikasi"
                            onClick={() => remove(t.id)}
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => useContext(ToastContext);

export default ToastProvider;

