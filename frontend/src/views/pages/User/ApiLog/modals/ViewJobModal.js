import { useState } from 'react'
import { Button, Modal, Spinner, Accordion } from 'react-bootstrap'
import axios from '../../../../../libs/axios'
import useStore from '../../../../../store';

export default function ViewJobModal({ id }) {

  const store = useStore()
  const url = process.env.REACT_APP_API_URL + '/logs'; // API server
  const [show, setShow] = useState(false)
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false)

  const handleClose = () => setShow(false)

  const handleShowClick = () => {
    setShow(true)
    setIsLoading(true)
    store.setValue('errors', null)
    store.setValue('response', null)

    axios({
      method: 'get',
      url: `${url}/${id}`,
    })
      .then(response => {
        setData(response.data);
        console.log(response)
      })
      .catch(error => {
        console.warn(error)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  // Parse result JSON kalau ada
  let parsedResult = {};
  try {
    parsedResult = JSON.parse(data?.result);
  } catch (e) {
    parsedResult = { raw: data?.result };
  }

  return (
    <>
      <Button variant="primary" onClick={handleShowClick}>
        <small><i className="bi bi-search"></i></small>
      </Button>

      <Modal size={'xl'} show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>View Job</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {isLoading ? (
            <div className="text-center my-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2">Loading...</p>
            </div>
          ) : (
            data && (
              <div className="container mt-4">
                <div className="card shadow border-0">
                  <div className="card-header bg-primary text-white">
                    <h5 className="mb-0">Document Job Detail</h5>
                  </div>
                  <div className="card-body">
                    <ul className="list-group list-group-flush">
                      {/* <li className="list-group-item">
                        <strong>ID:</strong> {data?.id}
                      </li>
                      <li className="list-group-item">
                        <strong>API Log ID:</strong> {data?.api_log_id}
                      </li> */}
                      <li className="list-group-item">
                        <strong>File Name:</strong> {data?.file_name}
                      </li>
                      <li className="list-group-item">
                        <strong>Status:</strong>{" "}
                        <span className={`badge ${data?.status === "completed" ? "bg-success" : "bg-warning"}`}>
                          {data?.status}
                        </span>
                      </li>
                      <li className="list-group-item">
                        <strong>Created At:</strong> {new Date(data?.updated_at).toLocaleString()}
                      </li>
              
                    </ul>

                     <Accordion defaultActiveKey="0">
                      <Accordion.Item eventKey="0">
                        <Accordion.Header>JSON Result</Accordion.Header>
                        <Accordion.Body>
                          <pre style={{ background: "#f8f9fa", padding: "1rem", borderRadius: "8px" }}>
                            {JSON.stringify(parsedResult, null, 2)}
                          </pre>
                        </Accordion.Body>
                      </Accordion.Item>
                    </Accordion>
                  </div>
                </div>
              </div>
            )
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
