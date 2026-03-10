import React from "react";

const AboutUs = () => {
  return (
    <div className="py-5">
      <div className="container">
        <h2 className="fw-bold mb-4">Mengenai Kami</h2>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h4 className="fw-bold">Jabatan Agama Islam Selangor (JAIS)</h4>
            <p>
              Jabatan Agama Islam Selangor (JAIS) merupakan sebuah jabatan kerajaan negeri
              di bawah pentadbiran Kerajaan Negeri Selangor yang bertanggungjawab dalam
              mengurus dan mentadbir hal ehwal agama Islam di negeri Selangor Darul Ehsan.
            </p>
            <p>
              JAIS ditubuhkan bagi memastikan kesucian agama Islam terpelihara serta
              umat Islam di Selangor mendapat bimbingan dan perkhidmatan yang terbaik
              dalam aspek keagamaan.
            </p>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h4 className="fw-bold">Bahagian Penguatkuasaan</h4>
            <p>
              Bahagian Penguatkuasaan JAIS bertanggungjawab dalam menguatkuasakan
              undang-undang syariah di negeri Selangor. Fungsi utama bahagian ini termasuk:
            </p>
            <ul>
              <li>Menerima dan menyiasat aduan berkaitan kesalahan syariah</li>
              <li>Menjalankan operasi penguatkuasaan mengikut Enakmen Jenayah Syariah (Selangor) 1995</li>
              <li>Menjalankan siasatan dan menyediakan kertas siasatan untuk pendakwaan</li>
              <li>Melaksanakan waran tangkap dan waran geledah yang dikeluarkan oleh Mahkamah Syariah</li>
              <li>Memantau dan mengawal aktiviti yang bertentangan dengan hukum syarak</li>
            </ul>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <h4 className="fw-bold">Sistem i-SYAEMS</h4>
            <p>
              Syariah Management Enforcement System (i-SYAEMS) adalah sistem pengurusan
              penguatkuasaan syariah bersepadu yang dibangunkan untuk memudahkan proses
              pengurusan aduan, siasatan, waran, dan pendakwaan secara digital.
            </p>
            <p>
              Melalui sistem ini, orang awam boleh membuat aduan secara dalam talian
              dan menyemak status aduan mereka dengan mudah dan telus.
            </p>
          </div>
        </div>

        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold">Visi</h5>
                <p className="mb-0">
                  Menjadi institusi penguatkuasaan syariah yang profesional, berintegriti
                  dan berkesan dalam memelihara kesucian agama Islam di Selangor.
                </p>
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="fw-bold">Misi</h5>
                <p className="mb-0">
                  Menguatkuasakan undang-undang syariah secara adil, telus dan cekap
                  demi menjaga maruah agama Islam serta kebajikan umat Islam di Selangor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
