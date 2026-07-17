import { useState, useEffect } from 'react';
import { Alert, Form } from 'react-bootstrap';
import axios from 'axios';
import { appendFormData, InputText } from '../../../libs/FormInput';
import { Link, Navigate } from 'react-router-dom'
import SubmitButton from '../../../libs/SubmitButton';
import useStore from '../../../store';
import AuthStore from '../../../stores/AuthStore'

function SignIn() {
    const store = useStore(); // zustand store management
    const url = process.env.REACT_APP_API_URL; // API server
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState('');
   
    useEffect(() => {
        // Code to run when the component is loaded (similar to window.onload)
        console.log("Page has loaded!");

        // Zustand presets
        store.emptyData() // clear all previous data
        store.setValue('authenticated', false) // set authenticated to false

        // Optionally, you can return a cleanup function to run when the component is unmounted
        return () => {
            console.log("Component is unmounting!");
        };
    }, []); // Empty dependency array means this runs only once, when the component loads


    // handle form submission
    const handleSubmit = (e) => {
        store.setValue('errors', null ) // reset the error when form is submitting
        setIsLoading(true)
        e.preventDefault();
        
        const formData = new FormData();
        const loginValue = store.getValue('login') || store.getValue('email') || '';
        const dataArray = [
            // Backward-compat: some servers/old code still validate `email`.
            { key: 'login', value: loginValue },
            { key: 'email', value: loginValue },
            { key: 'password', value: store.getValue('password') }, 
        ];
        
        appendFormData(formData, dataArray);
        axios({
            method: 'post',
            url: `${url}/login`,
            data: formData,
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        })
        .then(response => {
            //console.log(response);
            const rawRole = response?.data?.role;
            const normalizedRole = rawRole && rawRole !== 'null' && rawRole !== 'undefined'
                ? rawRole
                : 'awam';
            const districtName = response?.data?.staff?.district?.name || '';
            localStorage.setItem('token', response.data.token) // token to be used with axios interceptor
            localStorage.setItem('role', normalizedRole) // token to be used with profile
            localStorage.setItem('user_name', response.data.user?.name || 'Pengguna')
            localStorage.setItem('user_email', response.data.user?.email || '')
            localStorage.setItem('staff_no', response.data.staff?.staff_id || '')
            localStorage.setItem('staff_ic', response.data.staff?.ic_number || '')
            localStorage.setItem('district_name', districtName)
            store.setValue('authenticated', true) // for redirect purpose
            console.log('Form submitted successfully!');
        })
        .catch(error => {
            if( error.response?.status == 422 ){ // detect 422 errors by Laravel
                console.log(error.response.data.errors)
                store.setValue('errors', error.response.data.errors ) // set the errors to store

                // Show first validation message (e.g. inactive account) as alert
                const responseMessage = error.response?.data?.message;
                const fieldErrors = error.response?.data?.errors;
                const firstFieldError = fieldErrors && Object.values(fieldErrors).flat()[0];
                if (firstFieldError || responseMessage) {
                    setMessageType('danger');
                    setMessage(firstFieldError || responseMessage);
                }
            } else if (error.response?.data?.message) {
                setMessageType('danger');
                setMessage(error.response.data.message);
            } else if(error?.message){
                setMessageType('danger')
                setMessage(error.message)
            }
            console.warn(error.message)
        })
        .finally( () => {
            setIsLoading(false)
        })
    };

    // handle redirect after login
    if (store.getValue('authenticated') === true) {
        return <Navigate to='/app/dashboard' replace />;
    }


    return (
        <div className="auth-shell">
            <div className={`auth-card ${isLoading ? 'is-loading' : ''}`}>
                <div className="auth-hero">
                    <div>
                        <span className="auth-badge">JAIS AI</span>
                        <h2 className="auth-hero-title">Portal Aduan JAIS</h2>
                        <p className="auth-hero-subtitle">
                            Akses selamat untuk mengurus aduan, status kes, dan rekod tindakan.
                        </p>
                    </div>

                    <div className="auth-hero-list">
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-shield-check"></i></span>
                            <div>
                                <div className="auth-hero-label">Rekod terpusat</div>
                                <div className="auth-hero-text">Semua aduan direkod dan dijejak secara telus.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-key"></i></span>
                            <div>
                                <div className="auth-hero-label">Agihan pantas</div>
                                <div className="auth-hero-text">Tugasan dihantar kepada pegawai berkaitan dengan segera.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-bar-chart"></i></span>
                            <div>
                                <div className="auth-hero-label">Jejak tindakan</div>
                                <div className="auth-hero-text">Setiap tindakan dan keputusan direkod untuk audit.</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="auth-form">
                    <div className="auth-form-header">
                        <span className="auth-kicker">Akses selamat</span>
                        <h1 className="auth-title">Log Masuk</h1>
                        <p className="auth-subtitle">Teruskan sesi anda untuk mengurus modul JAIS AI.</p>
                    </div>

                    {message && <Alert className="auth-alert" variant={messageType}>{message}</Alert>}

                    <Form onSubmit={handleSubmit}>
                        <div className="auth-field">
                            <label className="auth-label">Emel / No. Kad Pengenalan</label>
                            <InputText 
                                type='text'
                                fieldName='login' 
                                placeholder='nama@domain.gov.my atau 900101010001'  
                                icon='bi-envelope'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-field">
                            <label className="auth-label">Kata laluan</label>
                            <InputText 
                                type='password'
                                fieldName='password' 
                                placeholder='Masukkan kata laluan'  
                                icon='bi-lock'
                                isLoading={isLoading}
                            />
                        </div>

                        <div className="auth-meta">
                            <span className="auth-meta-text">Belum ada akaun?</span>
                            <Link className="auth-link" to="/register">Daftar sekarang</Link>
                        </div>

                        <SubmitButton isLoading={isLoading} value="Log Masuk" />
                    </Form>

                    <div className="auth-divider"></div>
                    <div className="auth-note">
                        Dengan log masuk, anda bersetuju dengan polisi keselamatan JAIS AI.
                    </div>
                    <div className="mt-3 text-center">
                        <Link to="/" className="auth-link"><i className="bi bi-house-door"></i> Utama</Link>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SignIn;
