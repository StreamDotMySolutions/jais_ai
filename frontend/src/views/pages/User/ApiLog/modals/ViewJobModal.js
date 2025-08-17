import { useState } from 'react'
import { Button, Figure, Modal} from 'react-bootstrap'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';


export default function ViewJobModal({filename}) {

    const store = useStore()
    const url = process.env.REACT_APP_SERVER_URL; 
    const [show, setShow] = useState(false)
    const handleClose = () => setShow(false)
    const handleShow = () => setShow(true)


    const handleCloseClick = () => {
      handleClose()
    }

    const handleShowClick = () =>{
      setShow(true)
      store.setValue('errors', null)
      store.setValue('response', null )
  
      
      // load ApiLog based on given ID
      // axios({ 
      //   method: 'get', 
      //   url: `${url}/admin/restreams/${id}`,
      //   })
      // .then( response => { // success 200
      //     console.log(response)
      //     if( response?.data?.restream.hasOwnProperty('name') ){
      //       store.setValue('name', response?.data?.restream?.name )
      //     }
      //     if( response?.data?.restream.hasOwnProperty('rtmp_address') ){
      //       store.setValue('rtmp_address', response?.data?.restream?.rtmp_address )
      //     }
         
      //     })
      // .catch( error => {
      //     console.warn(error)
      // })
      // .finally( () => {
      //   setIsLoading(false)
      // })
      
    } 

    return (
      <>
        <Button variant="primary" onClick={handleShowClick}>
          <small><i class="bi bi-search"></i></small>  
        </Button>
  
        <Modal size={'lg'} show={show} onHide={handleCloseClick}>
          <Modal.Header closeButton>
            <Modal.Title>View Job</Modal.Title>
          </Modal.Header>

          <Modal.Body>
           
          </Modal.Body>
          
          <Modal.Footer>
            <Button 
              variant="secondary" 
              onClick={handleCloseClick}>
              Close
            </Button>
          </Modal.Footer>
        </Modal>
      </>
    );
  }