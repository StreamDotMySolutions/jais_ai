import React from 'react'
import { Button } from 'react-bootstrap'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store'

const StreamComponent = ({id,isActive, disabled}) => {
    const store = useStore() // global store
    const url = process.env.REACT_APP_API_URL; 

    const handleClick = () => {
     
        let apiUrl

        if(isActive == 0){
            apiUrl = `${url}/admin/restreams/start-streaming/${id}`
        } else {
            apiUrl = `${url}/admin/restreams/stop-streaming/${id}`
        }

        // send request to api to initiate streaming
        axios(apiUrl)
        .then( response => {
            //console.log(response)
            store.setValue('refresh', true) // trigger DataTable useEffect()
        })
        .catch( error => {
            console.warn(error)
        })
    }

    return (
    
        <Button
            disabled={disabled}
            onClick={handleClick}
            size="sm"
            variant={isActive === 0 ? 'outline-success' : 'outline-danger'}
        >
            <i className={`fas ${isActive === 0 ? 'fa-play' : 'fa-stop'}`}></i>
        </Button>

 
    )
}
export default StreamComponent;