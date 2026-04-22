import React, { useState } from 'react';
import { Form } from 'react-bootstrap';
import ComplaintForm from './ComplaintForm';
import { useToast } from '../../components/SharedToastProvider';

// Pegawai create complaint (walk-in/telefon/email/agensi).
// Backend still uses the same /complaints endpoint; we only change the "channel" value.
const ComplainFormPegawai = ({ onSuccess, fixedCaseType = '' }) => {
    const [channel, setChannel] = useState('');
    const [channelError, setChannelError] = useState('');
    const toast = useToast();

    return (
        <div>
            <div className="complaint-template" style={{ marginBottom: '1.25rem' }}>
                <div className="complaint-template-left">
                    <strong>Kaedah Aduan <span className="complaint-required">*</span></strong>
                    <small>Pilih bagaimana aduan diterima (walk-in/telefon/email/agensi).</small>
                </div>
                <div className="complaint-template-actions">
                    {channelError && (
                        <div className="app-input-error" style={{ marginBottom: '0.35rem' }}>
                            {channelError}
                        </div>
                    )}
                    <Form.Select
                        value={channel}
                        onChange={(e) => {
                            const nextChannel = e.target.value;
                            setChannel(nextChannel);
                            if (nextChannel) {
                                setChannelError('');
                            }
                        }}
                    >
                        <option value="">Sila pilih</option>
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
                onValidationError={(message) => {
                    if (message) {
                        toast.error(message);
                    }
                }}
                onOfficerMissingChannel={(message) => {
                    const msg = message || 'Sila pilih Kaedah Aduan sebelum menyimpan.';
                    setChannelError(msg);
                    toast.error(msg);
                }}
                onSuccess={onSuccess}
            />
        </div>
    );
};

export default ComplainFormPegawai;
