import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
import axios from 'axios';
import { formatMalaysiaDateTimeStamp } from '../../utils/dateTime';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-quartz.css';

ModuleRegistry.registerModules([AllCommunityModule]);

const GRID_COLUMN_STATE_KEY = 'complaint-jana-tindakan-grid-column-state';

const formatLatestUpdate = (row) => {
    const note = String(row?.latest_update?.note || '').trim();
    const classification = String(row?.latest_update?.classification || '').trim();
    if (note) return note;
    if (classification) return classification;
    return '-';
};

const buildListingGridRows = (rows) => {
    const groups = new Map();
    (rows || []).forEach((row) => {
        const districtName = String(row?.district_name || '').trim() || 'Tidak diketahui';
        if (!groups.has(districtName)) {
            groups.set(districtName, []);
        }
        groups.get(districtName).push(row);
    });

    const items = [];
    Array.from(groups.entries()).forEach(([districtName, districtRows]) => {
        let sequence = 1;
        items.push({
            __group: true,
            id: `group-${districtName}`,
            district_name: districtName,
            total_records: districtRows.length,
        });
        districtRows.forEach((row) => {
            items.push({
                ...row,
                __sequence: sequence++,
                latest_update_text: formatLatestUpdate(row),
            });
        });
    });

    return items;
};

const toComparableText = (value) => String(value || '').trim().toLowerCase();

const statusCellClassRules = {
    'app-report-cell-status-success': (params) => toComparableText(params.value) === 'selesai dengan kes',
    'app-report-cell-status-warning': (params) => toComparableText(params.value) === 'selesai tanpa kes',
    'app-report-cell-status-danger': (params) => toComparableText(params.value).includes('belum menerima maklum balas'),
    'app-report-cell-status-info': (params) => {
        const value = toComparableText(params.value);
        return value.includes('siasat') || value.includes('dalam tindakan');
    },
};

const classificationCellClassRules = {
    'app-report-cell-classification-kiv': (params) => toComparableText(params.value) === 'kiv',
    'app-report-cell-classification-op': (params) => toComparableText(params.value) === 'op',
    'app-report-cell-classification-ffa': (params) => toComparableText(params.value) === 'ffa',
    'app-report-cell-classification-fna': (params) => toComparableText(params.value) === 'fna',
    'app-report-cell-classification-nfa': (params) => toComparableText(params.value) === 'nfa',
};

const GroupRowRenderer = (props) => {
    const data = props?.data || {};
    return (
        <div className="app-report-grid-group-row">
            <span>{data.district_name || 'Tidak diketahui'} ({data.total_records || 0})</span>
        </div>
    );
};

const LinkCellRenderer = (props) => {
    if (!props?.data || props.data.__group) return null;
    return (
        <Link className="app-link" to={`/app/complaints/${props.data.id}`}>
            {props.value || `Aduan #${props.data.id}`}
        </Link>
    );
};

