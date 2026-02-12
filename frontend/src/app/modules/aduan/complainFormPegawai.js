import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import ComplaintForm from './ComplaintForm';

// Pegawai create complaint (walk-in/telefon/email/agensi).
// Backend still uses the same /complaints endpoint; we only change the "channel" value.
const ComplainFormPegawai = ({ onSuccess, fixedCaseType = '' }) => {
    const [channel, setChannel] = useState('walkin');

    return (
        <div>
            <div className="complaint-template" style={{ marginBottom: '1.25rem' }}>
                <div className="complaint-template-left">
                    <strong>Kaedah Aduan <span className="complaint-required">*</span></strong>
                    <small>Pilih bagaimana aduan diterima (walk-in/telefon/email/agensi).</small>
                </div>
                <div className="complaint-template-actions">
                    <Form.Select
                        value={channel}
                        onChange={(e) => setChannel(e.target.value)}
                    >
                        <option value="walkin">Walk-in / Kaunter</option>
                        <option value="telefon">Telefon</option>
                        <option value="email">Email</option>
                        <option value="agensi">Agensi</option>
                        <option value="lain">Lain-lain</option>
                    </Form.Select>
                </div>
            </div>

            <ComplaintForm
                showSuccessMessage={false}
                channelSource={channel}
                officerMode
                fixedCaseType={fixedCaseType}
                onSuccess={onSuccess}
            />
        </div>
    );
};

export default ComplainFormPegawai;
