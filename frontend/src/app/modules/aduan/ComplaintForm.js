import { useEffect, useState } from 'react';
import { Row, Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputSelect, InputText, InputTextarea } from '../../../libs/FormInput';
import SubmitButton from '../../../libs/SubmitButton';

function ComplaintForm({ onSuccess, showSuccessMessage = true, channelSource = 'portal' }) {
    const store = useStore();
    const url = process.env.REACT_APP_API_URL;
    const [isLoading, setIsLoading] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [success, setSuccess] = useState(false);
    const [referenceNo, setReferenceNo] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        store.emptyData();

        const now = new Date();
        const year = now.getFullYear();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5);
        store.setValue('complaint_year', year);
        store.setValue('complaint_date', date);
        store.setValue('complaint_time', time);
        store.setValue('reference_no', 'Akan dijana sistem');
        store.setValue('case_type', 'AJ');
    }, []);

    useEffect(() => {
        if (!url) {
            return;
        }

        axios.get(`${url}/districts`)
            .then(response => {
                const data = response?.data?.data || [];
                setDistrictOptions(data);
            })
            .catch(error => {
                console.warn('Failed to load districts', error?.message);
            });
    }, [url]);

    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true);
        store.setValue('errors', null);
        setErrorMessage('');

        const formData = new FormData();
        const dataArray = [
            { key: 'complainant_name', value: store.getValue('complainant_name') },
            { key: 'identification_number', value: store.getValue('identification_number') },
            { key: 'contact_number', value: store.getValue('contact_number') },
            { key: 'address', value: store.getValue('address') },
            { key: 'district_id', value: store.getValue('district_id') },
            { key: 'summary', value: store.getValue('summary') },
            { key: 'case_type', value: store.getValue('case_type') || 'AJ' },
            { key: 'channel', value: channelSource },
        ];

        appendFormData(formData, dataArray);

        const token = localStorage.getItem('token');

        axios({
            method: 'post',
            url: `${url}/complaints`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
        })
        .then(response => {
            console.log(response);
            setReferenceNo(response?.data?.reference_no || '');
            setSuccess(true);
            if (onSuccess) {
                onSuccess();
            }
        })
        .catch(error => {
            if (error.response?.status == 422) {
                store.setValue('errors', error.response.data.errors);
            }
            setErrorMessage(error.response?.data?.message || error.message || 'Gagal menghantar aduan.');
        })
        .finally(() => {
            setIsLoading(false);
        });
    };

    if (success && showSuccessMessage) {
        return (
            <div className="complaint-card complaint-card-success">
                <div className="complaint-success-icon">
                    <i className="bi bi-check2-circle"></i>
                </div>
                <div>
                    <h2>Terima Kasih!</h2>
                    <p>Aduan anda telah berjaya dihantar. Kami akan memproses aduan anda secepat mungkin.</p>
                    {referenceNo && (
                        <div className="complaint-ref">
                            No Aduan anda: <strong>{referenceNo}</strong>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (success && !showSuccessMessage) {
        return null;
    }

    return (
        <div className="complaint-card">
            <div className="complaint-meta">
                <div className="complaint-meta-item">
                    <span>Tahun</span>
                    <strong>{store.getValue('complaint_year')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>No Aduan</span>
                    <strong>{store.getValue('reference_no')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>Tarikh</span>
                    <strong>{store.getValue('complaint_date')}</strong>
                </div>
                <div className="complaint-meta-item">
                    <span>Masa</span>
                    <strong>{store.getValue('complaint_time')}</strong>
                </div>
            </div>

            <Form onSubmit={handleSubmit}>
                {errorMessage && (
                    <div className="app-form-error">
                        {errorMessage}
                    </div>
                )}
                <div className="complaint-category">
                    <div>
                        <h3>Kategori Aduan</h3>
                        <p>Pilih kategori aduan untuk menentukan kes atau keluarga.</p>
                    </div>
                    <div className="complaint-category-options">
                        {[
                            { value: 'AJ', label: 'KES - Aduan Jenayah (AJ)' },
                            { value: 'AK', label: 'KELUARGA - Aduan Keluarga (AK)' },
                        ].map((option) => (
                            <label
                                key={option.value}
                                className={`complaint-category-card ${store.getValue('case_type') === option.value ? 'active' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name="case_type"
                                    value={option.value}
                                    checked={store.getValue('case_type') === option.value}
                                    onChange={() => store.setValue('case_type', option.value)}
                                />
                                <span>{option.label}</span>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="complaint-grid">
                    <div className="complaint-section">
                        <h3>Maklumat Pengadu</h3>
                        <Row className='mb-4'>
                            <InputText 
                                fieldName='complainant_name' 
                                placeholder='Nama Pengadu'  
                                icon='bi-person'
                                isLoading={isLoading}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='identification_number' 
                                placeholder='No Kad Pengenalan'  
                                icon='bi-card-text'
                                isLoading={isLoading}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputText 
                                type='text'
                                fieldName='contact_number' 
                                placeholder='No HP'  
                                icon='bi-phone'
                                isLoading={isLoading}
                            />
                        </Row>
                    </div>

                    <div className="complaint-section">
                        <h3>Maklumat Aduan</h3>
                        <Row className='mb-4'>
                            <InputTextarea 
                                type='text'
                                fieldName='address' 
                                placeholder='Alamat'  
                                icon='bi-geo-alt'
                                rows='4'
                                isLoading={isLoading}
                            />
                        </Row>

                        <Row className='mb-4'>
                            <InputSelect
                                fieldName='district_id'
                                placeholder='Pilih Daerah'
                                icon='bi-geo'
                                isLoading={isLoading}
                                options={districtOptions}
                            />
                        </Row>
                    </div>
                </div>

                <div className="complaint-section complaint-span-full">
                    <h3>Ringkasan Aduan</h3>
                    <Row className='mb-4'>
                        <InputTextarea 
                            type='text'
                            fieldName='summary' 
                            placeholder='Ringkasan Aduan'  
                            icon='bi-pencil'
                            rows='8'
                            isLoading={isLoading}
                        />
                    </Row>
                </div>

                <div className="complaint-actions">
                    <SubmitButton isLoading={isLoading} value="Hantar Aduan" />
                </div>
            </Form>
        </div>
    );
}

export default ComplaintForm;
