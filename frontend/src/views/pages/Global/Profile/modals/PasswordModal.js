import { useEffect, useState } from 'react'
import { Button, Modal} from 'react-bootstrap'
import { appendFormData } from '../../../../../libs/FormInput'
import HtmlFormComponent from '../components/HtmlFormComponent'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';
import PasswordFormComponent from '../components/PasswordFormComponent'

export default function EditModal({ id, autoOpen = false, onAutoOpened }) {
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
      store.setValue('current_password', null)
      store.setValue('password', null)
      store.setValue('password_confirmation',null)
      setShow(true)
    } 

    const handleCloseClick = () => {
      handleClose()
    }

    useEffect(() => {
      if (!autoOpen) {
        return;
      }
      handleShowClick();
      if (typeof onAutoOpened === 'function') {
        onAutoOpened();
      }
    }, [autoOpen]);


    /**
     * When user click submit button
     */
    const handleSubmitClick = () => {
        store.setValue('errors', null)
        const formData = new FormData();
        const dataArray = [
            { key: 'current_password', value: store.getValue('current_password') },
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
            url: `${url}/account/change_password`,
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
          Change Password
        </Button>
  
        <Modal size={'lg'} show={show} onHide={handleCloseClick}>
          <Modal.Header closeButton>
            <Modal.Title>Change Password</Modal.Title>
          </Modal.Header>

          <Modal.Body>
              <PasswordFormComponent />
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
