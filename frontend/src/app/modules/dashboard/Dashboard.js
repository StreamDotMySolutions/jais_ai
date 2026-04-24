import React, { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import DashboardHQ from './DashboardHQ';
import DashboardDaerah from './DashboardDaerah';

const HQ_ROLES = ['system', 'admin', 'pegawai', 'pegawai_hq'];

const normalizeRole = (value) => {
    const role = (value || '').toString().trim().toLowerCase();
    if (!role || role === 'null' || role === 'undefined') {
        return 'awam';
    }
    return role;
};

const Dashboard = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const role = useMemo(() => normalizeRole(localStorage.getItem('role')), []);
    const token = localStorage.getItem('token');
    const isHqRole = HQ_ROLES.includes(role);
    const isDistrictRole = role === 'pegawai_daerah';

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState(null);
    const [selectedDistrictId, setSelectedDistrictId] = useState('');

    const fetchDashboard = useCallback(async () => {
        if (!apiUrl) {
            setError('REACT_APP_API_URL tidak ditetapkan.');
            setIsLoading(false);
            return;
        }

        try {
            setIsLoading(true);
            setError('');
            const params = {};
            if (isHqRole && selectedDistrictId) {
                params.district_id = selectedDistrictId;
            }

            const response = await axios.get(`${apiUrl}/dashboard`, {
                headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                params,
            });

            setData(response?.data || null);
        } catch (fetchError) {
            setError(fetchError?.response?.data?.message || fetchError?.message || 'Gagal memuat dashboard.');
            setData(null);
        } finally {
            setIsLoading(false);
        }
    }, [apiUrl, isHqRole, selectedDistrictId, token]);

    useEffect(() => {
        fetchDashboard();
    }, [fetchDashboard]);

    if (isLoading) {
        return (
            <div className="app-dashboard">
                <div className="app-welcome">
                    <div className="app-skeleton-stack">
                        <span className="app-skeleton-line app-skeleton-line--lg"></span>
                        <span className="app-skeleton-line app-skeleton-line--md"></span>
                    </div>
                    <span className="app-skeleton-pill"></span>
                </div>
                <div className="app-metrics">
                    {Array.from({ length: 4 }, (_, index) => (
                        <div className="app-metric-card" key={`dashboard-skeleton-${index}`}>
                            <div className="app-skeleton-stack">
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                                <span className="app-skeleton-line app-skeleton-line--xl"></span>
                                <span className="app-skeleton-line app-skeleton-line--sm"></span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="app-dashboard">
                <div className="app-card">
                    <div className="app-card-header">
                        <h4>Dashboard</h4>
                    </div>
                    <p className="app-muted mb-0">{error}</p>
                </div>
            </div>
        );
    }

    if (isDistrictRole) {
        return <DashboardDaerah data={data} role={role} />;
    }

    return (
        <DashboardHQ
            data={data}
            role={role}
            selectedDistrictId={selectedDistrictId}
            onDistrictChange={(value) => setSelectedDistrictId(value)}
            isLoading={isLoading}
        />
    );
};

export default Dashboard;
