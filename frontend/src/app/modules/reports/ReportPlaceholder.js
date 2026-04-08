import React from 'react';

const ReportPlaceholder = ({ title, description }) => {
    return (
        <div className="app-section">
            <div className="app-section-header">
                <div>
                    <div className="app-section-eyebrow">PENGURUSAN LAPORAN</div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
            </div>

        </div>
    );
};

export default ReportPlaceholder;
