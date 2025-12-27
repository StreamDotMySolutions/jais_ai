import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProtectedRoute from './libs/ProtectedRoute';

import AppLayout from './app/layouts/AppLayout';

// Layouts
import GuestLayout from './views/layouts/GuestLayout/GuestLayout';
import HomeLayout from './views/layouts/HomeLayout/HomeLayout';
import PublicLayout from './views/layouts/PublicLayout/PublicLayout';

// role = Guest
import LoginPage from './views/pages/LoginPage';
import ApiToken from './views/pages/User/ApiToken';
import ApiLog from './views/pages/User/ApiLog';

// App modules
import AppDashboard from './app/modules/dashboard/Dashboard';
import AppComplaintList from './app/modules/aduan/ComplaintList';
import AppComplaintDetail from './app/modules/aduan/ComplaintDetail';

// Common
import Profile from './views/pages/Global/Profile';
import AboutUs from './views/pages/Guest/AboutUs';
import SignIn from './views/pages/Guest/SignIn';
import Register from './views/pages/Guest/Register';
import ContactUs from './views/pages/Guest/ContactUs';
import SignOut from './views/pages/Guest/SignOut';
import Complaint from './views/pages/Guest/Complaint';
import PublicHomePage from './views/pages/Website/PublicHomePage';
import ComplaintStatus from './views/pages/Website/ComplaintStatus';



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
          <Route path="/semak-status" element={<ComplaintStatus />} />
        </Route>

        {/* User Layout */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/app/dashboard" element={<AppDashboard />} />
            <Route path="/app/complaints" element={<AppComplaintList />} />
            <Route path="/app/complaints/:id" element={<AppComplaintDetail />} />
            <Route path="/app/api-token" element={<ApiToken />} />
            <Route path="/app/api-logs" element={<ApiLog />} />
            <Route path="/app/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
