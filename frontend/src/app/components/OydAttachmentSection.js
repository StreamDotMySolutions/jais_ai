import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import AttachmentPreviewModal from './SharedAttachmentPreviewModal';
import ConfirmModal from './SharedConfirmModal';
import InlineAlert from './SharedInlineAlert';
import { useToast } from './SharedToastProvider';

const OydAttachmentSection = ({
    compact = false,
    apiUrl,
    token,
    complaintId,
    recordId,
    onBeforeUpload,
    attachments = [],
    onAttachmentsChange,
    onOydScanned,
    category = 'ic',
    onCategoryChange,
}) => {
    const toast = useToast();
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadError, setUploadError] = useState('');
    const [uploadMessage, setUploadMessage] = useState('');
    const [uploadPopoverOpen, setUploadPopoverOpen] = useState(false);

    const [previewOpen, setPreviewOpen] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [previewError, setPreviewError] = useState('');
    const [previewUrl, setPreviewUrl] = useState('');
    const [previewMime, setPreviewMime] = useState('');
    const [previewName, setPreviewName] = useState('');
    const [thumbUrls, setThumbUrls] = useState({});
    const [deleteTarget, setDeleteTarget] = useState(null);

    const headers = useMemo(() => (token ? { Authorization: `Bearer ${token}` } : undefined), [token]);
    const disabledUpload = uploading || !selectedFiles.length;

    const dedupeAttachments = (items) => {
        if (!Array.isArray(items)) return items;
        const map = new Map();
        items.forEach((item, idx) => {
            if (!item) return;
            const key = item.id != null ? `id:${item.id}` : `idx:${idx}`;
            map.set(key, item);
        });
        return Array.from(map.values());
    };

    const updateAttachments = (updater) => {
        if (typeof onAttachmentsChange !== 'function') return;
        onAttachmentsChange((prev) => {
            const current = Array.isArray(prev) ? prev : attachments;
            const next = typeof updater === 'function' ? updater(current) : updater;
            return dedupeAttachments(next);
        });
    };

    const uploadUrl = (targetRecordId) => `${apiUrl}/complaints/${complaintId}/oyds/${targetRecordId}/media`;
    const deleteUrl = (attachmentId) => `${apiUrl}/complaints/${complaintId}/oyd-media/${attachmentId}`;
    const downloadUrl = (attachment) => `${apiUrl}/complaints/${complaintId}/oyd-media/${attachment?.id}/download`;

    const openPreview = (file) => {
        if (!apiUrl || !file?.id) return;
        setPreviewError('');
        setPreviewLoading(true);
        setPreviewName(file.file_name || 'Lampiran');
        axios.get(downloadUrl(file), {
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
        const run = async () => {
            let targetRecordId = recordId;
            if (!targetRecordId && typeof onBeforeUpload === 'function') {
                targetRecordId = await onBeforeUpload();
            }
            if (!targetRecordId) {
                setUploadError('Sila isi maklumat OYDS atau simpan sekurang-kurangnya satu field dahulu sebelum muat naik.');
                return;
            }
            if (!selectedFiles.length || uploading) return;

            setUploading(true);
            setUploadProgress(0);
            setUploadError('');
            setUploadMessage('');

            const form = new FormData();
            form.append('category', category || 'ic');
            selectedFiles.forEach((file) => form.append('files[]', file));

            axios.post(uploadUrl(targetRecordId), form, {
                headers: {
                    ...(headers || {}),
                    'Content-Type': 'multipart/form-data',
                },
                onUploadProgress: (event) => {
                    if (!event?.total) return;
                    const percent = Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100)));
                    setUploadProgress(percent);
                },
            })
                .then((response) => {
                    const uploaded = response?.data?.media || [];
                    updateAttachments(uploaded);
                    const msg = response?.data?.message || 'Lampiran OYDS berjaya dimuat naik.';
                    setUploadMessage(msg);
                    toast.success(msg);
                    if (response?.data?.scan_message) {
                        toast.success(response.data.scan_message);
                    }
                    if (typeof onOydScanned === 'function' && response?.data?.scan_result) {
                        onOydScanned(response.data.scan_result);
                    }
                    setSelectedFiles([]);
                    setUploadProgress(100);
                    setUploadPopoverOpen(false);
                })
                .catch((err) => {
                    const msg = err?.response?.data?.message || 'Gagal memuat naik lampiran OYDS.';
                    setUploadError(msg);
                    toast.error(msg);
                })
                .finally(() => {
                    setUploading(false);
                    setTimeout(() => setUploadProgress(0), 800);
                });
        };

        run().catch(() => {
            setUploadError('Gagal memproses muat naik lampiran OYDS.');
            toast.error('Gagal memproses muat naik lampiran OYDS.');
        });
    };

    const handleDeleteAttachment = (attachmentId) => {
        axios.delete(deleteUrl(attachmentId), { headers })
            .then((response) => {
                updateAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
                toast.success(response?.data?.message || 'Lampiran dipadam.');
            })
            .catch(() => {
                toast.error('Gagal padam lampiran.');
            });
    };

    useEffect(() => {
        if (!apiUrl) return undefined;
        const maxThumbBytes = 3 * 1024 * 1024;
        let disposed = false;
        const currentIds = new Set((attachments || []).map((f) => f.id));

        Object.entries(thumbUrls).forEach(([id, url]) => {
            if (!currentIds.has(Number(id))) {
                window.URL.revokeObjectURL(url);
            }
        });

        const tasks = (attachments || [])
            .filter((file) => String(file?.mime || '').startsWith('image/'))
            .filter((file) => !thumbUrls[file.id])
            .filter((file) => Number(file?.size || 0) > 0 && Number(file?.size || 0) <= maxThumbBytes)
            .map(async (file) => {
                try {
                    const response = await axios.get(downloadUrl(file), { headers, responseType: 'blob' });
                    const blobUrl = window.URL.createObjectURL(response.data);
                    return { id: file.id, url: blobUrl };
                } catch (_err) {
                    return null;
                }
            });

        if (!tasks.length) return () => {
            Object.values(thumbUrls).forEach((url) => window.URL.revokeObjectURL(url));
        };

        Promise.all(tasks).then((items) => {
            if (disposed) return;
            setThumbUrls((prev) => {
                const next = { ...prev };
                items.filter(Boolean).forEach((item) => { next[item.id] = item.url; });
                return next;
            });
        });

        return () => {
            disposed = true;
            Object.values(thumbUrls).forEach((url) => window.URL.revokeObjectURL(url));
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [attachments, apiUrl, token]);

    useEffect(() => () => {
        if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    }, [previewUrl]);

    return (
        <div className={`app-oyds-attachment-section ${compact ? 'is-compact' : ''}`}>
            <AttachmentPreviewModal
                isOpen={previewOpen}
                fileName={previewName}
                mime={previewMime}
                url={previewUrl}
                onClose={() => {
                    setPreviewOpen(false);
                    if (previewUrl) {
                        window.URL.revokeObjectURL(previewUrl);
                        setPreviewUrl('');
                    }
                }}
                onOpenTab={() => {
                    if (previewUrl) window.open(previewUrl, '_blank', 'noopener,noreferrer');
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
                    if (deleteTarget?.id) handleDeleteAttachment(deleteTarget.id);
                    setDeleteTarget(null);
                }}
            />

            <div className="app-form-grid">
                <div className="app-form-field" style={{ gridColumn: '1 / -1' }}>
                    {!compact && <label>Lampiran OYDS Muat naik fail (PDF/JPG/PNG) (max 50MB setiap fail)</label>}

                    {compact ? (
                        <div className="app-oyds-upload-compact-wrap">
                            <div className="app-oyds-strip-row">
                                <div className="app-oyds-attachment-strip">
                                    {(attachments || []).map((file) => (
                                        <div key={file.id} className="app-oyds-attachment-pill">
                                            <button
                                                type="button"
                                                className="app-oyds-attachment-pill-main"
                                                onClick={() => openPreview(file)}
                                                title="Preview"
                                            >
                                                <span className="app-oyds-attachment-pill-thumb">
                                                    {String(file?.mime || '').startsWith('image/') ? (
                                                        thumbUrls[file.id] ? <img src={thumbUrls[file.id]} alt="" /> : <i className="bi bi-image"></i>
                                                    ) : (
                                                        <i className={`bi ${String(file?.file_name || '').toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark'}`}></i>
                                                    )}
                                                </span>
                                                <span className="app-oyds-attachment-pill-name" title={file.file_name}>{file.file_name}</span>
                                            </button>
                                            <span className="app-oyds-attachment-pill-actions">
                                                <button
                                                    type="button"
                                                    className="app-icon-button"
                                                    onClick={() => openPreview(file)}
                                                    aria-label="Preview lampiran"
                                                    title="Preview"
                                                >
                                                    <i className="bi bi-eye"></i>
                                                </button>
                                                <button
                                                    type="button"
                                                    className="app-icon-button"
                                                    onClick={() => setDeleteTarget(file)}
                                                    aria-label="Padam lampiran"
                                                    title="Padam"
                                                >
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </span>
                                        </div>
                                    ))}
                                    <button
                                        type="button"
                                        className="app-button app-oyds-upload-trigger"
                                        onClick={() => setUploadPopoverOpen((prev) => !prev)}
                                    >
                                        {uploadPopoverOpen ? 'Tutup Muat Naik' : 'Muat Naik'}
                                    </button>
                                </div>
                            </div>
                            {uploadPopoverOpen && (
                                <div className="app-oyds-upload-popover">
                                    <div className="app-upload-row">
                                        <select
                                            value={category || 'ic'}
                                            onChange={(event) => onCategoryChange?.(event.target.value)}
                                        >
                                            <option value="ic">IC</option>
                                            <option value="bukti">Gambar Bukti</option>
                                            <option value="lain_lain">Lain-lain</option>
                                        </select>
                                        <input
                                            className="app-upload-file"
                                            type="file"
                                            multiple
                                            accept=".pdf,image/png,image/jpeg,image/webp"
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
                                            {uploading ? 'Uploading...' : 'Sahkan Muat Naik'}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="app-upload-row">
                            <select
                                value={category || 'ic'}
                                onChange={(event) => onCategoryChange?.(event.target.value)}
                            >
                                <option value="ic">IC</option>
                                <option value="bukti">Gambar Bukti</option>
                                <option value="lain_lain">Lain-lain</option>
                            </select>
                            <input
                                className="app-upload-file"
                                type="file"
                                multiple
                                accept=".pdf,image/png,image/jpeg,image/webp"
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
                                {uploading ? 'Uploading...' : 'Muat Naik'}
                            </button>
                        </div>
                    )}

                    {!recordId && !onBeforeUpload && (
                        <div className="app-detail-note">Simpan laporan dahulu sebelum muat naik lampiran OYDS.</div>
                    )}
                    {uploadError && (
                        <InlineAlert type="error" message={uploadError} dismissible onClose={() => setUploadError('')} />
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

            {previewError && <div className="app-empty">{previewError}</div>}
            {previewLoading && <div className="app-detail-note">Membuka preview...</div>}

            {!compact && (attachments || []).length ? (
                <div style={{ marginTop: '1rem' }}>
                    {!compact && (
                        <div className="app-detail-note app-detail-note-neutral" style={{ marginBottom: '0.6rem' }}>
                            {attachments.length} lampiran
                        </div>
                    )}
                    <div className="app-oyds-attachment-strip">
                        {attachments.map((file) => (
                            <div key={file.id} className="app-oyds-attachment-pill">
                                <button
                                    type="button"
                                    className="app-oyds-attachment-pill-main"
                                    onClick={() => openPreview(file)}
                                    title="Preview"
                                >
                                    <span className="app-oyds-attachment-pill-thumb">
                                        {String(file?.mime || '').startsWith('image/') ? (
                                            thumbUrls[file.id] ? <img src={thumbUrls[file.id]} alt="" /> : <i className="bi bi-image"></i>
                                        ) : (
                                            <i className={`bi ${String(file?.file_name || '').toLowerCase().endsWith('.pdf') ? 'bi-file-earmark-pdf' : 'bi-file-earmark'}`}></i>
                                        )}
                                    </span>
                                    <span className="app-oyds-attachment-pill-name" title={file.file_name}>{file.file_name}</span>
                                </button>
                                <span className="app-oyds-attachment-pill-actions">
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => openPreview(file)}
                                        aria-label="Preview lampiran"
                                        title="Preview"
                                    >
                                        <i className="bi bi-eye"></i>
                                    </button>
                                    <button
                                        type="button"
                                        className="app-icon-button"
                                        onClick={() => setDeleteTarget(file)}
                                        aria-label="Padam lampiran"
                                        title="Padam"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            ) : (
                !compact ? (
                    <div className="app-empty" style={{ marginTop: '0.8rem' }}>
                        Tiada lampiran.
                    </div>
                ) : null
            )}
        </div>
    );
};

export default OydAttachmentSection;
