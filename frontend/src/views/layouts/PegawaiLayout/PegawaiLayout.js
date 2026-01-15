import { Outlet } from 'react-router-dom';
import SideBar from './SideBar';

const PegawaiLayout = () => {
  return (
    <div className="pegawai-shell">
      <aside className="pegawai-sidebar">
        <SideBar />
      </aside>
      <div className="pegawai-main">
        <header className="pegawai-topbar">
          <div>
            <div className="pegawai-eyebrow">JAIS AI</div>
            <h2 className="pegawai-title">Dashboard Pegawai</h2>
          </div>
          <div className="pegawai-user">
            <span className="pegawai-user-icon"><i className="bi bi-person-circle"></i></span>
            <div>
              <div className="pegawai-user-name">Pegawai</div>
              <div className="pegawai-user-role">Unit Aduan</div>
            </div>
          </div>
        </header>
        <main className="pegawai-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PegawaiLayout;
