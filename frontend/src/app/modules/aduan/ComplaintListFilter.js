import React from 'react';

const ComplaintListFilter = ({
    isPublicRole,
    caseType,
    statusOptions,
    districtOptions,
    ipStatusOptions,
    prosecutionStatusOptions,
    draftFilters,
    setDraftFilters,
    onSearch,
    onReset,
}) => (
    <form className="app-filter" onSubmit={onSearch}>
        <div className="app-filter-row">
            <div className="app-filter-field">
                <label>Keyword</label>
                <div className="app-filter-input">
                    <input
                        type="text"
                        placeholder="Nama, no aduan, daerah..."
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
                </div>
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
        </div>
        <div className="app-filter-row">
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
            <div className="app-filter-actions">
                <button className="app-button" type="submit">Search</button>
                <button className="app-button app-button-ghost" type="button" onClick={onReset}>
                    Reset
                </button>
            </div>
        </div>
    </form>
);

export default ComplaintListFilter;
