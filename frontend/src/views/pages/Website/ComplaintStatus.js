import React, { useState } from 'react';
import axios from 'axios';

const ComplaintStatus = () => {
    const apiUrl = process.env.REACT_APP_API_URL;
    const [referenceNo, setReferenceNo] = useState('');
    const [result, setResult] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (event) => {
        event.preventDefault();
        setError('');
        setResult(null);

        if (!referenceNo.trim()) {
            setError('Sila masukkan nombor aduan.');
            return;
        }

        setIsLoading(true);

        axios.get(`${apiUrl}/complaints/reference`, {
            params: { reference_no: referenceNo.trim() },
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
                    <p>Masukkan nombor aduan untuk semak status terkini.</p>
                </div>
            </div>

            <div className="status-card">
                <form onSubmit={handleSubmit} className="status-form">
                    <label className="status-label">Nombor Aduan</label>
                    <div className="status-input">
                        <i className="bi bi-search"></i>
                        <input
                            type="text"
                            placeholder="Contoh: JAIS-AJ-GOM-251227-0001"
                            value={referenceNo}
                            onChange={(event) => setReferenceNo(event.target.value)}
                        />
                        {referenceNo && (
                            <button
                                type="button"
                                className="status-clear"
                                aria-label="Kosongkan carian"
                                onClick={() => setReferenceNo('')}
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

                {result && (
                    <div className="status-result">
                        <div className="status-row">
                            <span>No Aduan</span>
                            <strong>{result.reference_no}</strong>
                        </div>
                        <div className="status-row">
                            <span>Status</span>
                            <strong>{result.current_stage || '-'}</strong>
                        </div>
                        <div className="status-row">
                            <span>Daerah</span>
                            <strong>{result.district_name || '-'}</strong>
                        </div>
                        <div className="status-row">
                            <span>Tarikh</span>
                            <strong>{result.complaint_date || '-'}</strong>
                        </div>
                        <div className="status-summary">
                            <span>Ringkasan</span>
                            <p>{result.summary || '-'}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplaintStatus;
