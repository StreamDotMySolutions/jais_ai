import React, { useEffect } from 'react';

const ConfirmModal = ({
    isOpen,
    title = 'Sahkan Tindakan',
    description = '',
    confirmText = 'Sahkan',
    cancelText = 'Batal',
    variant = 'danger', // danger | primary
    confirmDisabled = false,
    onConfirm,
    onCancel,
}) => {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onCancel?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onCancel]);

    if (!isOpen) {
        return null;
    }

    const confirmClass = variant === 'primary'
        ? 'app-button'
        : 'app-button app-button-danger';

    return (
        <div className="app-modal">
            <div className="app-modal-backdrop" onClick={onCancel}></div>
            <div className="app-modal-content" style={{ width: 'min(560px, 95vw)' }}>
                <div className="app-modal-header">
                    <div>
                        <h4>{title}</h4>
                        {description ? <p>{description}</p> : null}
                    </div>
                    <button type="button" className="app-modal-close" onClick={onCancel} aria-label="Tutup">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </div>

                <div className="app-form-actions" style={{ justifyContent: 'flex-end' }}>
                    <button type="button" className="app-button app-button-ghost" onClick={onCancel}>
                        {cancelText}
                    </button>
                    <button type="button" className={confirmClass} onClick={onConfirm} disabled={confirmDisabled}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;

