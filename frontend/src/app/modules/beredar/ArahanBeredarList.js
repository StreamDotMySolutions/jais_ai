import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import PaginationBar from '../../components/PaginationBar';
import ListPageLayout from '../../components/ListPageLayout';

const ArahanBeredarList = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const token = localStorage.getItem('token');
    const role = String(localStorage.getItem('role') || '').trim().toLowerCase();
    const isSystem = role === 'system';
    const navigate = useNavigate();
    const [records, setRecords] = useState([]);
    const [keyword, setKeyword] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(10);
    const [pagination, setPagination] = useState({
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    });
    const [scope, setScope] = useState('active');

    const loadRecords = () => {
        if (!apiUrl) {
            setError('API URL tidak diset.');
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        axios.get(`${apiUrl}/arahan-beredar`, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            params: {
                page,
                per_page: perPage,
                scope,
            },
        })
            .then((response) => {
                setRecords(response?.data?.data || []);
                setPagination(response?.data?.meta || {
                    current_page: 1,
                    last_page: 1,
                    per_page: perPage,
                    total: 0,
                });
                setError('');
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memuatkan rekod.');
            })
            .finally(() => setIsLoading(false));
    };

    useEffect(() => {
        loadRecords();
    }, [apiUrl, page, perPage, scope]);

    const handleRestore = (item) => {
        if (!apiUrl || !item?.id) {
            return;
        }

        setIsLoading(true);
        axios.post(`${apiUrl}/arahan-beredar/${item.id}/restore`, {}, {
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        })
            .then(() => {
                setError('');
                loadRecords();
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'Gagal memulihkan rekod.');
            })
            .finally(() => setIsLoading(false));
    };

    const filteredRecords = useMemo(() => {
        const term = keyword.trim().toLowerCase();
        if (!term) {
            return records;
        }
        return records.filter((item) => (
            (item.location || '').toLowerCase().includes(term) ||
            (item.staff?.name || '').toLowerCase().includes(term) ||
            (item.status || '').toLowerCase().includes(term)
        ));
    }, [records, keyword]);

    const startIndex = pagination.total === 0 ? 0 : ((pagination.current_page - 1) * pagination.per_page) + 1;
    const endIndex = Math.min(pagination.current_page * pagination.per_page, pagination.total);

    return (
        <>
            <ListPageLayout
                eyebrow="Arahan Beredar"
                title="Senarai Arahan Beredar"
                description="Rekod tindakan nasihat dan arahan beredar BPN HQ."
                actions={(
                    <>
                        <div className="app-search">
                            <i className="bi bi-search"></i>
                            <input
                                value={keyword}
                                onChange={(event) => setKeyword(event.target.value)}
                                placeholder="Cari lokasi, pegawai, status..."
                            />
                            {keyword && (
                                <button
                                    type="button"
                                    className="app-search-clear"
                                    aria-label="Kosongkan carian"
                                    onClick={() => setKeyword('')}
                                >
                                    <i className="bi bi-x-lg"></i>
                                </button>
                            )}
                        </div>
                        <button className="app-button" type="button" onClick={() => navigate('/app/arahan-beredar/new')}>
                            <i className="bi bi-plus-lg"></i>
                            Tambah Rekod
                        </button>
                    </>
                )}
            >
                <div className="app-list-tabs-row">
                    <div className="app-list-tabs">
                        <button
                            type="button"
                            className={`app-list-tab ${scope === 'active' ? 'active' : ''}`}
                            onClick={() => {
                                setScope('active');
                                setPage(1);
                            }}
                        >
                            Aktif
                        </button>
                        {isSystem && (
                            <button
                                type="button"
                                className={`app-list-tab ${scope === 'deleted' ? 'active' : ''}`}
                                onClick={() => {
                                    setScope('deleted');
                                    setPage(1);
                                }}
                            >
                                Dipadam
                            </button>
                        )}
                    </div>
                </div>
                {isLoading && <div className="app-empty">Memuatkan rekod...</div>}
                {!isLoading && error && <div className="app-empty">{error}</div>}
                {!isLoading && !error && filteredRecords.length === 0 && (
                    <div className="app-empty">Tiada rekod ditemui.</div>
                )}
                {!isLoading && !error && filteredRecords.length > 0 && (
                    <div className="app-table">
                        <div className="app-table-header app-beredar-header">
                            <span>Tarikh</span>
                            <span>Lokasi</span>
                            <span>Pegawai</span>
                            <span>Status</span>
                            <span>Tindakan</span>
                        </div>
                        {filteredRecords.map((item) => (
                            <div key={item.id} className="app-table-row app-beredar-row">
                                <span>{item.incident_date || '-'}</span>
                                <span>{item.location || '-'}</span>
                                <span>{item.staff?.name || '-'}</span>
                                <span>
                                    <span className="app-status-pill">
                                        {item.status || 'draf'}
                                    </span>
                                </span>
                                <span className="app-row-actions">
                                    {!item.is_deleted && (
                                        <>
                                            <button
                                                className="app-icon-button"
                                                type="button"
                                                onClick={() => navigate(`/app/arahan-beredar/${item.id}`)}
                                                aria-label="Lihat rekod"
                                                title="Lihat"
                                            >
                                                <i className="bi bi-eye"></i>
                                            </button>
                                            <button
                                                type="button"
                                                className="app-link"
                                                onClick={() => navigate(`/app/arahan-beredar/${item.id}/edit`)}
                                            >
                                                Kemaskini
                                            </button>
                                        </>
                                    )}
                                    {item.can_restore && (
                                        <button
                                            className="app-button app-button-ghost app-button-mini"
                                            type="button"
                                            onClick={() => handleRestore(item)}
                                        >
                                            Pulihkan
                                        </button>
                                    )}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </ListPageLayout>

            {!isLoading && !error && pagination.total > 0 && (
                <PaginationBar
                    page={pagination.current_page}
                    lastPage={pagination.last_page}
                    total={pagination.total}
                    perPage={pagination.per_page}
                    startIndex={startIndex}
                    endIndex={endIndex}
                    onPageChange={setPage}
                    onPerPageChange={(value) => {
                        setPerPage(value);
                        setPage(1);
                    }}
                />
            )}
        </>
    );
};

export default ArahanBeredarList;
