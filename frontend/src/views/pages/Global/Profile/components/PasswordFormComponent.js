import React, { } from 'react'
import { InputText } from '../../../../../libs/FormInput'
import useStore from '../../../../../store'

const PasswordFormComponent = ({isLoading}) => {
    const store = useStore()

    return (
        <div>
            <InputText
                fieldName='current_password'
                placeholder='Current Password'
                icon='fa-solid fa-key'
                isLoading={isLoading}
                type='password'
            />
            <br />
            <InputText 
                fieldName='password' 
                placeholder='New Password'
                icon='fa-solid fa-lock'
                isLoading={isLoading}
                type='password'
            />
            <br />
            <InputText 
                fieldName='password_confirmation' 
                placeholder='Confirm New Password'
                icon='fa-solid fa-lock'
                isLoading={isLoading}
                type='password'
            />
 
        </div>
    );
};

export default PasswordFormComponent;
