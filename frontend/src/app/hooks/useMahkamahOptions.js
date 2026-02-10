import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

let mahkamahCache = {
    key: null,
    items: null,
    fetchedAt: 0,
};
let mahkamahInFlight = null;

const buildKey = (apiUrl, token) => `${apiUrl || ''}::${token || ''}`;

export default function useMahkamahOptions({ apiUrl, token, ttlMs = 10 * 60 * 1000 } = {}) {
    const effectiveApiUrl = apiUrl || process.env.REACT_APP_API_URL;
    const effectiveToken = token ?? localStorage.getItem('token');
    const cacheKey = useMemo(() => buildKey(effectiveApiUrl, effectiveToken), [effectiveApiUrl, effectiveToken]);

    const [items, setItems] = useState(() => {
        if (mahkamahCache.key === cacheKey && Array.isArray(mahkamahCache.items)) {
            return mahkamahCache.items;
        }
        return [];
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchMahkamah = useCallback(async (opts = {}) => {
        if (!effectiveApiUrl) {
            setError('API URL tidak diset.');
            return;
        }

        const now = Date.now();
        const isCacheValid = mahkamahCache.key === cacheKey
            && Array.isArray(mahkamahCache.items)
            && (now - (mahkamahCache.fetchedAt || 0)) < ttlMs;

        if (!opts.force && isCacheValid) {
            setItems(mahkamahCache.items);
            setError('');
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            if (!mahkamahInFlight) {
                mahkamahInFlight = axios.get(`${effectiveApiUrl}/references/mahkamah`, {
                    headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : undefined,
                });
            }
            const response = await mahkamahInFlight;
            const nextItems = response?.data?.data || [];
            mahkamahCache = { key: cacheKey, items: nextItems, fetchedAt: Date.now() };
            setItems(nextItems);
        } catch (err) {
            setItems([]);
            setError(err?.response?.data?.message || 'Gagal memuatkan senarai mahkamah.');
        } finally {
            mahkamahInFlight = null;
            setIsLoading(false);
        }
    }, [cacheKey, effectiveApiUrl, effectiveToken, ttlMs]);

    useEffect(() => {
        fetchMahkamah();
    }, [fetchMahkamah]);

    const refresh = useCallback(() => fetchMahkamah({ force: true }), [fetchMahkamah]);

    return { items, isLoading, error, refresh };
}

