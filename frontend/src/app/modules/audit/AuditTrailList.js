import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import PaginationBar from '../../components/PaginationBar';
import SortableHeader from '../../components/SortableHeader';
import { sortRows } from '../../utils/sort';
import { formatMalaysiaDateTimeStamp } from '../../utils/dateTime';

const AuditTrailList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');

    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [keyword, setKeyword] = useState('');
    const [moduleFilter, setModuleFilter] = useState('');
    const [eventFilter, setEventFilter] = useState('');
    const [entityFilter, setEntityFilter] = useState('');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [moduleOptions, setModuleOptions] = useState([]);
    const [eventOptions, setEventOptions] = useState([]);
    const [entityOptions, setEntityOptions] = useState([]);
    const [selectedLog, setSelectedLog] = useState(null);
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [total, setTotal] = useState(0);
    const [lastPage, setLastPage] = useState(1);
    const [sortKey, setSortKey] = useState('created_at');
    const [sortDir, setSortDir] = useState('desc');

    const loadLogs = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        axios.get(`${apiUrl}/audit-trail`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                keyword: keyword.trim() || undefined,
                module: moduleFilter || undefined,
                event: eventFilter || undefined,
                entity: entityFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
        })
            .then((response) => {
                setRows(response?.data?.data || []);
                setTotal(response?.data?.meta?.total ?? 0);
                setLastPage(response?.data?.meta?.last_page ?? 1);
                setModuleOptions(response?.data?.filters?.modules || []);
                setEventOptions(response?.data?.filters?.events || []);
                setEntityOptions(response?.data?.filters?.entities || []);
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan audit trail.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadLogs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, page, perPage, moduleFilter, eventFilter, entityFilter, dateFrom, dateTo]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setPage(1);
            loadLogs();
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [keyword]);

    const clearFilters = () => {
        setKeyword('');
        setModuleFilter('');
        setEventFilter('');
        setEntityFilter('');
        setDateFrom('');
        setDateTo('');
        setPage(1);
    };

    const exportCsv = () => {
        if (!apiUrl) {
            return;
        }
        axios.get(`${apiUrl}/audit-trail/export/csv`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            responseType: 'blob',
            params: {
                keyword: keyword.trim() || undefined,
                module: moduleFilter || undefined,
                event: eventFilter || undefined,
                entity: entityFilter || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            },
        }).then((response) => {
            const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
            const href = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = href;
            link.setAttribute('download', `audit-trail-${formatMalaysiaDateTimeStamp()}.csv`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(href);
        }).catch(() => {
            setError('Gagal export CSV audit trail.');
        });
    };

    const startIndex = total === 0 ? 0 : (page - 1) * perPage + 1;
    const endIndex = Math.min(page * perPage, total);

    const sortColumns = [
        { key: 'created_at', label: 'Tarikh', sortable: true },
        { key: 'module', label: 'Modul', sortable: true },
        { key: 'event', label: 'Event', sortable: true },
        { key: 'entity', label: 'Entiti', sortable: true },
        { key: 'record', label: 'Rekod', sortable: true },
        { key: 'user', label: 'Pengguna', sortable: true },
        { key: 'changed', label: 'Perubahan', sortable: false },
        { key: '', label: '', sortable: false },
    ];

    const sortAccessors = useMemo(() => ({
        created_at: (item) => item.created_at || '',
        module: (item) => item.module || '',
        event: (item) => item.event || '',
        entity: (item) => item.entity || '',
        record: (item) => String(item.auditable_id || ''),
        user: (item) => item.user?.name || item.user?.email || '-',
    }), []);

    const sortedRows = useMemo(
        () => sortRows(rows, sortKey, sortDir, sortAccessors),
        [rows, sortKey, sortDir, sortAccessors]
    );

    const handleSort = (key) => {
        if (!key) {
            return;
        }
        if (sortKey === key) {
            setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    return (
        <div className="app-complaints app-audit-trail">
            <div className="app-complaints-header">
                <div>
                    <span className="app-eyebrow">Pemantauan Sistem</span>
                    <h3>Audit Trail</h3>
                    <p>Jejak siapa ubah, padam, dan kemaskini data dalam semua modul.</p>
                </div>
            </div>

            <div className="app-card app-complaints-card app-audit-filters">
                <div className="app-filter-row app-filter-row-advanced app-filter-row-audit">
                    <label className="app-form-field app-filter-input-advanced">
                        <span>Keyword</span>
                        <input
                            value={keyword}
                            onChange={(event) => setKeyword(event.target.value)}
                            placeholder="Cari modul, event, ID rekod, pengguna..."
                        />
                    </label>
                    <label className="app-form-field">
                        <span>Modul</span>
                        <select value={moduleFilter} onChange={(event) => setModuleFilter(event.target.value)}>
                            <option value="">Semua</option>
                            {moduleOptions.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>
                    <label className="app-form-field">
                        <span>Event</span>
                        <select value={eventFilter} onChange={(event) => setEventFilter(event.target.value)}>
                            <option value="">Semua</option>
                            {eventOptions.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </label>
                    <label className="app-form-field">
                        <span>Entity Type</span>
                        <select value={entityFilter} onChange={(event) => setEntityFilter(event.target.value)}>
                            <option value="">Semua</option>
                            {entityOptions.map((item) => (
                                <option key={item.value} value={item.value}>{item.label}</option>
                            ))}
                        </select>
                    </label>
                    <label className="app-form-field">
                        <span>Dari Tarikh</span>
                        <input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
                    </label>
                    <label className="app-form-field">
                        <span>Hingga Tarikh</span>
                        <input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
                    </label>
                    <div className="app-filter-actions-main app-audit-actions">
                        <button type="button" className="app-button app-button-ghost" onClick={loadLogs}>
                            <i className="bi bi-arrow-clockwise"></i>
                            Refresh
                        </button>
                        <button type="button" className="app-button app-button-ghost" onClick={clearFilters}>Reset</button>
                        <button type="button" className="app-button app-button-ghost" onClick={exportCsv}>Export CSV</button>
                        <button type="button" className="app-button" onClick={() => { setPage(1); loadLogs(); }}>Search</button>
                    </div>
                </div>
                {error && <div className="app-form-error">{error}</div>}
            </div>

            <div className="app-card app-complaints-card">
                {isLoading ? (
                    <div className="app-empty">Memuatkan audit trail...</div>
                ) : (
                    <div className="app-table">
                        <SortableHeader
                            className="app-table-header app-audit-header"
                            columns={sortColumns}
                            sortKey={sortKey}
                            sortDir={sortDir}
                            onSort={handleSort}
                        />
                        {rows.length === 0 ? (
                            <div className="app-empty">Tiada rekod audit ditemui.</div>
                        ) : (
                            sortedRows.map((item) => (
                                <div key={item.id} className="app-table-row app-audit-row">
                                    <div>{item.created_at_human || '-'}</div>
                                    <div>{item.module || '-'}</div>
                                    <div><span className="app-badge">{item.event}</span></div>
                                    <div>{item.entity || '-'}</div>
                                    <div>#{item.auditable_id}</div>
                                    <div>{item.user?.name || item.user?.email || '-'}</div>
                                    <div className="app-audit-changes">
                                        {item.changed_summary?.length > 0 ? item.changed_summary.join(', ') : '-'}
                                    </div>
                                    <div>
                                        <button type="button" className="app-link" onClick={() => setSelectedLog(item)}>
                                            Detail
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>

            {!isLoading && rows.length > 0 && (
                <PaginationBar
                    page={page}
                    lastPage={lastPage}
                    total={total}
                    perPage={perPage}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                />
            )}

            {selectedLog && (
                <div className="app-modal">
                    <div className="app-modal-backdrop" onClick={() => setSelectedLog(null)}></div>
                    <div className="app-modal-content app-audit-detail-modal">
                        <div className="app-modal-header">
                            <div>
                                <h4>Detail Audit Trail #{selectedLog.id}</h4>
                                <p>{selectedLog.created_at_human} | {selectedLog.module} | {selectedLog.event}</p>
                            </div>
                            <button type="button" className="app-modal-close" onClick={() => setSelectedLog(null)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        <div className="app-audit-detail-grid">
                            <div><strong>Entity:</strong> {selectedLog.entity} #{selectedLog.auditable_id}</div>
                            <div><strong>No Aduan:</strong> {selectedLog.complaint_reference_no || '-'}</div>
                            <div><strong>User:</strong> {selectedLog.user?.name || '-'} ({selectedLog.user?.email || '-'})</div>
                            <div><strong>No Akaun:</strong> {selectedLog.user?.account_no || '-'}</div>
                            <div><strong>Method:</strong> {selectedLog.method || '-'}</div>
                            <div><strong>IP:</strong> {selectedLog.ip || '-'}</div>
                            <div className="app-span-full"><strong>URL:</strong> {selectedLog.url || '-'}</div>
                        </div>
                        <div className="app-audit-json-wrap">
                            <div className="app-audit-json-card">
                                <h5>Old Values</h5>
                                <pre>{JSON.stringify(selectedLog.old_values || {}, null, 2)}</pre>
                            </div>
                            <div className="app-audit-json-card">
                                <h5>New Values</h5>
                                <pre>{JSON.stringify(selectedLog.new_values || {}, null, 2)}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuditTrailList;
