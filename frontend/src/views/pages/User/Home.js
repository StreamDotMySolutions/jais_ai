import { useEffect } from 'react';
import useStore from '../../../store';
import axios from '../../../libs/axios';

const Home = () => {
    const store = useStore();
    const url = process.env.REACT_APP_API_URL + '/dashboard';

    // reset
    useEffect(() => {
        console.log("Page has loaded!");
        store.setValue('response', null);

        return () => {
            console.log("Component is unmounting!");
        };
    }, []);

    // get items data ( dashboard )
    useEffect(() => {
        axios({
            method: 'get',
            url: store.getValue('url') ? store.getValue('url') : url,
        })
            .then((response) => {
                console.log(response);
                store.setValue('response', response.data);
            })
            .catch((error) => {
                console.warn(error);
            });
    }, [store.getValue('url'), store.getValue('refresh')]);

    const response = store.getValue('response');
    console.log(response);

    return (
        <div className="container-fluid">
            <h2>Dashboard</h2>

            <div className="row g-3">
                {/* Card 1 */}
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card shadow-sm border-1 h-100 bg-light">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="text-muted mb-1">Token Count</h6>
                                    <div id="totalRequests" className="fs-3 fw-bold">
                                        {response?.totalApiKeys}
                                    </div>
                                </div>
                                <span className="badge bg-success-subtle text-success-emphasis">REQ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 2 */}
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card shadow-sm border-1 h-100 bg-light">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="text-muted mb-1">Attachment Size</h6>
                                    <div id="totalRequests" className="fs-3 fw-bold">
                                        {response?.totalMB} MB
                                    </div>
                                </div>
                                <span className="badge bg-success-subtle text-success-emphasis">REQ</span>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Card 3 */}
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card shadow-sm border-1 h-100 bg-light">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="text-muted mb-1">Total Requests</h6>
                                    <div id="totalRequests" className="fs-3 fw-bold">
                                        {response?.totalRequests} 
                                    </div>
                                </div>
                                <span className="badge bg-success-subtle text-success-emphasis">REQ</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Card 4 */}
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card shadow-sm border-1 h-100 bg-light">
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 className="text-muted mb-1">Processing Time</h6>
                                    <div id="totalRequests" className="fs-3 fw-bold">
                                        {response?.totalSeconds} seconds
                                    </div>
                                </div>
                                <span className="badge bg-success-subtle text-success-emphasis">REQ</span>
                            </div>
                        </div>
                    </div>
                </div>
                {/* Tambah card lain ikut keperluan */}
            </div>
        </div>
    );
};

export default Home;
