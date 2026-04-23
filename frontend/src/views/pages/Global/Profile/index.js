import React , { useState,useEffect } from 'react';
import useStore from '../../../../store';
import axios from '../../../../libs/axios';
import { Badge, Table } from 'react-bootstrap';
import { useLocation, useNavigate } from 'react-router-dom';
import EditModal from './modals/EditModal';
import PasswordModal from './modals/PasswordModal';

const Profile = () => {
    const store = useStore();
    const location = useLocation();
    const navigate = useNavigate();
    const url = process.env.REACT_APP_API_URL + '/account'; // API server
    const [isLoading, setIsLoading] = useState(false);
    const account = store.getValue('account');
    const [shouldAutoOpenPassword, setShouldAutoOpenPassword] = useState(false);

    useEffect(() => {
        const params = new URLSearchParams(location.search || '');
        const changePassword = params.get('changePassword');
        setShouldAutoOpenPassword(changePassword === '1' || changePassword === 'true');
    }, [location.search]);

    const handlePasswordAutoOpened = () => {
        const params = new URLSearchParams(location.search || '');
        if (!params.has('changePassword')) {
            return;
        }
        params.delete('changePassword');
        const nextSearch = params.toString();
        navigate(
            {
                pathname: location.pathname,
                search: nextSearch ? `?${nextSearch}` : '',
            },
            { replace: true }
        );
        setShouldAutoOpenPassword(false);
    };

    // preset
    useEffect(() => {
        // Code to run when the component is loaded (similar to window.onload)
        console.log("Page has loaded!");

        // Zustand presets
        store.emptyData() // clear all previous data
        store.setValue('refresh', false ) // refresh set to false

        // Optionally, you can return a cleanup function to run when the component is unmounted
        return () => {
            console.log("Component is unmounting!");
        };
    }, []); // Empty dependency array means this runs only once, when the component loads

        // to get items data
    useEffect( () => 
        {
            // modified axios to prepend Bearer Token on header
            axios( 
                {
                    method: 'get', // method is GET
                    url: url
                } 
            )
            .then( response => { // response block
                console.log(response)
                //setItems(response.data.users) // get the data
                store.setValue('account', response.data.user)
                store.setValue('refresh', false ) // reset the refresh state to false
            })
            .catch( error => { // error block
                console.warn(error) // output to console
            })
        },
        [
            store.getValue('refresh') // listener when create / update / delete / search performed
        ] 

    ) // useEffect()

    return (
        <div>
            <h1>My Account</h1>
            
            <Table style={{'width' : '1000px'}}>
                <thead>
                    <tr>
                    <th className='text-center' style={{'width' : '10px'}}>ID</th>
                        <th>Role</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Created At</th>
                        <th className='text-center' style={{'width' : '400px'}}>Action</th>
                    </tr>
                </thead>
                <tbody>
                    {account ?
                    <tr>
                        <td>{account?.id}</td>
                        <td>
                        {account?.roles?.map((role, index) => (
                            <span key={index}>
                            <Badge bg='dark'>{role.name.toUpperCase()}</Badge>
                            {index < account.roles.length - 1 && ", "} {/* Adds a comma between role names except after the last one */}
                            </span>
                        ))}
                        </td>
                        <td>{account?.name}</td>
                        <td>{account?.email}</td>
                        <td>{account?.created_at}</td>
                        <td className='text-center'>
                            <EditModal />
                            {' '}
                            <PasswordModal autoOpen={shouldAutoOpenPassword} onAutoOpened={handlePasswordAutoOpened} />
                        </td>
                    </tr>
                    :
                    <tr>
                        <td colSpan={6}>loading...</td>
                    </tr>
                    }
                </tbody>
            </Table>
        </div>
    );
};

export default Profile;
