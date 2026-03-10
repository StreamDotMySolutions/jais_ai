import React from "react";
import { Link } from "react-router-dom";
import jaisLogo from "../../../assets/logo_bpn_jais.png";
import PublicHeader from "../../components/PublicHeader";
import PublicFooter from "../../components/PublicFooter";

export default function PublicHomePage() {
  return (
    <div className="public-layout">
      <PublicHeader />

      {/* --- KANDUNGAN UTAMA (Main Content) --- */}
      <main className="flex-grow-1">
        {/* HERO SECTION */}
        <section className="py-5 public-hero">
          <div className="container">
            <div className="row align-items-center g-4">
              <div className="col-md-6">
                <h1 className="fw-bold mb-3 display-4">
                Syariah Management Enforcement System (i-SYAEMS)

                  <br />
                  Selangor Islamic Religious Department
                </h1>
                <p className="text-muted">
                  Saluran rasmi untuk orang awam membuat aduan berkaitan hal ehwal Islam
                  secara selamat, teratur dan telus.
                </p>
                <div className="d-flex gap-3 mt-4">
                  <Link to="/complaint" className="public-cta">
                    Buat Aduan
                  </Link>
                  <Link to="/sign-in" className="public-cta-outline">
                    Login Pengguna
                  </Link>
                </div>
              </div>
              <div className="col-md-6 text-center">
                <img
                  src={jaisLogo}
                  alt="Logo JAIS"
                  className="img-fluid"
                  style={{ maxWidth: "360px" }}
                />
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="py-5">
          <div className="container">
            <div className="row text-center g-4">
              <div className="col-md-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold">Aduan Tanpa Login</h5>
                    <p className="text-muted small">
                      Orang awam boleh membuat aduan tanpa perlu akaun pengguna.
                    </p>
                  </div>
                </div>
              </div>
              <div className="col-md-4">
                <Link to="/semak-status" className="text-decoration-none text-reset">
                  <div className="card h-100 shadow-sm">
                    <div className="card-body">
                      <h5 className="fw-bold">Semak Status Aduan</h5>
                      <p className="text-muted small">
                        Jejak status aduan secara telus dan masa nyata.
                      </p>
                    </div>
                  </div>
                </Link>
              </div>
              <div className="col-md-4">
                <div className="card h-100 shadow-sm">
                  <div className="card-body">
                    <h5 className="fw-bold">Pengurusan JAIS</h5>
                    <p className="text-muted small">
                      Aduan diurus sepenuhnya oleh pegawai JAIS secara sistematik.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
