import { useState, useEffect } from 'react';
import { Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputText } from '../../../libs/FormInput';
import { Link } from 'react-router-dom';
import SubmitButton from '../../../libs/SubmitButton';

function Register() {
    const store = useStore(); // zustand store management
    const url = process.env.REACT_APP_API_URL; // API server
    const [isLoading, setIsLoading] = useState(false);
    const [isRegistered, setIsRegistered] = useState(false);

    useEffect(() => {
        // Code to run when the component is loaded (similar to window.onload)
        console.log("Page has loaded!");
        store.emptyData() // clear all previous data

        // Optionally, you can return a cleanup function to run when the component is unmounted
        return () => {
            console.log("Component is unmounting!");
        };
    }, []); // Empty dependency array means this runs only once, when the component loads


    const handleSubmit = (e) => {
        e.preventDefault();
        setIsLoading(true)
        
        const formData = new FormData();
        const dataArray = [
            { key: 'name', value: store.getValue('name') },
            { key: 'email', value: store.getValue('email') }, 
            { key: 'password', value: store.getValue('password') }, 
            { key: 'password_confirmation', value: store.getValue('password_confirmation') },
        ];
        
        appendFormData(formData, dataArray);

        axios({
            method: 'post',
            //url: 'http://localhost:8000/api/frontend/register',
            url: `${url}/frontend/register`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            console.log(response);
            console.log('Form submitted successfully!');
            setIsRegistered(true);
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


    return (
        <div className="auth-shell">
            <div className={`auth-card ${isLoading ? 'is-loading' : ''}`}>
                <div className="auth-hero">
                    <div>
                        <span className="auth-badge">JAIS AI</span>
                        <h2 className="auth-hero-title">Daftar Akaun Baharu</h2>
                        <p className="auth-hero-subtitle">
                            Akaun anda memberi akses kepada modul aduan, token API, dan papan pemuka JAIS AI.
                        </p>
                    </div>

                    <div className="auth-hero-list">
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-person-check"></i></span>
                            <div>
                                <div className="auth-hero-label">Pengesahan cepat</div>
                                <div className="auth-hero-text">Daftar sekali untuk akses semua modul.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-shield-lock"></i></span>
                            <div>
                                <div className="auth-hero-label">Privasi terjaga</div>
                                <div className="auth-hero-text">Maklumat anda disulitkan dan dilindungi.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-clipboard-check"></i></span>
                            <div>
                                <div className="auth-hero-label">Rekod telus</div>
                                <div className="auth-hero-text">Semua aktiviti direkod untuk audit.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-form">
                    {isRegistered ? (
                        <div className="text-center py-4">
                            <div className="mb-3">
                                <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
                            </div>
                            <h2 className="auth-title">Pendaftaran Berjaya</h2>
                            <p className="text-muted">
                                Akaun anda telah didaftarkan. Pentadbir sistem akan mengaktifkan akaun anda sebelum anda boleh log masuk.
                            </p>
                            <p className="text-muted">
                                Anda akan menerima emel notifikasi sebaik sahaja akaun anda diaktifkan.
                            </p>
                            <div className="mt-4">
                                <Link className="auth-link" to="/sign-in">Log masuk</Link>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="auth-form-header">
                                <span className="auth-kicker">Akaun baharu</span>
                                <h1 className="auth-title">Daftar</h1>
                                <p className="auth-subtitle">Isi maklumat asas untuk mengaktifkan akaun anda.</p>
                            </div>

                            <Form onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label className="auth-label">Nama penuh</label>
                            <InputText 
                                fieldName='name' 
                                placeholder='Nama seperti IC'  
                                icon='bi-people'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Emel</label>
                            <InputText 
                                type='text'
                                fieldName='email' 
                                placeholder='nama@domain.gov.my'  
                                icon='bi-envelope'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Kata laluan</label>
                            <InputText 
                                type='password'
                                fieldName='password' 
                                placeholder='Minimum 8 aksara'  
                                icon='bi-lock'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Sahkan kata laluan</label>
                            <InputText 
                                type='password'
                                password='password_confirmation'
                                fieldName='password_confirmation' 
                                placeholder='Ulang kata laluan'  
                                icon='bi-lock'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-meta">
                            <span className="auth-meta-text">Sudah ada akaun?</span>
                            <Link className="auth-link" to="/sign-in">Log masuk</Link>
                        </div>

                        <SubmitButton isLoading={isLoading} value="Daftar Akaun" />
                    </Form>

                    <div className="auth-divider"></div>
                    <div className="auth-note">
                        Pendaftaran tertakluk kepada polisi keselamatan JAIS AI.
                    </div>
                    <div className="mt-3 text-center">
                        <Link to="/" className="auth-link"><i className="bi bi-house-door"></i> Utama</Link>
                    </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Register;