const ComplaintJanaTindakanReport = ({
    title = 'Jana Tindakan Aduan',
    description = 'Ringkasan dan senarai rekod Jana Tindakan AJ mengikut klasifikasi, daerah, dan status semasa.',
    backLink = '/app/complaints/report',
    defaultClassification = '',
    lockClassification = false,
}) => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const gridApiRef = useRef(null);
    const gridShellRef = useRef(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isExporting, setIsExporting] = useState(false);
    const [error, setError] = useState('');
    const [gridSearch, setGridSearch] = useState('');
    const [activeDistrictLabel, setActiveDistrictLabel] = useState('');
    const [groupOverlayTop, setGroupOverlayTop] = useState(84);
    const [summary, setSummary] = useState({ totals: {}, status_rows: [], classification_rows: [], district_rows: [], listing_rows: [] });

    const params = useMemo(() => ({
        ...(lockClassification && defaultClassification ? { classification: defaultClassification } : {}),
    }), [defaultClassification, lockClassification]);

    const loadSummary = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        setError('');
        axios.get(`${apiUrl}/complaints/report/action-status`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params,
        })
            .then((response) => setSummary(response?.data?.data || { totals: {}, status_rows: [], classification_rows: [], district_rows: [], listing_rows: [] }))
            .catch((err) => setError(err?.response?.data?.message || 'Gagal memuatkan statistik status tindakan.'))
            .finally(() => setIsLoading(false));
    };

    const handleExport = async () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        setIsExporting(true);
        try {
            const response = await axios.get(`${apiUrl}/complaints/report/action-status/export/xlsx`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params,
                responseType: 'blob',
            });
            const disposition = response?.headers?.['content-disposition'] || '';
            const match = disposition.match(/filename="?([^"]+)"?/i);
            const filename = match?.[1] || `aduan-action-status-${formatMalaysiaDateTimeStamp()}.xlsx`;
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } finally {
            setIsExporting(false);
        }
    };

    useEffect(() => {
        loadSummary();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [apiUrl, params]);

    const gridRows = useMemo(() => buildListingGridRows(summary?.listing_rows || []), [summary?.listing_rows]);
    const districtTotals = useMemo(() => {
        const totals = new Map();
        (summary?.listing_rows || []).forEach((row) => {
            const districtName = String(row?.district_name || '').trim() || 'Tidak diketahui';
            totals.set(districtName, (totals.get(districtName) || 0) + 1);
        });
        return totals;
    }, [summary?.listing_rows]);

    const compactSummaryItems = useMemo(() => {
        const statusRows = summary?.status_rows || [];
        const classificationRows = summary?.classification_rows || [];

        const findStatusTotal = (matcher) => {
            const found = statusRows.find((row) => matcher(String(row?.action_status || '').trim().toLowerCase()));
            return Number(found?.total || 0);
        };

        const findClassificationTotal = (value) => {
            const found = classificationRows.find((row) => String(row?.classification || '').trim().toUpperCase() === value);
            return Number(found?.total || 0);
        };

        return [
            { label: 'Jumlah Rekod', value: Number(summary?.totals?.records ?? 0) },
            { label: 'Selesai Dengan Kes', value: findStatusTotal((text) => text === 'selesai dengan kes') },
            { label: 'Selesai Tanpa Kes', value: findStatusTotal((text) => text === 'selesai tanpa kes') },
            { label: 'Belum Maklum Balas', value: findStatusTotal((text) => text.includes('belum menerima maklum balas')) },
            { label: 'KIV', value: findClassificationTotal('KIV') },
            { label: 'OP', value: findClassificationTotal('OP') },
        ];
    }, [summary]);

    const restoreColumnState = useCallback((api) => {
        if (!api) return;

        try {
            const raw = window.localStorage.getItem(GRID_COLUMN_STATE_KEY);
            if (!raw) return;

            const state = JSON.parse(raw);
            if (!Array.isArray(state) || !state.length) return;

            api.applyColumnState({
                state,
                applyOrder: true,
            });
        } catch {
            // ignore invalid local state
        }
    }, []);

    const persistColumnState = useCallback(() => {
        const api = gridApiRef.current;
        if (!api) return;

        try {
            const state = api.getColumnState();
            window.localStorage.setItem(GRID_COLUMN_STATE_KEY, JSON.stringify(state));
        } catch {
            // ignore storage errors
        }
    }, []);

    const updateGroupOverlayOffset = useCallback(() => {
        const shell = gridShellRef.current;
        if (!shell) return;
        const header = shell.querySelector('.ag-header');
        const headerHeight = header ? header.getBoundingClientRect().height : 84;
        setGroupOverlayTop(Math.round(headerHeight));
    }, []);

    const updateActiveDistrictFromGrid = useCallback(() => {
        const api = gridApiRef.current;
        if (!api) return;

        const displayedCount = api.getDisplayedRowCount();
        if (!displayedCount) {
            setActiveDistrictLabel('');
            return;
        }

        const pixelRange = api.getVerticalPixelRange();
        const targetPixel = Math.max(0, Number(pixelRange?.top || 0) + 1);
        let rowNode = null;

        for (let index = 0; index < displayedCount; index += 1) {
            const candidate = api.getDisplayedRowAtIndex(index);
            if (!candidate) continue;

            const rowTop = Number(candidate.rowTop ?? 0);
            const rowHeight = Number(candidate.rowHeight ?? 0);
            const rowBottom = rowTop + rowHeight;

            if (rowBottom > targetPixel) {
                rowNode = candidate;
                break;
            }
        }

        if (!rowNode?.data) {
            setActiveDistrictLabel('');
            return;
        }

        const districtName = String(rowNode.data.district_name || '').trim() || 'Tidak diketahui';
        const totalRecords = rowNode.data.__group
            ? (rowNode.data.total_records || 0)
            : (districtTotals.get(districtName) || 0);

        const label = districtName ? `${districtName} (${totalRecords})` : '';

        setActiveDistrictLabel(label);
    }, [districtTotals]);

    useEffect(() => {
        updateGroupOverlayOffset();
        updateActiveDistrictFromGrid();
    }, [gridRows, updateGroupOverlayOffset, updateActiveDistrictFromGrid]);

    useEffect(() => {
        const handleResize = () => updateGroupOverlayOffset();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [updateGroupOverlayOffset]);

    const defaultColDef = useMemo(() => ({
        sortable: true,
        filter: true,
        floatingFilter: true,
        resizable: true,
        suppressMovable: false,
        wrapHeaderText: true,
        autoHeaderHeight: true,
        suppressHeaderMenuButton: false,
    }), []);

    const columnDefs = useMemo(() => ([
        {
            headerName: '#',
            field: '__sequence',
            minWidth: 68,
            maxWidth: 76,
            sortable: false,
            filter: false,
            floatingFilter: false,
        },
        {
            headerName: 'No. Aduan',
            field: 'reference_no',
            minWidth: 190,
            pinned: 'left',
            cellRenderer: LinkCellRenderer,
        },
        {
            headerName: 'Kesalahan',
            field: 'offense_name',
            minWidth: 260,
        },
        {
            headerName: 'Status Terkini',
            field: 'action_status',
            minWidth: 180,
            cellClassRules: statusCellClassRules,
        },
        {
            headerName: 'Klasifikasi',
            field: 'classification',
            minWidth: 120,
            cellClassRules: classificationCellClassRules,
        },
        {
            headerName: 'Tarikh',
            field: 'complaint_date',
            minWidth: 130,
        },
        {
            headerName: 'Masa',
            field: 'complaint_time',
            minWidth: 110,
            valueFormatter: (params) => String(params.value || '').slice(0, 5) || '-',
        },
        {
            headerName: 'Maklumat Terkini',
            field: 'latest_update_text',
            minWidth: 240,
        },
        {
            headerName: 'Status Kes OP',
            field: 'op_case_status',
            minWidth: 140,
        },
        {
            headerName: 'No. Fail / PIC',
            field: 'file_pic',
            minWidth: 180,
            valueGetter: (params) => {
                if (params?.data?.__group) return '';
                const fileNo = String(params?.data?.file_no || '').trim() || '-';
                const picName = String(params?.data?.pic_name || '').trim() || 'PIC belum ditetapkan';
                return `${fileNo} / ${picName}`;
            },
        },
    ]), []);

    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
                <Link className="app-button app-button-ghost" to={backLink}>
                    Kembali Dashboard
                </Link>
            </div>

            <div className="app-jana-page">
                {error && <div className="app-empty">{error}</div>}
                {isLoading && <div className="app-empty">Memuatkan statistik...</div>}

                {!isLoading && !error && (
                    <div className="app-jana-summary-strip">
                        {compactSummaryItems.map((item) => (
                            <div key={item.label} className="app-jana-summary-chip">
                                <span>{item.label}</span>
                                <strong>{item.value}</strong>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {!isLoading && !error && (
                <div className="app-report-listing-section">
                    <div className="app-report-grid-toolbar">
                        <div className="app-report-grid-toolbar-meta">
                            <span>Senarai Rekod Jana Tindakan</span>
                            <small>Paparan rekod satu per satu untuk semakan operasi dan tindakan susulan.</small>
                        </div>
                        <label className="app-report-grid-search">
                            <i className="bi bi-search"></i>
                            <input
                                type="search"
                                value={gridSearch}
                                onChange={(e) => setGridSearch(e.target.value)}
                                placeholder="Cari dalam jadual..."
                            />
                        </label>
                        <div className="app-report-grid-toolbar-actions">
                            <button type="button" className="app-button app-button-ghost" onClick={handleExport} disabled={isExporting}>
                                {isExporting ? 'Sedang Export...' : 'Export Excel'}
                            </button>
                            <button type="button" className="app-button" onClick={loadSummary}>
                                Refresh
                            </button>
                        </div>
                    </div>
                    {gridRows.length ? (
                        <div className="app-report-ag-grid-shell" ref={gridShellRef}>
                            <div className="ag-theme-quartz app-report-ag-grid">
                                <AgGridReact
                                    rowData={gridRows}
                                    columnDefs={columnDefs}
                                    defaultColDef={defaultColDef}
                                    quickFilterText={gridSearch}
                                    headerHeight={42}
                                    rowHeight={38}
                                    suppressCellFocus={true}
                                    suppressMovableColumns={false}
                                    animateRows={false}
                                    domLayout="normal"
                                    isFullWidthRow={(params) => !!params?.rowNode?.data?.__group}
                                    fullWidthCellRenderer={GroupRowRenderer}
                                    getRowHeight={(params) => (params?.data?.__group ? 34 : 38)}
                                    getRowClass={(params) => (params?.data?.__group ? 'app-report-ag-group-node' : 'app-report-ag-data-node')}
                                    onGridReady={(params) => {
                                        gridApiRef.current = params.api;
                                        restoreColumnState(params.api);
                                        updateGroupOverlayOffset();
                                        updateActiveDistrictFromGrid();
                                    }}
                                    onFirstDataRendered={() => {
                                        updateGroupOverlayOffset();
                                        updateActiveDistrictFromGrid();
                                    }}
                                    onBodyScroll={updateActiveDistrictFromGrid}
                                    onFilterChanged={updateActiveDistrictFromGrid}
                                    onSortChanged={updateActiveDistrictFromGrid}
                                    onModelUpdated={updateActiveDistrictFromGrid}
                                    onColumnMoved={persistColumnState}
                                    onColumnPinned={persistColumnState}
                                    onColumnVisible={persistColumnState}
                                    onColumnResized={(params) => {
                                        if (params.finished) {
                                            persistColumnState();
                                        }
                                    }}
                                />
                            </div>
                            {activeDistrictLabel ? (
                                <div className="app-report-grid-floating-group" style={{ top: `${groupOverlayTop}px` }}>
                                    <span>{activeDistrictLabel}</span>
                                </div>
                            ) : null}
                        </div>
                    ) : (
                        <div className="app-empty">Tiada rekod Jana Tindakan untuk filter semasa.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ComplaintJanaTindakanReport;
