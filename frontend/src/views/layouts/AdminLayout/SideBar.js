import React from 'react';
import { Link } from 'react-router-dom';
import useStore from '../../../store';
import Account from '../Global/Account';

const SideBar = () => {
    const store = useStore();
    return (
        <div className="col-12 col-sm-3 col-xl-2 px-sm-2 px-0 bg-admin d-flex sticky-top">
        <div className="d-flex flex-sm-column flex-row flex-grow-1 align-items-center align-items-sm-start px-3 pt-2 text-dark-custom">
            <a href="/" className="d-flex align-items-center pb-sm-3 mb-md-0 me-md-auto text-dark-custom text-decoration-none">
                <span className="fs-5">A<span className="d-none d-sm-inline">dmin Panel</span></span>
            </a>
            <ul className="nav nav-pills flex-sm-column flex-row flex-nowrap flex-shrink-1 flex-sm-grow-0 flex-grow-1 mb-sm-auto mb-0 justify-content-center align-items-center align-items-sm-start" id="menu">
                <li className="nav-item">
                    <Link to="/admin/home" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-speedometer"></i><span className="ms-1 d-none d-sm-inline">Dashboard</span>
                    </Link>

                    {/* <Link to="/admin/modules" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-gear"></i><span className="ms-1 d-none d-sm-inline">Modules</span>
                    </Link>  */}

                    <Link to="/admin/users" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-people"></i><span className="ms-1 d-none d-sm-inline">Pengguna</span>
                    </Link>

                    <Link to="/admin/complaints" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-pencil"></i><span className="ms-1 d-none d-sm-inline">Aduan</span>
                    </Link>
{/* 
                    <Link to="/admin/livestream" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-camera"></i><span className="ms-1 d-none d-sm-inline text-muted">Livestream</span>
                    </Link>

                    <Link to="/admin/recording" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-database"></i><span className="ms-1 d-none d-sm-inline">Recording</span>
                    </Link> */}

                    {/* <Link to="/admin/topics" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-p-circle"></i><span className="ms-1 d-none d-sm-inline">Carta Undi</span>
                    </Link> */}

                    {/* <Link to="/admin/chatroom" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-chat"></i><span className="ms-1 d-none d-sm-inline">Chatroom</span>
                    </Link> */}

                
{/* 
                    <Link to="/admin/banners" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-image"></i><span className="ms-1 d-none d-sm-inline">Banner</span>
                    </Link>

                    <Link to="/admin/deejays" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-person"></i><span className="ms-1 d-none d-sm-inline">Deejay</span>
                    </Link> */}

                    {/* <Link to="/admin/banners" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-clipboard"></i><span className="ms-1 d-none d-sm-inline">News</span>
                    </Link> */}

                    {/* <Link to="/admin/banners" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-image"></i><span className="ms-1 d-none d-sm-inline">Gallery</span>
                    </Link> */}

                    {/* <Link to="/admin/banners" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-code"></i><span className="ms-1 d-none d-sm-inline">Header</span>
                    </Link> */}
{/* 
                    <Link to="/admin/livestream" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-camera"></i><span className="ms-1 d-none d-sm-inline">Livestream</span>
                    </Link> 

                    <Link to="/admin/restream" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-link"></i><span className="ms-1 d-none d-sm-inline">Restream</span>
                    </Link> 
                    
                    <Link to="/admin/chatrooms" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-chat"></i><span className="ms-1 d-none d-sm-inline">Chatroom</span>
                    </Link> 

                    <Link to="/admin/footer" className="nav-link text-dark-custom px-sm-0 px-2">
                        <i className="fs-5 bi-code"></i><span className="ms-1 d-none d-sm-inline">Footer</span>
                    </Link>  */}


                    
                </li>
            </ul>
            <Account />
        </div>
    </div>
    );
};

export default SideBar;