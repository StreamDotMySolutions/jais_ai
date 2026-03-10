import React from "react";

const ContactUs = () => {
  return (
    <div className="py-5">
      <div className="container">
        <h2 className="fw-bold mb-4">Hubungi Kami</h2>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h4 className="fw-bold mb-3">Jabatan Agama Islam Selangor (JAIS)</h4>
                <p className="mb-1">
                  <strong>Bahagian Penguatkuasaan</strong>
                </p>

                <hr />

                <p className="mb-2">
                  <i className="bi bi-geo-alt me-2"></i>
                  Jabatan Agama Islam Selangor,<br />
                  Tingkat 9 &amp; 10, Menara Utara,<br />
                  Bangunan Sultan Idris Shah,<br />
                  40000 Shah Alam,<br />
                  Selangor Darul Ehsan.
                </p>

                <p className="mb-2">
                  <i className="bi bi-telephone me-2"></i>
                  03-5514 3300
                </p>

                <p className="mb-2">
                  <i className="bi bi-printer me-2"></i>
                  03-5514 3399
                </p>

                <p className="mb-2">
                  <i className="bi bi-envelope me-2"></i>
                  webmaster@jais.gov.my
                </p>

                <p className="mb-0">
                  <i className="bi bi-globe me-2"></i>
                  www.jais.gov.my
                </p>
              </div>
            </div>
          </div>

          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold mb-3">Waktu Operasi</h5>
                <table className="table table-borderless mb-4">
                  <tbody>
                    <tr>
                      <td>Ahad - Khamis</td>
                      <td>8:00 pagi - 5:00 petang</td>
                    </tr>
                    <tr>
                      <td>Jumaat - Sabtu</td>
                      <td>Cuti</td>
                    </tr>
                  </tbody>
                </table>

                <h5 className="fw-bold mb-3">Aduan Online</h5>
                <p>
                  Anda boleh membuat aduan berkaitan kesalahan syariah secara dalam talian
                  melalui sistem i-SYAEMS tanpa perlu hadir ke pejabat.
                </p>
                <a href="/complaint" className="btn btn-primary">
                  Buat Aduan Sekarang
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
