import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AttachmentPreviewModal from './SharedAttachmentPreviewModal';
import ConfirmModal from './SharedConfirmModal';
import InlineAlert from './SharedInlineAlert';
import { useToast } from './SharedToastProvider';

const formatBytes = (bytes) => {
    const value = Number(bytes);
    if (!Number.isFinite(value) || value <= 0) {
        return '-';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    const idx = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
    const num = value / (1024 ** idx);
    return `${num.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const buildDefaultDownloadUrl = (apiUrl, attachment) => {
    if (attachment?.download_url) {
        return attachment.download_url;
    }
    if (!apiUrl || !attachment?.id) {
        return '';
    }
    // i-WARAN default (can be overridden via getDownloadUrl prop)
    return `${apiUrl}/i-waran/attachments/${attachment.id}/download`;
};

const AttachmentSection = ({
    apiUrl,
    token,
    recordId,
    attachments = [],
    onAttachmentsChange,
    title = null,
    label = 'Muat naik fail (PDF/JPG/PNG) (max 50MB setiap fail)',
    accept = '.pdf,image/png,image/jpeg',
    canUpload = true,
    canDelete = true,
    maxFiles = 20,
    maxSizeMb = 50,
    getUploadUrl,
    getDeleteUrl,
    getDownloadUrl,
    extractUploadedItems,
    uploadFields = null,
    uploadPrefix = null,
    uploadButtonLabel = 'Upload',
}) => {
    const toast = useToast();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [uploadErrors, setUploadErrors] = useState([]);
    const [uploadMessage, setUploadMessage] = useState('');

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewMime, setPreviewMime] = useState('');
    const [previewName, setPreviewName] = useState('');

    const [thumbUrls, setThumbUrls] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);
    const disabledUpload = !recordId || uploading || !selectedFiles.length;

    const updateAttachments = (updater) => {
        if (typeof onAttachmentsChange !== 'function') {
            return;
        }
        onAttachmentsChange((prev) => {
            const current = Array.isArray(prev) ? prev : attachments;
            return typeof updater === 'function' ? updater(current) : updater;
        });
    };

    const resolveUploadUrl = () => {
        if (typeof getUploadUrl === 'function') {
            return getUploadUrl({ apiUrl, recordId });
        }
        if (!apiUrl || !recordId) {
            return '';
        }
        return `${apiUrl}/i-waran/${recordId}/attachments`;
    };

    const resolveDeleteUrl = (attachmentId) => {
        if (typeof getDeleteUrl === 'function') {
            return getDeleteUrl({ apiUrl, attachmentId, recordId });
        }
        if (!apiUrl || !attachmentId) {
            return '';
        }
        return `${apiUrl}/i-waran/attachments/${attachmentId}`;
    };

    const resolveDownloadUrl = (attachment) => {
        if (typeof getDownloadUrl === 'function') {
            return getDownloadUrl({ apiUrl, attachment, recordId });
        }
        return buildDefaultDownloadUrl(apiUrl, attachment);
    };

    const openPreview = (file) => {
        if (!apiUrl) {
            setPreviewError('API URL tidak diset.');
            return;
        }
        if (!file?.id) {
            setPreviewError('Fail tidak sah.');
            return;
        }

        const url = resolveDownloadUrl(file);
        if (!url) {
            setPreviewError('URL lampiran tidak dijumpai.');
            return;
        }

        setPreviewError('');
        setPreviewLoading(true);
        setPreviewName(file.file_name || 'Lampiran');

        axios.get(url, {
            headers,
            responseType: 'blob',
        })
            .then((response) => {
                const contentType = response.headers?.['content-type'] || file.mime || 'application/octet-stream';
                const blob = new Blob([response.data], { type: contentType });
                const blobUrl = window.URL.createObjectURL(blob);
                setPreviewUrl(blobUrl);
                setPreviewMime(contentType);
                setPreviewOpen(true);
            })
            .catch(() => {
                setPreviewError('Gagal membuka preview.');
            })
            .finally(() => setPreviewLoading(false));
    };

    const handleUpload = () => {
        if (!apiUrl || !recordId) {
            setUploadError('Sila simpan rekod dahulu sebelum muat naik fail.');
            return;
        }
        if (!selectedFiles.length) {
            setUploadError('Sila pilih fail untuk dimuat naik.');
            return;
        }
        if (uploading) {
            return;
        }

        if (selectedFiles.length > maxFiles) {
            setUploadError(`Maksimum ${maxFiles} fail untuk satu muat naik.`);
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setUploadError('');
        setUploadErrors([]);
        setUploadMessage('');

        const form = new FormData();
        const extraFields = typeof uploadFields === 'function' ? uploadFields() : uploadFields;
        if (extraFields && typeof extraFields === 'object') {
            Object.entries(extraFields).forEach(([key, value]) => {
                if (value === undefined || value === null) {
                    return;
                }
                form.append(String(key), value);
            });
        }
        selectedFiles.forEach((file) => form.append('files[]', file));

        const url = resolveUploadUrl();
        axios.post(url, form, {
            headers: {
                ...(headers || {}),
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress: (event) => {
                if (!event?.total) {
                    return;
                }
                const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
                setUploadProgress(percent);
            },
        })
            .then((response) => {
                const newItems = typeof extractUploadedItems === 'function'
                    ? (extractUploadedItems(response) || [])
                    : (response?.data?.data || []);
                updateAttachments((prev) => [...newItems, ...prev]);
                const msg = response?.data?.message || 'Fail berjaya dimuat naik.';
                setUploadMessage(msg);
                toast.success(msg);
                setSelectedFiles([]);
                setUploadProgress(100);
            })
            .catch((err) => {
                const responseData = err?.response?.data;
                const msg = responseData?.message || 'Gagal memuat naik fail.';
                setUploadError(msg);
                toast.error(msg);

                const validation = responseData?.errors || {};
                const nextErrors = Object.keys(validation).map((key) => {
                    const match = key.match(/files\.(\d+)/);
                    const idx = match ? Number(match[1]) : -1;
                    const fileName = selectedFiles?.[idx]?.name || (idx >= 0 ? `Fail #${idx + 1}` : key);
                    return { idx: idx >= 0 ? idx : 0, fileName, messages: validation[key] || [] };
                });
                if (nextErrors.length) {
                    setUploadErrors(nextErrors);
                }
            })
            .finally(() => {
                setUploading(false);
                setTimeout(() => setUploadProgress(0), 800);
            });
    };

    const handleDeleteAttachment = (attachmentId) => {
        if (!apiUrl) {
            toast.error('API URL tidak diset.');
            return;
        }
        const url = resolveDeleteUrl(attachmentId);
        if (!url) {
            toast.error('URL padam lampiran tidak dijumpai.');
            return;
        }

        axios.delete(url, { headers })
            .then((response) => {
                updateAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
                toast.success(response?.data?.message || 'Lampiran dipadam.');
            })
            .catch(() => {
                toast.error('Gagal padam lampiran.');
            });
    };

    useEffect(() => {
        if (!apiUrl) {
            return undefined;
        }

        const maxThumbBytes = 3 * 1024 * 1024;
        let disposed = false;

        const currentIds = new Set((attachments || []).map((f) => f.id));
        setThumbUrls((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                const idKey = Number(key);
                if (!currentIds.has(idKey)) {
                    try { window.URL.revokeObjectURL(next[key]); } catch (_) { /* ignore */ }
                    delete next[key];
                }
            });
            return next;
        });

        const candidates = (attachments || []).filter((file) => {
            if (!file?.id) return false;
            const mime = String(file?.mime || '');
            if (!mime.startsWith('image/')) return false;
            if (typeof file.size === 'number' && file.size > maxThumbBytes) return false;
            return !thumbUrls[file.id];
        });

        if (!candidates.length) {
            return undefined;
        }

        candidates.slice(0, 6).forEach((file) => {
            const url = resolveDownloadUrl(file);
            axios.get(url, {
                headers,
                responseType: 'blob',
            })
                .then((response) => {
                    if (disposed) return;
                    const contentType = response.headers?.['content-type'] || file.mime || 'image/*';
                    const blob = new Blob([response.data], { type: contentType });
                    const blobUrl = window.URL.createObjectURL(blob);
                    setThumbUrls((prev) => ({ ...prev, [file.id]: blobUrl }));
                })
                .catch(() => {
                    // ignore
                });
        });

        return () => {
            disposed = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, attachments, token]);

    useEffect(() => {
        return () => {
            try { if (previewUrl) window.URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
        };
    }, [previewUrl]);

    const helperText = useMemo(() => {
        if (!canUpload) {
            return '';
        }
        const parts = [];
        if (maxSizeMb) parts.push(`max ${maxSizeMb}MB setiap fail`);
        if (maxFiles) parts.push(`max ${maxFiles} fail`);
        return parts.length ? `(${parts.join(', ')})` : '';
    }, [canUpload, maxFiles, maxSizeMb]);

    return (
        <>
            <AttachmentPreviewModal
                isOpen={previewOpen}
                title={previewName}
                mime={previewMime}
                url={previewUrl}
                onClose={() => {
                    setPreviewOpen(false);
                    try { if (previewUrl) window.URL.revokeObjectURL(previewUrl); } catch (_) { /* ignore */ }
                    setPreviewUrl('');
                    setPreviewMime('');
                    setPreviewName('');
                }}
                onOpenNewTab={() => {
                    if (previewUrl) {
                        window.open(previewUrl, '_blank', 'noopener,noreferrer');
                    }
                }}
            />

            <ConfirmModal
                isOpen={!!deleteTarget}
                title="Padam Lampiran"
                description={deleteTarget ? `Padam lampiran "${deleteTarget.file_name}"? Tindakan ini tidak boleh dikembalikan.` : ''}
                confirmText="Padam"
                cancelText="Batal"
                variant="danger"
                onCancel={() => setDeleteTarget(null)}
                onConfirm={() => {
                    if (deleteTarget?.id) {
                        handleDeleteAttachment(deleteTarget.id);
                    }
                    setDeleteTarget(null);
                }}
            />

            {title && (
                <div className="app-card-header" style={{ paddingLeft: 0, paddingRight: 0 }}>
                    <h4 style={{ margin: 0 }}>{title}</h4>
                </div>
            )}

            {canUpload && (
                <div className="app-form-grid">
                    <div className="app-form-field" style={{ gridColumn: '1 / -1' }}>
                        <label>{label} {helperText}</label>
                        <div className="app-upload-row">
                            {uploadPrefix}
                            <input
                                className="app-upload-file"
                                type="file"
                                multiple
                                accept={accept}
                                onChange={(event) => {
                                    const files = Array.from(event.target.files || []);
                                    setSelectedFiles(files);
                                    setUploadError('');
                                    setUploadMessage('');
                                }}
                            />
                            <button
                                type="button"
                                className="app-button"
                                disabled={disabledUpload}
                                onClick={handleUpload}
                            >
                                {uploading ? 'Uploading...' : uploadButtonLabel}
                            </button>
                        </div>
                        {!recordId && (
                            <div className="app-detail-note">Simpan rekod dahulu untuk muat naik lampiran.</div>
                        )}
                        {uploadError && (
                            <InlineAlert type="error" message={uploadError} dismissible onClose={() => setUploadError('')} />
                        )}
                        {!!uploadErrors.length && (
                            <div className="app-form-error">
                                <strong>Ralat fail:</strong>
                                <ul style={{ margin: '0.5rem 0 0', paddingLeft: '1.1rem' }}>
                                    {uploadErrors.map((row) => (
                                        <li key={`${row.idx}-${row.fileName}`}>
                                            {row.fileName}: {row.messages.join(' ')}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {uploadMessage && (
                            <InlineAlert type="success" message={uploadMessage} dismissible onClose={() => setUploadMessage('')} />
                        )}
                        {uploading && (
                            <div className="app-progress" aria-label="Upload progress">
                                <div className="app-progress-track">
                                    <div className="app-progress-fill" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <div className="app-progress-meta">{uploadProgress}%</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {previewError && <div className="app-empty">{previewError}</div>}
            {previewLoading && <div className="app-detail-note">Membuka preview...</div>}

            {(attachments || []).length ? (
                <div style={{ marginTop: canUpload ? '1rem' : 0 }}>
                    <div className="app-detail-note app-detail-note-neutral" style={{ marginBottom: '0.6rem' }}>
                        {attachments.length} lampiran
                    </div>
                    <div className="app-attachment-strip">
                        {attachments.map((file) => (
                            <div key={file.id} className="app-attachment-chip">
                                <button
                                    type="button"
                                    className="app-attachment-main"
                                    onClick={() => openPreview(file)}
                                    title="Preview"
                                >
                                    <span className="app-attachment-thumb">
                                        {String(file?.mime || '').startsWith('image/') ? (
                                            thumbUrls[file.id] ? (
                                                <img src={thumbUrls[file.id]} alt="" />
                                            ) : (
                                                <i className="bi bi-image"></i>
                                            )
                                        ) : (
                                            <i className={`bi ${String(file?.file_name || '').toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark'}`}></i>
                                        )}
                                    </span>
                                    <span className="app-attachment-meta">
                                        <span className="app-attachment-name">{file.file_name}</span>
                                        <span className="app-attachment-size">{formatBytes(file.size)}</span>
                                    </span>
                                </button>
                                <span className="app-attachment-actions">
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => openPreview(file)}
                                        aria-label="Preview lampiran"
                                        title="Preview"
                                    >
                                        <i className="bi bi-eye"></i>
                                    </button>
                                    {canDelete && (
                                        <button
                                            type="button"
                                            className="app-icon-button"
                                            onClick={() => setDeleteTarget(file)}
                                            aria-label="Padam lampiran"
                                            title="Padam"
                                        >
                                            <i className="bi bi-trash3"></i>
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                <div className="app-empty" style={{ marginTop: canUpload ? '1rem' : 0 }}>Tiada lampiran.</div>
            )}
        </>
    );
};

export default AttachmentSection;
