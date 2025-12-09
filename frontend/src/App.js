import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProtectedRoute from './libs/ProtectedRoute';

// Layouts
import GuestLayout from './views/layouts/GuestLayout/GuestLayout';
import HomeLayout from './views/layouts/HomeLayout/HomeLayout';
import UserLayout from './views/layouts/UserLayout/UserLayout';
import AdminLayout from './views/layouts/AdminLayout/AdminLayout';

// role = Guest
import LoginPage from './views/pages/LoginPage';
import DashboardPage from './views/pages/User/DashboardPage';


// role = User
import UserHomePage from './views/pages/User/Home';
import ApiToken from './views/pages/User/ApiToken';
import ApiLog from './views/pages/User/ApiLog';

// role = Admin
import AdminHomePage from './views/pages/Admin/Home';
import UserManagement from './views/pages/Admin/Users';


// Common
import Profile from './views/pages/Global/Profile';
import AboutUs from './views/pages/Guest/AboutUs';
import SignIn from './views/pages/Guest/SignIn';
import Register from './views/pages/Guest/Register';
import ContactUs from './views/pages/Guest/ContactUs';
import SignOut from './views/pages/Guest/SignOut';
import Complaint from './views/pages/Guest/Complaint';


import './App.css';
import HomePage from './views/pages/HomePage';


function App() {
  return (
    <Router>
      <Routes>
        
        {/* Guest Layout */}
        <Route element={<GuestLayout />}>
          <Route path="/" element={<HomePage/>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LoginPage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
           <Route path="/complaint" element={<Complaint />} />
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* User Layout */}
        <Route element={<ProtectedRoute role={'user'} />}>
          <Route element={<UserLayout />}>
            <Route path="/user/home" element={<UserHomePage />} />
            <Route path="/user/api-token" element={<ApiToken />} />
            <Route path="/user/api-logs" element={<ApiLog />} />
            <Route path="/user/Profile" element={<Profile />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/sign-out" element={<SignOut />} />
          </Route>  
        </Route>

        {/* Admin Layout */}
        <Route element={<ProtectedRoute role={'admin'} />}>`
          <Route element={<AdminLayout />}>`
            <Route path="/admin/home" element={<AdminHomePage />} />
            <Route path="/admin/users" element={<UserManagement />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
