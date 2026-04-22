import React, { useEffect, useRef } from 'react';
import SearchSelect from '../../../libs/SearchSelect';

const ComplaintListFilter = ({
    isPublicRole,
    caseType,
    statusOptions,
    districtOptions,
    actionStatusOptions,
    ipStatusOptions,
    prosecutionStatusOptions,
    offenseOptions,
    mahkamahOptions,
    draftFilters,
    setDraftFilters,
    onSearch,
    onReset,
    advancedOpen,
    setAdvancedOpen,
}) => {
    const advancedRef = useRef(null);

    const districtLabel = (id) => {
        const row = (districtOptions || []).find((item) => String(item.id) === String(id));
        return row?.name || id;
    };

    const offenseLabel = (id) => {
        const row = (offenseOptions || []).find((item) => String(item.value) === String(id));
        return row?.label || id;
    };

    const mahkamahLabel = (id) => {
        const row = (mahkamahOptions || []).find((item) => String(item.value) === String(id));
        return row?.label || id;
    };

    const inlineChips = [
        draftFilters.complaintNo ? { key: 'complaintNo', label: `No Aduan:${draftFilters.complaintNo}` } : null,
        draftFilters.complainant ? { key: 'complainant', label: `Pengadu:${draftFilters.complainant}` } : null,
        draftFilters.summaryText ? { key: 'summaryText', label: `Ringkasan:${draftFilters.summaryText}` } : null,
        draftFilters.caseRegisterNo ? { key: 'caseRegisterNo', label: `No Daftar Kes:${draftFilters.caseRegisterNo}` } : null,
        draftFilters.offenseText ? { key: 'offenseText', label: `Kesalahan:${offenseLabel(draftFilters.offenseText)}` } : null,
        draftFilters.reportText ? { key: 'reportText', label: `Laporan:${draftFilters.reportText}` } : null,
        draftFilters.oydText ? { key: 'oydText', label: `OYDS:${draftFilters.oydText}` } : null,
        draftFilters.courtDate ? { key: 'courtDate', label: `Tarikh Sebutan:${draftFilters.courtDate}` } : null,
        draftFilters.investigationNotes ? { key: 'investigationNotes', label: `Catatan Siasatan:${draftFilters.investigationNotes}` } : null,
        draftFilters.courtText ? { key: 'courtText', label: `Mahkamah:${mahkamahLabel(draftFilters.courtText)}` } : null,
        draftFilters.modifiedDate ? { key: 'modifiedDate', label: `Modified Time:${draftFilters.modifiedDate}` } : null,
        draftFilters.modifiedUser ? { key: 'modifiedUser', label: `Modified User:${draftFilters.modifiedUser}` } : null,
        draftFilters.status ? { key: 'status', label: `Status:${draftFilters.status}` } : null,
        draftFilters.district ? { key: 'district', label: `Daerah:${districtLabel(draftFilters.district)}` } : null,
        draftFilters.classification ? { key: 'classification', label: `Klasifikasi:${draftFilters.classification}` } : null,
        draftFilters.receiver ? { key: 'receiver', label: `Penerima:${draftFilters.receiver}` } : null,
        draftFilters.approver ? { key: 'approver', label: `Pengesah:${draftFilters.approver}` } : null,
        draftFilters.channel ? { key: 'channel', label: `Kaedah:${draftFilters.channel}` } : null,
        draftFilters.fromDate ? { key: 'fromDate', label: `Dari:${draftFilters.fromDate}` } : null,
        draftFilters.toDate ? { key: 'toDate', label: `Hingga:${draftFilters.toDate}` } : null,
        draftFilters.actionStatus ? { key: 'actionStatus', label: `Status Tindakan:${draftFilters.actionStatus}` } : null,
        draftFilters.incidentFromDate ? { key: 'incidentFromDate', label: `Kejadian Dari:${draftFilters.incidentFromDate}` } : null,
        draftFilters.incidentToDate ? { key: 'incidentToDate', label: `Kejadian Hingga:${draftFilters.incidentToDate}` } : null,
    ].filter(Boolean);

    useEffect(() => {
        if (!advancedOpen) return undefined;
        const handleClickOutside = (event) => {
            if (!advancedRef.current) return;
            if (!advancedRef.current.contains(event.target)) {
                setAdvancedOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [advancedOpen, setAdvancedOpen]);

    return (
        <form className="app-filter" onSubmit={onSearch}>
            <div className="app-filter-row app-filter-row-main">
                <div className="app-filter-field app-filter-field-main">
                    <label>Keyword</label>
                    <div className="app-filter-input app-filter-input-advanced" ref={advancedRef}>
                        <i className="bi bi-search app-filter-input-icon" aria-hidden="true"></i>
                        {inlineChips.map((chip) => (
                            <span key={chip.key} className="app-inline-search-chip">
                                <span>{chip.label}</span>
                                <button
                                    type="button"
                                    aria-label={`Buang ${chip.label}`}
                                    onClick={() => setDraftFilters({ ...draftFilters, [chip.key]: '' })}
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            </span>
                        ))}
                        <input
                            className="app-filter-keyword-input"
                            type="text"
                            placeholder="Carian Aduan"
                            value={draftFilters.keyword}
                            onChange={(event) => setDraftFilters({ ...draftFilters, keyword: event.target.value })}
                        />
                        {draftFilters.keyword && (
                            <button
                                type="button"
                                className="app-search-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => setDraftFilters({ ...draftFilters, keyword: '' })}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                        <button
                            type="button"
                            className={`app-search-advanced-toggle ${advancedOpen ? 'active' : ''}`}
                            aria-label="Buka penapis lanjut"
                            title="Penapis lanjut"
                            onClick={() => setAdvancedOpen((prev) => !prev)}
                        >
                            <i className="bi bi-sliders"></i>
                        </button>

                        {advancedOpen && (
                            <div className="app-advanced-search-popover">
                                <div className="app-advanced-search-grid">
                                    <div className="app-filter-field">
                                        <label>No Aduan</label>
                                        <input
                                            type="text"
                                            placeholder="Contoh: AJ-Petaling / 2026 / 04 / 0001"
                                            value={draftFilters.complaintNo}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, complaintNo: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Nama Pengadu</label>
                                        <input
                                            type="text"
                                            placeholder="Nama pengadu..."
                                            value={draftFilters.complainant}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, complainant: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Ringkasan</label>
                                        <input
                                            type="text"
                                            placeholder="Kata kunci ringkasan..."
                                            value={draftFilters.summaryText}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, summaryText: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>No. Daftar Kes</label>
                                        <input
                                            type="text"
                                            placeholder="No. daftar kes..."
                                            value={draftFilters.caseRegisterNo}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, caseRegisterNo: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <SearchSelect
                                            label="Kesalahan"
                                            value={draftFilters.offenseText}
                                            options={offenseOptions}
                                            placeholder="-- Pilih Kesalahan Disyaki --"
                                            searchPlaceholder="Cari kesalahan..."
                                            onChange={(value) => setDraftFilters({ ...draftFilters, offenseText: value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Laporan</label>
                                        <input
                                            type="text"
                                            placeholder="Kata kunci laporan..."
                                            value={draftFilters.reportText}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, reportText: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Maklumat OYDS</label>
                                        <input
                                            type="text"
                                            placeholder="Nama / No K/P / file OYDS..."
                                            value={draftFilters.oydText}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, oydText: event.target.value })}
                                        />
                                    </div>
                                    {!isPublicRole && (
                                        <div className="app-filter-field">
                                            <label>Status</label>
                                            <select
                                                value={draftFilters.status}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, status: event.target.value })}
                                            >
                                                {statusOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    <div className="app-filter-field">
                                        <label>Daerah</label>
                                        <select
                                            value={draftFilters.district}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, district: event.target.value })}
                                        >
                                            <option value="">Semua</option>
                                            {districtOptions.map((district) => (
                                                <option key={district.id} value={district.id}>
                                                    {district.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Dari Tarikh</label>
                                        <input
                                            type="date"
                                            value={draftFilters.fromDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, fromDate: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Hingga Tarikh</label>
                                        <input
                                            type="date"
                                            value={draftFilters.toDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, toDate: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Tarikh Sebutan (Bon Mahkamah)</label>
                                        <input
                                            type="date"
                                            value={draftFilters.courtDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, courtDate: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Catatan Siasatan</label>
                                        <input
                                            type="text"
                                            placeholder="Kata kunci catatan siasatan..."
                                            value={draftFilters.investigationNotes}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, investigationNotes: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <SearchSelect
                                            label="Mahkamah"
                                            value={draftFilters.courtText}
                                            options={mahkamahOptions}
                                            placeholder="-- Pilih Mahkamah --"
                                            searchPlaceholder="Cari mahkamah..."
                                            onChange={(value) => setDraftFilters({ ...draftFilters, courtText: value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Modified Time</label>
                                        <input
                                            type="date"
                                            value={draftFilters.modifiedDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, modifiedDate: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Modified User</label>
                                        <input
                                            type="text"
                                            placeholder="Nama pengguna kemaskini..."
                                            value={draftFilters.modifiedUser}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, modifiedUser: event.target.value })}
                                        />
                                    </div>
                                    {!isPublicRole && caseType !== 'AK' && (
                                        <div className="app-filter-field">
                                            <label>Klasifikasi (AJ)</label>
                                            <select
                                                value={draftFilters.classification}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, classification: event.target.value })}
                                            >
                                                <option value="">Semua</option>
                                                <option value="FFA">For Further Action (FFA)</option>
                                                <option value="KIV">Keep In View (KIV)</option>
                                                <option value="NFA">No Further Action (NFA)</option>
                                                <option value="OP">Out of Procedure (OP)</option>
                                            </select>
                                        </div>
                                    )}
                                    {!isPublicRole && (
                                        <div className="app-filter-field">
                                            <label>Penerima Aduan</label>
                                            <input
                                                type="text"
                                                placeholder="Nama penerima aduan..."
                                                value={draftFilters.receiver}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, receiver: event.target.value })}
                                            />
                                        </div>
                                    )}
                                    {!isPublicRole && caseType !== 'AK' && (
                                        <div className="app-filter-field">
                                            <label>Pegawai Pengesah</label>
                                            <input
                                                type="text"
                                                placeholder="Nama pegawai pengesah..."
                                                value={draftFilters.approver}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, approver: event.target.value })}
                                            />
                                        </div>
                                    )}
                                    <div className="app-filter-field">
                                        <label>Kaedah Aduan</label>
                                        <select
                                            value={draftFilters.channel}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, channel: event.target.value })}
                                        >
                                            <option value="">Semua</option>
                                            <option value="portal">Portal (Awam)</option>
                                            <option value="web">Web</option>
                                            <option value="whatsapp">WhatsApp AI</option>
                                            <option value="whatsapp_web">WhatsApp Web AI</option>
                                            <option value="walkin">Walk-in / Kaunter</option>
                                            <option value="telefon">Telefon</option>
                                            <option value="email">Email</option>
                                            <option value="agensi">Agensi</option>
                                            <option value="lain">Lain-lain</option>
                                        </select>
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Kejadian Dari</label>
                                        <input
                                            type="date"
                                            value={draftFilters.incidentFromDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, incidentFromDate: event.target.value })}
                                        />
                                    </div>
                                    <div className="app-filter-field">
                                        <label>Kejadian Hingga</label>
                                        <input
                                            type="date"
                                            value={draftFilters.incidentToDate}
                                            onChange={(event) => setDraftFilters({ ...draftFilters, incidentToDate: event.target.value })}
                                        />
                                    </div>
                                    {!isPublicRole && caseType !== 'AK' && (
                                        <div className="app-filter-field">
                                            <label>Status Tindakan</label>
                                            <select
                                                value={draftFilters.actionStatus}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, actionStatus: event.target.value })}
                                            >
                                                {actionStatusOptions.map((opt) => (
                                                    <option key={opt.value || opt.label} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {!isPublicRole && (
                                        <div className="app-filter-field">
                                            <label>Status Siasatan</label>
                                            <select
                                                value={draftFilters.ipStatus}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, ipStatus: event.target.value })}
                                            >
                                                {ipStatusOptions.map((opt) => (
                                                    <option key={opt.value || opt.label} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                    {!isPublicRole && caseType !== 'AK' && (
                                        <div className="app-filter-field">
                                            <label>Status Pendakwaan</label>
                                            <select
                                                value={draftFilters.prosecutionStatus}
                                                onChange={(event) => setDraftFilters({ ...draftFilters, prosecutionStatus: event.target.value })}
                                            >
                                                {prosecutionStatusOptions.map((opt) => (
                                                    <option key={opt.value || opt.label} value={opt.value}>
                                                        {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                                <div className="app-advanced-search-actions">
                                    <button
                                        type="button"
                                        className="app-button app-button-ghost"
                                        onClick={() => setAdvancedOpen(false)}
                                    >
                                        Tutup
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <div className="app-filter-actions app-filter-actions-main">
                    <button className="app-button" type="submit">Search</button>
                    <button className="app-button app-button-ghost" type="button" onClick={onReset}>
                        Reset
                    </button>
                </div>
            </div>
        </form>
    );
};

export default ComplaintListFilter;
