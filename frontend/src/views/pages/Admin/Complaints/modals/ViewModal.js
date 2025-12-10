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
          
          if( response?.data?.complaint.hasOwnProperty('name') ){
            store.setValue('name', response?.data?.complaint?.name )
          }

          if( response?.data?.complaint.hasOwnProperty('contact_number') ){
            store.setValue('contact_number', response?.data?.complaint?.contact_number )
          }

          if( response?.data?.complaint.hasOwnProperty('identification_number') ){
            store.setValue('identification_number', response?.data?.complaint?.identification_number )
          }

          if( response?.data?.complaint.hasOwnProperty('address') ){
            store.setValue('address', response?.data?.complaint?.address )
          }

          if( response?.data?.complaint.hasOwnProperty('contents') ){
            store.setValue('contents', response?.data?.complaint?.contents )
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
          Lihat
        </Button>
  
        <Modal size={'lg'} show={show} onHide={handleCloseClick}>
          <Modal.Header closeButton>
            <Modal.Title>Aduan ID : {id}</Modal.Title>
          </Modal.Header>

        <Modal.Body>
    
          <strong>Nama:</strong> {store.getValue('name')} <br/>
          <strong>K/P:</strong> {store.getValue('identification_number')} <br/>
          <strong>Alamat:</strong> {store.getValue('address')} <br/>
          <strong>Telefon:</strong> {store.getValue('contact_number')} 
          <br/><br/>

          <strong>Aduan:</strong>
          <div className='mb-3 mt-2' style={{
              backgroundColor: '#FFF9C4',        // kuning cair
              padding: '12px',
              borderRadius: '6px',
              border: '1px solid #F0E68C'
             }}>
            
              
              {store.getValue('contents')}
              
          </div>


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