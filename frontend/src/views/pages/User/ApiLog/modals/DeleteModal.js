import { useEffect, useState } from 'react'
import { Button, Form, FormCheck, Modal} from 'react-bootstrap'
import { InputText, InputTextarea, appendFormData } from '../../../../../libs/FormInput'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';
import HtmlFormComponent from '../components/HtmlFormComponent';

export default function DeleteModal({id}) {
    const store = useStore()
     const url = process.env.REACT_APP_API_URL + '/tokens'; // API server

    const errors = store.getValue('errors')
   
    const [show, setShow] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)

    const handleShowClick = () =>{
      //store.emptyData() // empty store data
      store.setValue('errors', null)
      store.setValue('acknowledge', false)
      setIsLoading(true)
      setShow(true)
      
      // // load restream data based on given id
      // axios({ 
      //   method: 'get', 
      //   url: `${url}/${id}`,
      //   })
      // .then( response => { // success 200
      //     console.log(response)
      //     if( response?.data?.restream.hasOwnProperty('name') ){
      //       store.setValue('name', response?.data?.restream?.name )
      //     }

      //     if( response?.data?.restream.hasOwnProperty('rtmp_address') ){
      //       store.setValue('rtmp_address', response?.data?.restream?.rtmp_address )
      //     }


      // })
      // .catch( error => {
      //     console.warn(error)
      // })
      // .finally( () => {
      //   setIsLoading(false)
      // })
      
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
            { key: 'acknowledge', value: store.getValue('acknowledge') },
            { key: '_method', value: 'delete' },
        ];
        
        appendFormData(formData, dataArray);

        // Laravel special
        //formData.append('_method', 'post'); // get|post|put|patch|delete

        // send to Laravel
        axios({ 
            method: 'post', 
            url: `${url}/${id}`,
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
          Delete
        </Button>
  
        <Modal size={'lg'} show={show} onHide={handleCloseClick}>
          <Modal.Header closeButton>
            <Modal.Title>Delete Api Key</Modal.Title>
          </Modal.Header>

          <Modal.Body>
              <h1>Are you sure to delete this key ?</h1>
          </Modal.Body>
          
          <Modal.Footer>

            <FormCheck
              className='me-4'
              isInvalid={errors?.hasOwnProperty('acknowledge')}
              reverse
              //disabled={isLoading}
              label="acknowledge"
              type="checkbox"
              onClick={ () => store.setValue('errors', null) }
              onChange={ (e) => store.setValue('acknowledge', true) }
            /> 

            <Button 
              //disabled={isLoading}
              variant="secondary" 
              onClick={handleCloseClick}>
              Close
            </Button>

            <Button 
              //disabled={isLoading}
              variant="primary" 
              onClick={handleSubmitClick}>
              Submit
            </Button>

          </Modal.Footer>
        </Modal>
      </>
    );
  }