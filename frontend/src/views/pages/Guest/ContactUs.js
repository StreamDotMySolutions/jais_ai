import React from "react";
import { Link } from "react-router-dom";

const contactItems = [
  {
    icon: "bi-geo-alt",
    title: "Alamat",
    lines: [
      "Bilik Gerakan (Hotline 24 Jam)",
      "Aras Bawah, Menara Utara, Bangunan Sultan Idris Shah",
      "No. 2 Persiaran Masjid Bukit SUK Seksyen 5",
      "40000 Shah Alam, Selangor Darul Ehsan",
    ],
  },
  {
    icon: "bi-telephone",
    title: "Telefon",
    lines: ["03 - 5514 3671", "03 - 5514 3777"],
  },
  {
    icon: "bi-envelope",
    title: "Emel",
    lines: ["enforcement.bpn@jais.gov.my", "inkuiri.gerakan@gmail.com"],
  },
];

const ContactUs = () => {
  return (
    <div className="py-5 contact-page">
      <div className="container">
        <div className="contact-hero">
          <div>
            <span className="contact-kicker">Hubungi Kami</span>
            <h2 className="fw-bold mb-2">Bahagian Pengurusan Penguatkuasaan, JAIS</h2>
            <p className="mb-0">
              Saluran rasmi untuk pertanyaan, aduan dan maklumat lanjut berkaitan penguatkuasaan
              syariah di negeri Selangor.
            </p>
          </div>
          <div className="contact-hero-panel">
            <span>Hotline 24 Jam</span>
            <strong>1 800 88 2424</strong>
          </div>
        </div>

        <div className="contact-banner">
          <div>
            <span className="contact-banner-label">Waktu Operasi</span>
            <strong>24 jam, setiap hari</strong>
          </div>
          <div>
            <span className="contact-banner-label">WhatsApp</span>
            <strong>60 12-275 3454</strong>
          </div>
          <div>
            <span className="contact-banner-label">Aduan Online</span>
            <strong>i-SYAEMS</strong>
          </div>
        </div>

        <div className="contact-layout">
          <div className="contact-main">
            <div className="contact-grid">
              {contactItems.map((item) => (
                <div key={item.title} className="contact-card">
                  <div className="contact-card-icon">
                    <i className={`bi ${item.icon}`}></i>
                  </div>
                  <div className="contact-card-body">
                    <h4>{item.title}</h4>
                    {item.lines.map((line) => (
                      <p key={line} className="mb-1">{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <aside className="contact-side">
            <div className="contact-side-card">
              <div className="contact-hotline-highlight">
                <span>Hotline 24 Jam</span>
                <strong>1 800 88 2424</strong>
                <p className="mb-0">Saluran utama untuk panggilan segera dan pertanyaan aduan.</p>
              </div>

              <div className="contact-note">
                <div className="contact-note-title">Aduan Online</div>
                <p className="mb-3">
                  Anda boleh membuat aduan berkaitan kesalahan syariah secara dalam talian melalui
                  sistem i-SYAEMS tanpa perlu hadir ke pejabat.
                </p>
                <Link to="/complaint" className="public-cta w-100 d-inline-flex justify-content-center">
                  Buat Aduan Sekarang
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ContactUs;
