import React, { useState,useEffect } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import useStore from '../store';
import useAuthStore from '../stores/AuthStore';
import axios from './axios';

/**
 * Being used at App.js to protect route that need to be logged in
 */
const ProtectedRoute = ({role}) => {

    const store = useStore(); // use global store
    const authStore = useAuthStore(); // use global store
    const url = process.env.REACT_APP_API_URL; // API server
    const normalizeRole = (value) => {
        const text = (value || '').toString().trim().toLowerCase();
        if (!text || text === 'null' || text === 'undefined') {
            return 'awam';
        }
        return text;
    };

    //console.log(role)

    // get user data from server
    useEffect( () => {
     
        axios({
            method: 'get',
            url: `${url}/user`, // localhist:8080/api/user ( sanctum protected )
        })
        .then(response => {
            console.log(response.data);
            authStore.setValue('auth.email', response.data.user.email)
            authStore.setValue('auth.name', response.data.user.name)
            authStore.setValue('auth.role', normalizeRole(response.data.role))
        })
        .catch(error => {
            console.warn(error)
            if( error.response?.status === 401 ){ // 401 means unauthorized from laravel
                localStorage.removeItem('token') // remove the token
                localStorage.removeItem('role') // remove the token 
                store.setValue('authenticated', false) // for redirect purpose
            }
        })
        .finally( () => {
           
        })

    },[] ) // every time page is loaded

    // handle redirect
    if( store.getValue('authenticated') === false) {
        return <Navigate to='/sign-in' replace />
    } else {
         return <Outlet />
    }

   
}
export default ProtectedRoute
