import React from 'react';

const iconByType = {
    success: 'bi-check-circle',
    error: 'bi-exclamation-triangle',
    warning: 'bi-exclamation-circle',
    info: 'bi-info-circle',
};

const InlineAlert = ({
    type = 'info',
    message,
    children,
    dismissible = false,
    onClose,
    className = '',
}) => {
    const icon = iconByType[type] || iconByType.info;
    const body = children ?? message;

    if (!body) {
        return null;
    }

    const canClose = Boolean(dismissible && typeof onClose === 'function');

    return (
        <div className={`app-inline-alert app-inline-alert--${type}${className ? ` ${className}` : ''}`}>
            <div className="app-inline-alert-body">
                <i className={`bi ${icon}`}></i>
                <div className="app-inline-alert-text">{body}</div>
            </div>
            {canClose && (
                <button
                    type="button"
                    className="app-alert-close"
                    aria-label="Tutup"
                    onClick={onClose}
                >
                    <i className="bi bi-x-lg"></i>
                </button>
            )}
        </div>
    );
};

export default InlineAlert;

