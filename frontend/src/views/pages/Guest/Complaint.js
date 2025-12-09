import { useState, useEffect } from 'react';
import { Row, Button, Form } from 'react-bootstrap';
import axios from 'axios';
import useStore from '../../../store';
import { appendFormData, InputText, InputTextarea } from '../../../libs/FormInput';
import { useNavigate } from 'react-router-dom';
import SubmitButton from '../../../libs/SubmitButton';

function Register() {
    const navigate = useNavigate();
    const store = useStore(); // zustand store management
    const url = process.env.REACT_APP_API_URL; // API server
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // Code to run when the component is loaded (similar to window.onload)
        console.log("Page has loaded!");
        store.emptyData() // clear all previous data
        store.setValue('registered', false ) // init

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
            { key: 'contact_number', value: store.getValue('contact_number') },
            { key: 'address', value: store.getValue('address') },
            { key: 'identification_number', value: store.getValue('identification_number') },
            { key: 'occupation', value: store.getValue('occupation') },
            { key: 'contents', value: store.getValue('contents') },
     
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
            store.setValue('registered', true) // for redirect purpose
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


    return (
    <Row className='ms-4 col-10'>
        <h1>Aduan Online</h1>
        <hr />
        <Form onSubmit={handleSubmit}>

            <Row>
                <Row className='mb-4'>
                    <InputText 
                        fieldName='name' 
                        placeholder='Your name'  
                        icon='bi-person'
                        isLoading={isLoading}
                    />
                </Row>

                
                <Row className='mb-4'>
                    <InputText 
                        type='text'
                        fieldName='contact_number' 
                        placeholder='Nombor telefon'  
                        icon='bi-phone'
                        isLoading={isLoading}
                    />
                </Row>

                <Row className='mb-4'>
                    <InputTextarea 
                        type='text'
                        fieldName='address' 
                        placeholder='Lokasi kejadian'  
                        icon='bi-globe'
                        rows='5'
                        isLoading={isLoading}
                    />
                </Row>

                <Row className='mb-4'>
                    <InputText 
                        type='text'
                        fieldName='identification_number' 
                        placeholder='Nombor K/P'  
                        icon='bi-card-text'
                        isLoading={isLoading}
                    />
                </Row>

                <Row className='mb-4'>
                    <InputText 
                        type='text'
                        fieldName='occupation' 
                        placeholder='Pekerjaan'  
                        icon='bi-briefcase'
                        isLoading={isLoading}
                    />
                </Row>

                <Row className='mb-4'>
                    <InputTextarea 
                        type='text'
                        fieldName='contents' 
                        placeholder='Butiran Aduan'  
                        icon='bi-pencil'
                        rows='10'
                        isLoading={isLoading}
                    />
                </Row>

            </Row>

            <SubmitButton isLoading={isLoading} value="Hantar" />
        </Form>
    </Row>
    );
}

export default Register;
