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
import ComplaintPrintBorang5 from './app/modules/aduan/ComplaintPrintBorang5';
import ComplaintPrintLaporanTindakan from './app/modules/aduan/ComplaintPrintLaporanTindakan';
import ComplaintPrintTindakanAduan from './app/modules/aduan/ComplaintPrintTindakanAduan';
import AppointmentCalendar from './app/modules/appointments/AppointmentCalendar';
import StaffList from './app/modules/staff/StaffList';
import RoleList from './app/modules/roles/RoleList';
import MenuList from './app/modules/menus/MenuList';
import UserList from './app/modules/users/UserList';
import ArahanBeredar from './app/modules/beredar/ArahanBeredar';
import ArahanBeredarList from './app/modules/beredar/ArahanBeredarList';
import ArahanBeredarDetail from './app/modules/beredar/ArahanBeredarDetail';

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
          <Route path="/app/complaints/:id/print/borang-5" element={<ComplaintPrintBorang5 />} />
          <Route path="/app/complaints/:id/print/tindakan-aduan" element={<ComplaintPrintTindakanAduan />} />
          <Route path="/app/complaints/:id/print/laporan-tindakan" element={<ComplaintPrintLaporanTindakan />} />
          <Route path="/app/appointments/popup" element={<AppointmentCalendar isPopup />} />
          <Route element={<AppLayout />}>
            <Route path="/app/dashboard" element={<AppDashboard />} />
            <Route path="/app/appointments" element={<AppointmentCalendar />} />
            <Route
              path="/app/complaints"
              element={<AppComplaintList />}
            />
            <Route
              path="/app/complaints/aj"
              element={<AppComplaintList caseType="AJ" title="Senarai Aduan Jenayah" description="Senarai aduan kategori jenayah (AJ)." />}
            />
            <Route
              path="/app/complaints/ak"
              element={<AppComplaintList caseType="AK" title="Senarai Aduan Keluarga" description="Senarai aduan kategori keluarga (AK)." />}
            />
            <Route
              path="/app/complaints/pending-approval"
              element={<AppComplaintList title="Aduan Untuk Disahkan" description="Senarai aduan yang menunggu pengesahan anda." fetchEndpoint="/complaints/pending-approval" />}
            />
            <Route
              path="/app/complaints/pickup-queue"
              element={<AppComplaintList title="Aduan Untuk Diambil" description="Senarai aduan yang menunggu PIC ambil." fetchEndpoint="/complaints/pickup-queue" enablePickup />}
            />
            <Route
              path="/app/complaints/my-pic"
              element={<AppComplaintList title="Aduan Saya (PIC)" description="Senarai aduan yang telah anda ambil." fetchEndpoint="/complaints/my-pic" />}
            />
            <Route path="/app/complaints/:id" element={<AppComplaintDetail />} />
            <Route path="/app/staff" element={<StaffList />} />
            <Route path="/app/roles" element={<RoleList />} />
            <Route path="/app/users" element={<UserList />} />
            <Route path="/app/menus" element={<MenuList />} />
            <Route path="/app/api-token" element={<ApiToken />} />
            <Route path="/app/api-logs" element={<ApiLog />} />
            <Route path="/app/arahan-beredar" element={<ArahanBeredarList />} />
            <Route path="/app/arahan-beredar/new" element={<ArahanBeredar />} />
            <Route path="/app/arahan-beredar/:id" element={<ArahanBeredarDetail />} />
            <Route path="/app/arahan-beredar/:id/edit" element={<ArahanBeredar mode="edit" />} />
            <Route path="/app/profile" element={<Profile />} />
          </Route>
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
