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
        const dataArray = [
            { key: 'email', value: store.getValue('email') }, 
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
            localStorage.setItem('token', response.data.token) // token to be used with axios interceptor
            localStorage.setItem('role', response.data.role) // token to be used with profile
            localStorage.setItem('user_name', response.data.user?.name || 'Pengguna')
            localStorage.setItem('user_email', response.data.user?.email || '')
            localStorage.setItem('staff_no', response.data.staff?.staff_id || '')
            localStorage.setItem('staff_ic', response.data.staff?.ic_number || '')
            store.setValue('authenticated', true) // for redirect purpose
            console.log('Form submitted successfully!');
        })
        .catch(error => {
            if( error.response?.status == 422 ){ // detect 422 errors by Laravel
                console.log(error.response.data.errors)
                store.setValue('errors', error.response.data.errors ) // set the errors to store
            }

            if(error?.message){
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
                        <h2 className="auth-hero-title">Portal Identiti Digital</h2>
                        <p className="auth-hero-subtitle">
                            Akses selamat untuk urus akaun, token API, dan log penggunaan anda.
                        </p>
                    </div>

                    <div className="auth-hero-list">
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-shield-check"></i></span>
                            <div>
                                <div className="auth-hero-label">Keselamatan diperkukuh</div>
                                <div className="auth-hero-text">Sesi dilindungi dan audit log disimpan.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-key"></i></span>
                            <div>
                                <div className="auth-hero-label">Token API terurus</div>
                                <div className="auth-hero-text">Cipta, pantau, dan nyahaktif token dengan cepat.</div>
                            </div>
                        </div>
                        <div className="auth-hero-item">
                            <span className="auth-hero-icon"><i className="bi bi-bar-chart"></i></span>
                            <div>
                                <div className="auth-hero-label">Log penggunaan jelas</div>
                                <div className="auth-hero-text">Pantau panggilan API dan prestasi masa nyata.</div>
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
                </div>
            </div>
        </div>
    );
}

export default SignIn;
