import React from "react";
import { Link } from "react-router-dom";


export default function PublicHomePage() {
  return (
  
    <div className="d-flex flex-column min-vh-100 bg-light text-dark">

      {/* --- HEADER/NAVBAR --- */}
      <header className="bg-success text-white shadow sticky-top">
        <div className="container-fluid d-flex justify-content-between align-items-center p-3">
          <div className="fw-bold fs-5">UDPS AI · Aduan JAIS</div>
          <nav className="d-flex gap-3 small fw-medium">
            {/* Menggunakan Link untuk navigasi */}
            <Link to="/" className="btn btn-link text-white text-decoration-none">Home</Link>
            <Link to="/complaint" className="btn btn-link text-white text-decoration-none">Buat Aduan</Link>
            {/* Pautan Semak Status belum ada dalam Route anda, ini contoh sahaja */}
            <Link to="/semak-status" className="btn btn-link text-white text-decoration-none">Semak Status</Link>
            <Link to="/sign-in" className="btn btn-light text-success px-3 py-1 rounded">Login</Link>
          </nav>
        </div>
      </header>


      {/* --- KANDUNGAN UTAMA (Main Content) --- */}
      {/* flex-grow-1 memastikan kandungan memenuhi ruang di tengah */}
      <main className="flex-grow-1">
        
        {/* ✅ HERO SECTION (Bootstrap 5 Classes) */}
        <section className="py-5 bg-white">
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-md-6">
                <h1 className="fw-bold mb-3 display-4">Sistem Aduan Rasmi<br />Jabatan Agama Islam Selangor</h1>
                <p className="text-muted">Saluran rasmi untuk orang awam membuat aduan berkaitan hal ehwal Islam secara selamat, teratur dan telus.</p>
                <div className="d-flex gap-3 mt-4">
                  <Link to="/complaint" className="btn btn-success btn-lg">Buat Aduan</Link>
                  <Link to="/sign-in" className="btn btn-outline-success btn-lg">Login Pengguna</Link>
                </div>
              </div>
              <div className="col-md-6 text-center">
                <img src="cdn-icons-png.flaticon.com" alt="Aduan JAIS" className="img-fluid" style={{ maxWidth: "320px" }}/>
              </div>
            </div>
          </div>
        </section>

        {/* ✅ FEATURES (Bootstrap 5 Classes) */}
        <section className="py-5">
          <div className="container">
            <div className="row text-center g-4">
              <div className="col-md-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold">Aduan Tanpa Login</h5>
                    <p className="text-muted small">Orang awam boleh membuat aduan tanpa perlu akaun pengguna.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold">Semak Status Aduan</h5>
                    <p className="text-muted small">Jejak status aduan secara telus dan masa nyata.</p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold">Pengurusan JAIS</h5>
                    <p className="text-muted small">Aduan diurus sepenuhnya oleh pegawai JAIS secara sistematik.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* --- FOOTER --- */}
      <footer className="bg-success text-white py-4 mt-auto">
        <div className="container d-flex justify-content-between px-3 small">
          <div>© 2025 UDPS AI - Sistem Aduan JAIS</div>
          <div>Polisi Privasi · Terma</div>
        </div>
      </footer>

    </div>
    
  );
}
