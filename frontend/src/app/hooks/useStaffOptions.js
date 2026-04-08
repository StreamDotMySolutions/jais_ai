import { useCallback, useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// Simple in-memory cache shared across pages/components.
let staffCache = {
    key: null,
    items: null,
    fetchedAt: 0,
};
const staffInFlightMap = new Map();

const buildKey = (apiUrl, token, officeType, sameDistrictOfStaffId) => (
    `${apiUrl || ''}::${token || ''}::${officeType || ''}::${sameDistrictOfStaffId || ''}`
);

export default function useStaffOptions({ apiUrl, token, officeType = '', sameDistrictOfStaffId = '', ttlMs = 5 * 60 * 1000 } = {}) {
    const effectiveApiUrl = apiUrl || process.env.REACT_APP_API_URL;
    const effectiveToken = token ?? localStorage.getItem('token');
    const normalizedOfficeType = (officeType || '').toString().trim().toLowerCase();
    const normalizedSameDistrictOfStaffId = (sameDistrictOfStaffId || '').toString().trim();
    const cacheKey = useMemo(
        () => buildKey(effectiveApiUrl, effectiveToken, normalizedOfficeType, normalizedSameDistrictOfStaffId),
        [effectiveApiUrl, effectiveToken, normalizedOfficeType, normalizedSameDistrictOfStaffId]
    );

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
            if (!staffInFlightMap.has(cacheKey)) {
                const params = {};
                if (normalizedOfficeType) {
                    params.office_type = normalizedOfficeType;
                }
                if (normalizedSameDistrictOfStaffId) {
                    params.same_district_of_staff_id = normalizedSameDistrictOfStaffId;
                }
                staffInFlightMap.set(cacheKey, axios.get(`${effectiveApiUrl}/staff/options`, {
                    headers: effectiveToken ? { Authorization: `Bearer ${effectiveToken}` } : undefined,
                    params,
                }));
            }
            const response = await staffInFlightMap.get(cacheKey);
            const nextItems = response?.data?.data || [];
            staffCache = { key: cacheKey, items: nextItems, fetchedAt: Date.now() };
            setItems(nextItems);
        } catch (err) {
            setItems([]);
            setError(err?.response?.data?.message || 'Gagal memuatkan senarai pegawai.');
        } finally {
            staffInFlightMap.delete(cacheKey);
            setIsLoading(false);
        }
    }, [cacheKey, effectiveApiUrl, effectiveToken, normalizedOfficeType, normalizedSameDistrictOfStaffId, ttlMs]);

    useEffect(() => {
        fetchStaff();
    }, [fetchStaff]);

    const refresh = useCallback(() => fetchStaff({ force: true }), [fetchStaff]);

    return { items, isLoading, error, refresh };
}
