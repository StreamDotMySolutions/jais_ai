import React from 'react';
import { Link } from 'react-router-dom';
import Account from '../Global/Account';

const SideBar = () => {
    return (
        <div className="col-12 col-sm-3 col-xl-2 px-sm-2 px-0 bg-user d-flex sticky-top">
        <div className="d-flex flex-sm-column flex-row flex-grow-1 align-items-center align-items-sm-start px-3 pt-2 text-dark-custom">
       
        <span className="fs-5 fw-bold">U<span className="d-none d-sm-inline">ser Panel</span></span>
        
         <ul className="nav nav-pills flex-sm-column flex-row flex-nowrap flex-shrink-1 flex-sm-grow-0 flex-grow-1 mb-sm-auto mb-0 justify-content-center align-items-center align-items-sm-start" id="menu">
                <li className="nav-item">
                    <Link to="/user/home" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-house"></i><span className="ms-1 d-none d-sm-inline">Home</span>
                    </Link>

                    <Link to="/user/api-token" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-key"></i><span className="ms-1 d-none d-sm-inline">API Token</span>
                    </Link>

                    <Link to="/user/api-logs" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-activity"></i><span className="ms-1 d-none d-sm-inline">API Usage</span>
                    </Link>
                </li>

             
            </ul>
            <Account />
        </div>
    </div>
    );
};

export default SideBar;