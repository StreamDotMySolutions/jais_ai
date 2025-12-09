import React, { useEffect } from 'react'
import { InputText, InputSelect } from '../../../../../libs/FormInput'
import useStore from '../../../../../store'

const HtmlFormComponent = ({isLoading}) => {
    const store = useStore()

    const statusOptions = [
    { id: 1, name: 'Active' },
    { id: 0, name: 'Inactive' }
        ];

    return (
        <div>
            <InputText 
                fieldName='name' 
                placeholder='Name'  
                icon='fa-solid fa-user'
                isLoading={isLoading}
            />
            <br />

            <InputSelect 
                  fieldName='role_id' 
                  options = {store.getValue('roles')}
                  placeholder='Choose a role'  
                  icon='fa-solid fa-graduation-cap'
                  isLoading={isLoading}
                />
            <br />

          <InputSelect 
                  fieldName='status' 
                  options = {statusOptions}
                  placeholder='Select status'  
                  icon='fa-solid fa-plug'
                  isLoading={isLoading}
                />
            <br />

            <InputText 
                fieldName='email' 
                placeholder='E-mail'  
                icon='fa-solid fa-envelope'
                isLoading={isLoading}
                type='email'
            />
            <br />
            <InputText 
                fieldName='password' 
                placeholder='Password'  
                icon='fa-solid fa-lock'
                isLoading={isLoading}
                type='password'
            />
                        <br />
            <InputText 
                fieldName='password_confirmation' 
                placeholder='Confirm Password'  
                icon='fa-solid fa-lock'
                isLoading={isLoading}
                type='password'
            />
        </div>
    );
};

export default HtmlFormComponent;