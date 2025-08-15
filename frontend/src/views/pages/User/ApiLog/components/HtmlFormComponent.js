import React, { useEffect, useState } from 'react'
import { InputText,InputFile, InputRadio, InputDate, InputTextarea, InputSelect, TextEditor } from '../../../../../libs/FormInput';
import { Form,Row,Col, Image, Figure, FormGroup } from 'react-bootstrap';
import useStore from '../../../../../store'

const HtmlFormComponent = ({isLoading}) => {
    const store = useStore();
    const url = process.env.REACT_APP_SERVER_URL; 

    return (
        <>
            <Col className='mb-2'>
                <InputText
                    fieldName='name' 
                    placeholder='Name'  
                    icon='fa-solid fa-pencil'
                    isLoading={isLoading}
                />
            </Col>

        </>
    );
};

export default HtmlFormComponent;