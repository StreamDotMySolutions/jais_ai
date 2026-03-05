import React, { useEffect } from 'react';

const AttachmentPreviewModal = ({
    isOpen,
    title = 'Preview Lampiran',
    fileName,
    mime,
    url,
    onClose,
    onOpenTab,
    onOpenNewTab,
}) => {
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const onKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose?.();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [isOpen, onClose]);

    const handleOpenTab = onOpenTab || onOpenNewTab;

    if (!isOpen) {
        return null;
    }

    const isImage = typeof mime === 'string' && mime.startsWith('image/');
    const isPdf = mime === 'application/pdf' || (typeof fileName === 'string' && fileName.toLowerCase().endsWith('.pdf'));

    return (
        <div className="app-modal">
            <div className="app-modal-backdrop" onClick={onClose}></div>
            <div className="app-modal-content">
                <div className="app-modal-header">
                    <div>
                        <h4>{title}</h4>
                        <p>{fileName || '-'}</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                        {url && (
                            <button type="button" className="app-button app-button-ghost" onClick={handleOpenTab}>
                                Buka Tab
                            </button>
                        )}
                        <button type="button" className="app-modal-close" onClick={onClose} aria-label="Tutup">
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>
                </div>

                {!url && (
                    <div className="app-empty">Preview tidak tersedia.</div>
                )}

                {url && isImage && (
                    <div style={{ display: 'grid', placeItems: 'center' }}>
                        <img
                            src={url}
                            alt={fileName || 'Lampiran'}
                            style={{ maxWidth: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: '14px' }}
                        />
                    </div>
                )}

                {url && !isImage && (
                    <iframe
                        title={fileName || 'Preview'}
                        src={url}
                        style={{
                            width: '100%',
                            height: '70vh',
                            border: '1px solid #e3ebe7',
                            borderRadius: '14px',
                            background: '#ffffff',
                        }}
                    />
                )}

                {url && !isImage && !isPdf && (
                    <div className="app-detail-note" style={{ marginTop: '0.75rem' }}>
                        Format ini mungkin tidak disokong untuk preview. Cuba "Buka Tab".
                    </div>
                )}
            </div>
        </div>
    );
};

export default AttachmentPreviewModal;

