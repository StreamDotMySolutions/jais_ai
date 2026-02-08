import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// Simple in-memory cache shared across pages/components.
let staffCache = {
    key: null,
    items: null,
    fetchedAt: 0,
};
let staffInFlight = null;

const buildKey = (apiUrl, token) => `${apiUrl || ''}::${token || ''}`;

export default function useStaffOptions({ apiUrl, token, ttlMs = 5 * 60 * 1000 } = {}) {
    const effectiveApiUrl = apiUrl || process.env.REACT_APP_API_URL;
    const effectiveToken = token ?? localStorage.getItem('token');
    const cacheKey = useMemo(() => buildKey(effectiveApiUrl, effectiveToken), [effectiveApiUrl, effectiveToken]);

    const [items, setItems] = useState(() => {
        if (staffCache.key === cacheKey && Array.isArray(staffCache.items)) {
            return staffCache.items;
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchStaff = useCallback(async (opts = {}) => {
        if (!effectiveApiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        const now = Date.now();
        const isCacheValid = staffCache.key === cacheKey
            && Array.isArray(staffCache.items)
            && (now - (staffCache.fetchedAt || 0)) < ttlMs;

        if (!opts.force && isCacheValid) {
            setItems(staffCache.items);
            setError('');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (!staffInFlight) {
                staffInFlight = axios.get(`${effectiveApiUrl}/staff/options`, {
                    headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : undefined,
                });
            }
            const response = await staffInFlight;
            const nextItems = response?.data?.data || [];
            staffCache = { key: cacheKey, items: nextItems, fetchedAt: Date.now() };
            setItems(nextItems);
        } catch (err) {
            setItems([]);
            setError(err?.response?.data?.message || 'Gagal memuatkan senarai pegawai.');
        } finally {
            staffInFlight = null;
            setIsLoading(false);
        }
    }, [cacheKey, effectiveApiUrl, effectiveToken, ttlMs]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const refresh = useCallback(() => fetchStaff({ force: true }), [fetchStaff]);

    return { items, isLoading, error, refresh };
}

