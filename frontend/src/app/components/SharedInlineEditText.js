import React, { useEffect, useMemo, useRef, useState } from 'react';

// Lightweight inline-edit (no extra deps). Saves a single field via parent callback.
const SharedInlineEditText = ({
    value,
    placeholder = '-',
    canEdit = false,
    inputType = 'text',
    maxLength,
    mode = 'input', // input | textarea | select
    textareaRows = 4,
    textareaAutoGrow = false,
    fullWidth = false,
    options = [], // for select: [{ value, label }]
    formatDisplay,
    onConfirm,
}) => {
    const displayText = useMemo(() => {
        if (typeof formatDisplay === 'function') {
            const formatted = formatDisplay(value);
            const text = (formatted ?? '').toString();
            return text.trim() ? text : placeholder;
        }

        if (mode === 'select') {
            const raw = (value ?? '').toString();
            const hit = options.find((o) => (o?.value ?? '').toString() === raw);
            const label = (hit?.label ?? '').toString();
            return label.trim() ? label : placeholder;
        }

        const v = (value ?? '').toString();
        return v.trim() ? v : placeholder;
    }, [value, placeholder, mode, options, formatDisplay]);

    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState((value ?? '').toString());
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isEditing) {
            setDraft((value ?? '').toString());
            setError('');
        }
    }, [value, isEditing]);

    useEffect(() => {
        if (isEditing && inputRef.current && typeof inputRef.current.focus === 'function') {
            inputRef.current.focus();
            // Some input types (e.g. date/time/select) do not support selection APIs.
            try {
                const el = inputRef.current;
                const tag = (el.tagName || '').toUpperCase();
                const type = tag === 'INPUT' ? (el.type || '').toLowerCase() : '';
                const selectionUnsupported = ['date', 'time', 'month', 'week', 'datetime-local', 'color'].includes(type);
                if (!selectionUnsupported && (tag === 'INPUT' || tag === 'TEXTAREA') && typeof el.setSelectionRange === 'function') {
                    const len = String(el.value || '').length;
                    el.setSelectionRange(len, len);
                }
            } catch (_) {
                // no-op
            }
        }
    }, [isEditing]);

    useEffect(() => {
        if (!isEditing || mode !== 'textarea' || !textareaAutoGrow || !inputRef.current) {
            return;
        }
        const el = inputRef.current;
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
    }, [isEditing, mode, textareaAutoGrow, draft]);

    const startEdit = () => {
        if (!canEdit || isSaving) return;
        setIsEditing(true);
    };

    const cancel = () => {
        if (isSaving) return;
        setIsEditing(false);
        setDraft((value ?? '').toString());
        setError('');
    };

    const confirm = async () => {
        if (!canEdit || isSaving) return;
        setError('');
        setIsSaving(true);
        try {
            await onConfirm(draft);
            setIsEditing(false);
        } catch (e) {
            setError(e?.message || 'Gagal menyimpan.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleKeyDown = (event) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            cancel();
            return;
        }
        if (event.key === 'Enter' && inputType !== 'textarea') {
            event.preventDefault();
            confirm();
        }
    };

    if (!canEdit) {
        return <span>{displayText}</span>;
    }

    return (
        <span className={`app-inline-edit${fullWidth ? ' is-full' : ''}`}>
            {!isEditing && (
                <button
                    type="button"
                    className="app-inline-edit-display"
                    onClick={startEdit}
                    title="Klik untuk kemaskini"
                >
                    <span className={`app-inline-edit-text ${displayText === placeholder ? 'is-placeholder' : ''}`}>
                        {displayText}
                    </span>
                    <i className="bi bi-pencil app-inline-edit-icon" aria-hidden="true"></i>
                </button>
            )}

            {isEditing && (
                <span className={`app-inline-edit-editor${fullWidth ? ' is-full' : ''}`}>
                    {mode === 'textarea' && (
                        <textarea
                            ref={inputRef}
                            value={draft}
                            maxLength={maxLength}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`app-inline-edit-input app-inline-edit-textarea${fullWidth ? ' is-full' : ''}`}
                            rows={textareaRows}
                            style={textareaAutoGrow ? { overflow: 'hidden', resize: 'vertical' } : undefined}
                            disabled={isSaving}
                        />
                    )}
                    {mode === 'select' && (
                        <select
                            ref={inputRef}
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`app-inline-edit-input${fullWidth ? ' is-full' : ''}`}
                            disabled={isSaving}
                        >
                            <option value="">{placeholder}</option>
                            {options.map((o) => (
                                <option key={(o?.value ?? '').toString()} value={(o?.value ?? '').toString()}>
                                    {(o?.label ?? '').toString()}
                                </option>
                            ))}
                        </select>
                    )}
                    {mode === 'input' && (
                        <input
                            ref={inputRef}
                            type={inputType}
                            value={draft}
                            maxLength={maxLength}
                            onChange={(e) => setDraft(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className={`app-inline-edit-input${fullWidth ? ' is-full' : ''}`}
                            disabled={isSaving}
                        />
                    )}
                    <button
                        type="button"
                        className="app-icon-button app-icon-button-xs"
                        onClick={confirm}
                        disabled={isSaving}
                        title="Simpan"
                    >
                        <i className="bi bi-check2" aria-hidden="true"></i>
                    </button>
                    <button
                        type="button"
                        className="app-icon-button app-icon-button-xs"
                        onClick={cancel}
                        disabled={isSaving}
                        title="Batal"
                    >
                        <i className="bi bi-x" aria-hidden="true"></i>
                    </button>
                </span>
            )}

            {error && <span className="app-inline-edit-error">{error}</span>}
        </span>
    );
};

export default SharedInlineEditText;
