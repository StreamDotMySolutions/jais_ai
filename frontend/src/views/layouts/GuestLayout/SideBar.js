import React from 'react';
import { Link } from 'react-router-dom';

const SideBar = () => {
    return (
        <div className="col-12 col-sm-3 col-xl-2 px-sm-2 px-0 bg-guest d-flex sticky-top">
        <div className="d-flex flex-sm-column flex-row flex-grow-1 align-items-center align-items-sm-start px-3 pt-2 text-dark-custom">
            <a href="/" className="d-flex align-items-center pb-sm-3 mb-md-0 me-md-auto text-dark-custom text-decoration-none">
                <span className="fs-5"><span className="d-none d-sm-inline"><strong>JAIS</strong> ai</span></span>
            </a>
            <ul className="nav nav-pills flex-sm-column flex-row flex-nowrap flex-shrink-1 flex-sm-grow-0 flex-grow-1 mb-sm-auto mb-0 justify-content-center align-items-center align-items-sm-start" id="menu">
                <li className="nav-item">
                    <Link to="/" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-house"></i><span className="ms-1 d-none d-sm-inline">Utama</span>
                    </Link>
                </li>

                <li className="nav-item">
                    <Link to="/about-us" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-people"></i><span className="ms-1 d-none d-sm-inline">Mengenai Kami</span>
                    </Link>
                </li>

                <li className="nav-item">
                    <span className="nav-link text-dark-custom px-sm-0 px-2 opacity-50" style={{ pointerEvents: "none" }} aria-disabled="true">
                        <i className="fs-5 bi-pencil"></i><span className="ms-1 d-none d-sm-inline">Aduan Online</span>
                    </span>
                </li>

                <li className="nav-item">
                    <Link to="/contact-us" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-envelope"></i><span className="ms-1 d-none d-sm-inline">Hubungi Kami</span>
                    </Link>
                </li>

                <li className="nav-item">
                    <Link to="/sign-in" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-box-arrow-in-right"></i><span className="ms-1 d-none d-sm-inline">Log Masuk</span>
                    </Link>
                </li>

                <li className="nav-item">
                    <Link to="/register" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-pencil"></i><span className="ms-1 d-none d-sm-inline">Daftar</span>
                    </Link>
                </li>
       
               
            </ul>
        </div>
    </div>
    );
};

export default SideBar;