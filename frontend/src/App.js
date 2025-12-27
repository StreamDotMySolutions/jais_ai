import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProtectedRoute from './libs/ProtectedRoute';

// Layouts
import GuestLayout from './views/layouts/GuestLayout/GuestLayout';
import HomeLayout from './views/layouts/HomeLayout/HomeLayout';
import UserLayout from './views/layouts/UserLayout/UserLayout';
import AdminLayout from './views/layouts/AdminLayout/AdminLayout';
import PublicLayout from './views/layouts/PublicLayout/PublicLayout';
import PegawaiLayout from './views/layouts/PegawaiLayout/PegawaiLayout';

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
import ComplaintManagement from './views/pages/Admin/Complaints';

// role = Pegawai
import PegawaiHomePage from './views/pages/Pegawai/Home';


// Common
import Profile from './views/pages/Global/Profile';
import AboutUs from './views/pages/Guest/AboutUs';
import SignIn from './views/pages/Guest/SignIn';
import Register from './views/pages/Guest/Register';
import ContactUs from './views/pages/Guest/ContactUs';
import SignOut from './views/pages/Guest/SignOut';
import Complaint from './views/pages/Guest/Complaint';
import PublicHomePage from './views/pages/Website/PublicHomePage';



import './App.css';
import HomePage from './views/pages/HomePage';


function App() {
  return (
    <Router>
      <Routes>
        
        <Route path="/" element={<PublicHomePage />} />

        {/* Guest Layout */}
        <Route element={<GuestLayout />}>
          <Route path="/" element={<HomePage/>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LoginPage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
        </Route>

        {/* Auth Layout */}
        <Route element={<HomeLayout />}>
          <Route path="/sign-in" element={<SignIn />} />
          <Route path="/register" element={<Register />} />
        </Route>

        {/* Public Layout */}
        <Route element={<PublicLayout />}>
          <Route path="/complaint" element={<Complaint />} />
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
            <Route path="/admin/complaints" element={<ComplaintManagement />} />
          </Route>
        </Route>

        {/* Pegawai Layout */}
        <Route element={<ProtectedRoute role={'pegawai'} />}>
          <Route element={<PegawaiLayout />}>
            <Route path="/pegawai/home" element={<PegawaiHomePage />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
