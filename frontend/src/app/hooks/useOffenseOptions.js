import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

let offenseCache = {
    key: null,
    items: null,
    fetchedAt: 0,
};
let offenseInFlight = null;

const buildKey = (apiUrl) => `${apiUrl || ''}`;

export default function useOffenseOptions({ apiUrl, ttlMs = 10 * 60 * 1000 } = {}) {
    const effectiveApiUrl = apiUrl || process.env.REACT_APP_API_URL;
    const cacheKey = useMemo(() => buildKey(effectiveApiUrl), [effectiveApiUrl]);

    const [items, setItems] = useState(() => {
        if (offenseCache.key === cacheKey && Array.isArray(offenseCache.items)) {
            return offenseCache.items;
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchOffenses = useCallback(async (opts = {}) => {
        if (!effectiveApiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        const now = Date.now();
        const isCacheValid = offenseCache.key === cacheKey
            && Array.isArray(offenseCache.items)
            && (now - (offenseCache.fetchedAt || 0)) < ttlMs;

        if (!opts.force && isCacheValid) {
            setItems(offenseCache.items);
            setError('');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (!offenseInFlight) {
                offenseInFlight = axios.get(`${effectiveApiUrl}/references/offenses`);
            }
            const response = await offenseInFlight;
            const nextItems = response?.data?.data || [];
            offenseCache = { key: cacheKey, items: nextItems, fetchedAt: Date.now() };
            setItems(nextItems);
        } catch (err) {
            setItems([]);
            setError(err?.response?.data?.message || 'Gagal memuatkan senarai kesalahan.');
        } finally {
            offenseInFlight = null;
            setIsLoading(false);
        }
    }, [cacheKey, effectiveApiUrl, ttlMs]);

    useEffect(() => {
        fetchOffenses();
    }, [fetchOffenses]);

    const refresh = useCallback(() => fetchOffenses({ force: true }), [fetchOffenses]);

    return { items, isLoading, error, refresh };
}

