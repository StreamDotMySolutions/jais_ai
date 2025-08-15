import React from 'react'
import { Button } from 'react-bootstrap'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store'

const OrderingComponent = ({id,direction, disabled=false}) => {
    const store = useStore() // global store
    const url = process.env.REACT_APP_API_URL; 

    const handleClick = () => {
        //console.log(`content ${id} ordering is ${direction}`)

        // send request to laravel
        axios(`${url}/admin/restreams/ordering/${id}?direction=${direction}`)
        .then( response => {
            //console.log(response)
            store.setValue('refresh', true) // trigger DataTable useEffect()
        })
        .catch( error => {
            console.warn(error)
        })
    }

    return (
    
        <Button disabled={disabled} onClick={handleClick} size='sm' variant='outline-secondary'>
            <i className={`fas fa-caret-${direction}`}></i>
        </Button>
 
    )
}
export default OrderingComponent;