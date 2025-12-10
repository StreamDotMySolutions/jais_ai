import { useEffect, useState } from 'react'
import { Button, Modal} from 'react-bootstrap'
import { InputText, InputTextarea, appendFormData } from '../../../../../libs/FormInput'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';
import HtmlFormComponent from '../components/HtmlFormComponent';

export default function ViewModal({id}) {
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
      setIsLoading(true)
      setShow(true)
      
      // load user data based on given id
      axios({ 
        method: 'get', 
        url: `${url}/admin/complaints/${id}`,
        })
      .then( response => { // success 200
          console.log(response)
          
          if( response?.data?.user.hasOwnProperty('name') ){
            store.setValue('name', response?.data?.user?.name )
          }

          if( response?.data?.user.hasOwnProperty('contact_number') ){
            store.setValue('contact_number', response?.data?.user?.contact_number )
          }

          if( response?.data?.user.hasOwnProperty('identification_number') ){
            store.setValue('identification_number', response?.data?.user?.identification_number )
          }

          if( response?.data?.user.hasOwnProperty('address') ){
            store.setValue('address', response?.data?.user?.address )
          }

          if( response?.data?.user.hasOwnProperty('contents') ){
            store.setValue('contents', response?.data?.user?.contents )
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

          </Modal.Body>
          
          <Modal.Footer>
            <Button 
              disabled={isLoading}
              variant="secondary" 
              onClick={handleCloseClick}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }