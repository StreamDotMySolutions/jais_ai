import React, { useState } from 'react';
import axios from 'axios';
import { getPublicComplaintStageLabel } from '../../../app/modules/aduan/complaintStage';

const ComplaintStatus = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [searchBy, setSearchBy] = useState('reference_no');
    const [searchValue, setSearchValue] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const resultItems = Array.isArray(result) ? result : (result ? [result] : []);

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setResult(null);

        if (!searchValue.trim()) {
            setError(searchBy === 'informant_ic'
                ? 'Sila masukkan No. Kad Pengenalan Pemberi Maklumat.'
                : 'Sila masukkan nombor aduan.');
            return;
        }

        setIsLoading(true);

        axios.get(`${apiUrl}/complaints/reference`, {
            params: {
                search_by: searchBy,
                value: searchValue.trim(),
            },
        })
            .then((response) => {
                setResult(response?.data?.data || null);
            })
            .catch((err) => {
                setError(err?.response?.data?.message || 'No aduan tidak ditemui.');
            })
            .finally(() => {
                setIsLoading(false);
            });
    };

    return (
        <div className="status-shell">
            <div className="status-header">
                <div>
                    <span className="status-kicker">Semakan Awam</span>
                    <h1>Semak Status Aduan</h1>
                    <p>Semak status melalui nombor aduan atau No. Kad Pengenalan pemberi maklumat.</p>
                </div>
            </div>

            <div className="status-card">
                <form onSubmit={handleSubmit} className="status-form">
                    <label className="status-label">Kaedah Semakan</label>
                    <div className="status-switch">
                        <label className={`status-switch-option ${searchBy === 'reference_no' ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="search_by"
                                value="reference_no"
                                checked={searchBy === 'reference_no'}
                                onChange={() => {
                                    setSearchBy('reference_no');
                                    setResult(null);
                                    setError('');
                                }}
                            />
                            <span>No. Aduan</span>
                        </label>
                        <label className={`status-switch-option ${searchBy === 'informant_ic' ? 'active' : ''}`}>
                            <input
                                type="radio"
                                name="search_by"
                                value="informant_ic"
                                checked={searchBy === 'informant_ic'}
                                onChange={() => {
                                    setSearchBy('informant_ic');
                                    setResult(null);
                                    setError('');
                                }}
                            />
                            <span>No. Kad Pengenalan Pemberi Maklumat</span>
                        </label>
                    </div>
                    <label className="status-label">{searchBy === 'informant_ic' ? 'No. Kad Pengenalan Pemberi Maklumat' : 'Nombor Aduan'}</label>
                    <div className="status-input">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder={searchBy === 'informant_ic'
                                ? 'Contoh: 900101010001'
                                : 'Contoh: JAIS-AJ-GOM-251227-0001'}
                            value={searchValue}
                            onChange={(event) => setSearchValue(event.target.value)}
                        />
                        {searchValue && (
                            <button
                                type="button"
                                className="status-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => setSearchValue('')}
                            >
                                <i className="bi bi-x-lg"></i>
                            </button>
                        )}
                    </div>
                    <button className="status-button" type="submit" disabled={isLoading}>
                        {isLoading ? 'Mencari...' : 'Semak Status'}
                    </button>
                </form>

                {error && <div className="status-error">{error}</div>}

                {resultItems.length > 0 && (
                    <div className="status-result">
                        {Array.isArray(result) && result.length > 1 && (
                            <div className="status-result-count">
                                Ditemui {result.length} rekod aduan berkaitan nombor kad pengenalan ini.
                            </div>
                        )}
                        {resultItems.map((item) => (
                            <div key={item.reference_no} className="status-result-item">
                                <div className="status-row">
                                    <span>No Aduan</span>
                                    <strong>{item.reference_no}</strong>
                                </div>
                                <div className="status-row">
                                    <span>Status</span>
                                    <strong>{getPublicComplaintStageLabel(item.current_stage || '-', item)}</strong>
                                </div>
                                <div className="status-row">
                                    <span>Daerah</span>
                                    <strong>{item.district_name || '-'}</strong>
                                </div>
                                <div className="status-row">
                                    <span>Tarikh</span>
                                    <strong>{item.complaint_date || '-'}</strong>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplaintStatus;
