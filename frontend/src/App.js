import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import ProtectedRoute from './libs/ProtectedRoute';

import GuestLayout from './views/layouts/GuestLayout/GuestLayout';
import HomeLayout from './views/layouts/HomeLayout/HomeLayout';
import UserLayout from './views/layouts/UserLayout/UserLayout';
import AdminLayout from './views/layouts/AdminLayout/AdminLayout';

//import HomePage from './views/pages/HomePage';
import LoginPage from './views/pages/LoginPage';
import DashboardPage from './views/pages/User/DashboardPage';
//import AdminPage from './views/pages/Admin/AdminPage';

// User
import UserHomePage from './views/pages/User/Home';
import ApiToken from './views/pages/User/ApiToken';
import ApiLog from './views/pages/User/ApiLog';

// Admin
import AdminHomePage from './views/pages/Admin/Home';
import UserManagement from './views/pages/Admin/Users';
// import BannerManagement from './views/pages/Admin/Banners';
// import DeejayManagement from './views/pages/Admin/Deejays';
// import TopicManagement from './views/pages/Admin/Topics';
// import ChoiceManagement from './views/pages/Admin/Choices';
// import FooterManagement from './views/pages/Admin/Footer';
// import ChatroomManagement from './views/pages/Admin/Chatrooms';
// import ModuleManagement from './views/pages/Admin/Modules';
// import LivestreamManagement from './views/pages/Admin/Livestream';
// import RestreamManagement from './views/pages/Admin/Restream';

// Profile
import Profile from './views/pages/Global/Profile';


// import Home from './views/pages/Home/Home';
// import Module from './views/pages/Home/Module';
// import ContentPage from './views/pages/Content/content';
// import FooterPage from './views/pages/Content/footer';


import AboutUs from './views/pages/Guest/AboutUs';
import SignIn from './views/pages/Guest/SignIn';
import Register from './views/pages/Guest/Register';
import ContactUs from './views/pages/Guest/ContactUs';
import SignOut from './views/pages/Guest/SignOut';


import './App.css';
import HomePage from './views/pages/HomePage';


function App() {
  return (
    <Router>
      <Routes>
        
        {/* Home Layout */ }
        {/* <Route element={<HomeLayout />}>
          <Route path="/" element={<HomePage/>} />
          <Route path="/contents/:id" element={<ContentPage />} />
          <Route path="/footers/:id" element={<FooterPage />} />

        </Route> */}
        
        {/* Guest Layout */}
        <Route element={<GuestLayout />}>
          <Route path="/" element={<HomePage/>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/logout" element={<LoginPage />} />
          <Route path="/about-us" element={<AboutUs />} />
          <Route path="/contact-us" element={<ContactUs />} />
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
            {/* <Route path="/admin/banners" element={<BannerManagement />} />
            <Route path="/admin/deejays" element={<DeejayManagement />} />
            <Route path="/admin/topics" element={<TopicManagement />} />
            <Route path="/admin/topics/:topicId/choices" element={<ChoiceManagement />} />
            <Route path="/admin/profile" element={<Profile />} />
            <Route path="/admin/footer" element={<FooterManagement />} />
            <Route path="/admin/chatrooms" element={<ChatroomManagement />} />
            <Route path="/admin/modules" element={<ModuleManagement />} />
            <Route path="/admin/livestream" element={<LivestreamManagement />} />
            <Route path="/admin/restream" element={<RestreamManagement />} /> */}
          </Route>
        </Route>

      </Routes>
    </Router>
  );
}

export default App;
