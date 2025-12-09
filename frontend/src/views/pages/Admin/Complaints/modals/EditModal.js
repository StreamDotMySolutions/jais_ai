import { useEffect, useState } from 'react'
import { Button, Modal} from 'react-bootstrap'
import { InputText, InputTextarea, appendFormData } from '../../../../../libs/FormInput'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';
import HtmlFormComponent from '../components/HtmlFormComponent';

export default function EditModal({id}) {
    const store = useStore()
    const url = process.env.REACT_APP_API_URL; 

    const errors = store.getValue('errors')
   
    const [show, setShow] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const handleShowClick = () =>{
      //store.emptyData() // empty store data
      store.setValue('errors', null)
      store.setValue('password', null)
      store.setValue('password_confirmation', null)

      setIsLoading(true)
      setShow(true)
      
      // load roles
      axios({ 
          method: 'get', 
          url: `${url}/admin/roles`,// get available roles
          })
      .then( response => { // success 200
          //console.log(response)
          store.setValue('roles', response.data.roles)
          })
      .catch( error => {
          console.warn(error)
      })

      // load user data based on given id
      axios({ 
        method: 'get', 
        url: `${url}/admin/users/${id}`,
        })
      .then( response => { // success 200
          console.log(response)
          if( response?.data?.user.hasOwnProperty('name') ){
            store.setValue('name', response?.data?.user?.name )
          }

          if( response?.data?.user.hasOwnProperty('role_id') ){
            store.setValue('role_id', response?.data?.user?.role_id )
          }

          if( response?.data?.user.hasOwnProperty('email') ){
            store.setValue('email', response?.data?.user?.email )
          }

          if( response?.data?.user.hasOwnProperty('status') ){
            store.setValue('status', response?.data?.user?.status )
          }

          })
      .catch( error => {
          console.warn(error)
      })
      .finally( () => {
        setIsLoading(false)
      })
      
    } 

    const handleCloseClick = () => {
      handleClose()
    }


    /**
     * When user click submit button
     */
    const handleSubmitClick = () => {
        store.setValue('errors', null)
        const formData = new FormData();
        const dataArray = [
            { key: 'name', value: store.getValue('name') },
            { key: 'role_id', value: store.getValue('role_id') },
            { key: 'email', value: store.getValue('email') },
            { key: 'status', value: store.getValue('status') },
          
            { key: 'password', value: store.getValue('password') },
            { key: 'password_confirmation', value: store.getValue('password_confirmation') },
            { key: '_method', value: 'put' },
        ];
        
        appendFormData(formData, dataArray);

        // Laravel special
        //formData.append('_method', 'post'); // get|post|put|patch|delete

        // send to Laravel
        axios({ 
            method: 'post', 
            url: `${url}/admin/users/${id}`,
            data: formData
          })
          .then( response => { // success 200
            console.log(response)
            store.setValue('refresh', true) // to force useEffect get new data for index
            handleClose() // close the modal
          })
          .catch( error => {
            console.warn(error)
            
            if( error.response?.status == 422 ){ // detect 422 errors by Laravel
              console.log(error.response.data.errors)
              store.setValue('errors', error.response.data.errors ) // set the errors to store
            }
          })
          .finally( () => {
            setIsLoading(false)
          })
    }
  
    return (
      <>
        <Button size="sm" variant="primary" onClick={handleShowClick}>
          Edit
        </Button>
  
        <Modal size={'lg'} show={show} onHide={handleCloseClick}>
          <Modal.Header closeButton>
            <Modal.Title>Edit User</Modal.Title>
          </Modal.Header>

          <Modal.Body>
            <HtmlFormComponent isLoading={isLoading} />
          </Modal.Body>
          
          <Modal.Footer>
            <Button 
              disabled={isLoading}
              variant="secondary" 
              onClick={handleCloseClick}>
              Close
            </Button>

            <Button 
              disabled={isLoading}
              variant="primary" 
              onClick={handleSubmitClick}>
              Submit
            </Button>

          </Modal.Footer>
        </Modal>
      </>
    );
  }