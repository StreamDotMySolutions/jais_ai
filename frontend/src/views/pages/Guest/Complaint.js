import { useState, useEffect } from 'react';
import { Row, Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputSelect, InputText, InputTextarea } from '../../../libs/FormInput';
import SubmitButton from '../../../libs/SubmitButton';

function Complaint() {
    const store = useStore(); // zustand store management
    const url = process.env.REACT_APP_API_URL; // API server
    const [isLoading, setIsLoading] = useState(false);
    const [districtOptions, setDistrictOptions] = useState([]);

    useEffect(() => {
        // Code to run when the component is loaded (similar to window.onload)
        console.log("Page has loaded!");
        store.emptyData() // clear all previous data
        store.setValue('registered', false ) // init

        const now = new Date();
        const year = now.getFullYear();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 5);
        store.setValue('complaint_year', year);
        store.setValue('complaint_date', date);
        store.setValue('complaint_time', time);
        store.setValue('reference_no', 'Akan dijana sistem');

        // Optionally, you can return a cleanup function to run when the component is unmounted
        return () => {
            console.log("Component is unmounting!");
        };
    }, []); // Empty dependency array means this runs only once, when the component loads

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
        setIsLoading(true)
        
        const formData = new FormData();
        const dataArray = [
            { key: 'complainant_name', value: store.getValue('complainant_name') },
            { key: 'identification_number', value: store.getValue('identification_number') },
            { key: 'contact_number', value: store.getValue('contact_number') },
            { key: 'address', value: store.getValue('address') },
            { key: 'district_id', value: store.getValue('district_id') },
            { key: 'summary', value: store.getValue('summary') },
        ];
        
        appendFormData(formData, dataArray);

        axios({
            method: 'post',
            //url: 'http://localhost:8000/api/frontend/register',
            url: `${url}/complaints`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            console.log(response);
            console.log('Form submitted successfully!');
            store.setValue('success', true) // for redirect purpose
        })
        .catch(error => {
            if( error.response?.status == 422 ){ // detect 422 errors by Laravel
                console.log(error.response.data.errors)
                store.setValue('errors', error.response.data.errors ) // set the errors to store
            }
        })
        .finally(() => {
            setIsLoading(false)
        })
    };


    // show submitted form data
    // useEffect( () => {
    //     // handle redirect after successful registration
    //     if (store.getValue('registered') === true) {
    //         navigate('/sign-in', { replace: true });
    //     }
    // }, [store.getValue('registered')])


    if (store.getValue('success') === true) {
        return (
            <div className="complaint-shell">
                <div className="complaint-card complaint-card-success">
                    <div className="complaint-success-icon">
                        <i className="bi bi-check2-circle"></i>
                    </div>
                    <div>
                        <h2>Terima Kasih!</h2>
                        <p>Aduan anda telah berjaya dihantar. Kami akan memproses aduan anda secepat mungkin.</p>
                    </div>
                </div>
            </div>
        );
    }
    
    return (
        <div className="complaint-shell">
            <div className="complaint-header">
                <div>
                    <span className="complaint-kicker">Aduan Awam</span>
                    <h1>Aduan Online</h1>
                    <p>Isikan maklumat dengan tepat untuk memudahkan tindakan segera.</p>
                </div>
                <div className="complaint-tip">
                    <i className="bi bi-shield-check"></i>
                    Semua maklumat disimpan dengan selamat dan hanya untuk tujuan siasatan.
                </div>
            </div>

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
        </div>
    );

    
}

export default Complaint;
