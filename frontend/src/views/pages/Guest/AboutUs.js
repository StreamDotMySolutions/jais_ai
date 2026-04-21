import React from "react";

const sections = [
  { id: "pengenalan", label: "Pengenalan" },
  { id: "visi-misi", label: "Visi & Misi" },
  { id: "objektif", label: "Objektif" },
  { id: "fungsi-utama", label: "Fungsi Utama" },
  { id: "objektif-kualiti", label: "Objektif Kualiti" },
  { id: "fungsi-dalaman", label: "Fungsi Dalaman" },
  // { id: "aduan-online", label: "Aduan Online" },
  // { id: "semak-status", label: "Semak Status" },
];

const AboutUs = () => {
  return (
    <div className="py-5 about-page">
      <div className="container">
        <div className="about-hero">
          <div>
            <span className="about-kicker">Mengenai Kami</span>
            <h2 className="fw-bold mb-2">Bahagian Pengurusan Penguatkuasaan, JAIS</h2>
            <p className="mb-0">
              Ringkasan rasmi tentang fungsi bahagian, sistem i-SYAEMS dan aliran aduan online
              JAIS dalam satu paparan yang lebih padat.
            </p>
          </div>
          <div className="about-hero-badge">
            <span>i-SYAEMS</span>
            <strong>Selangor</strong>
          </div>
        </div>

        <div className="about-layout">
          <aside className="about-nav">
            <div className="about-nav-card">
              <div className="about-nav-title">Pautan Pantas</div>
              <div className="about-nav-links">
                {sections.map((section) => (
                  <a key={section.id} href={`#${section.id}`} className="about-nav-link">
                    {section.label}
                  </a>
                ))}
              </div>
            </div>
          </aside>

          <div className="about-content">
            <details className="about-section" id="pengenalan" open>
              <summary>
                <span>PENDAHULUAN</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <p>
                  Bahagian Pengurusan Penguatkuasaan,Jabatan Agama Islam Selangor adalah salah satu
                  daripada lapan (8) bahagian yang diwujudkan bagi menjalankan dan menggerakkan
                  aktiviti serta fungsi pengoperasian di Jabatan Agama Islam Selangor. Bahagian ini
                  ditugaskan sebagai sayap yang memastikan tugas-tugas mencegah kemungkaran dan
                  penguatkuasaan undang-undang dilaksanakan dengan penuh integriti, professional dan
                  efisien.
                </p>
                <p>
                  Syariah Management Enforcement System (i-SYAEMS) adalah sebuah sistem
                  pengurusan penguatkuasaan syariah bersepadu yang dibangunkan untuk memudahkan
                  proses pengurusan aduan, siasatan, waran, dan tindakan penguatkuasaan secara
                  digital. Melalui sistem ini, orang awam boleh membuat aduan secara online dan
                  menyemak status aduan mereka dengan mudah dan telus.
                </p>
                <p>
                  Sehingga kini, Bahagian Pengurusan Penguatkuasaan, Jabatan Agama Islam Selangor
                  dianggotai seramai 122 orang penjawatan yang diberi kuasa lantikan sebagai Pegawai
                  Penguatkuasa Agama (PPA) oleh Majlis Agama Islam Selangor (MAIS) di seluruh negeri
                  Selangor dan diketuai oleh seorang Ketua Penolong Pengarah. Bahagian ini juga
                  bertanggungjawab menguruskan hal ehwal pentadbiran, kakitangan, maklumat aduan,
                  risikan dan siasatan serta kelengkapan keperluan logistik bahagian seluruh negeri
                  Selangor yang beroperasi di Ibu pejabat JAIS di Tingkat 4, Menara Utara Bangunan Sultan
                  Idris Shah, No.2 Persiaran Masjid Bukit SUK Seksyen 5, 40000 Shah Alam, Selangor.
                </p>
                <p className="mb-0">
                  Bahagian Pengurusan Penguatkuasaan, Jabatan Agama Islam Selangor ini mempunyai
                  lapan (8) cawangan yang ditempatkan di setiap lapan (8) daerah di seluruh negeri
                  Selangor bagi melaksanakan dasar-dasar dan prinsip-prinsip yang sama dalam
                  melaksanakan tugas. Bahagian ini juga telah mewujudkan Bilik Gerakan (Hotline 24 Jam)
                  yang telah menetapkan sistem pengoperasiannya secara berjadual syif yang bertujuan
                  mengendalikan sistem penerimaan maklumat aduan sehenti (one stop centre) di
                  peringkat negeri Selangor. Bilik Gerakan yang berfungsi 24 jam dengan menggunakan
                  Talian Hotline 1800 88 2424 sebagai medium utama yang boleh dihubungi oleh orang
                  awam bagi menyampaikan maklumat kejadian kes-kes jenayah Syariah di negeri ini.
                </p>
              </div>
            </details>

            <details className="about-section" id="visi-misi" open>
              <summary>
                <span>VISI & MISI</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <div className="about-subsection">
                  <h4 className="fw-bold">VISI</h4>
                  <p className="mb-0">
                    KE ARAH PEMBENTUKAN NARATIF, KOGNITIF DAN KARAKTERISTIK UMMAH MELALUI
                    PENGUATKUASAAN UNDANG-UNDANG SYARIAH
                  </p>
                </div>
                <div className="about-subsection">
                  <h4 className="fw-bold">MISI</h4>
                  <p className="mb-0">
                    MEMPERKASAKAN PENGURUSAN SUMBER DAN MEMPERKUKUHKAN KOMPETENSI
                    BAHAGIAN BAGI MENGUATKUASAKAN UNDANG-UNDANG SYARIAH.
                  </p>
                </div>
              </div>
            </details>

            <details className="about-section" id="objektif" open>
              <summary>
                <span>OBJEKTIF</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <p className="mb-0">
                  MENGUATKUASAKAN UNDANG-UNDANG SYARIAH DENGAN TEGAS, BERHIKMAH DAN BERINTEGRITI.
                </p>
              </div>
            </details>

            <details className="about-section" id="fungsi-utama" open>
              <summary>
                <span>FUNGSI UTAMA BAHAGIAN</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <ol className="mb-0">
                  <li>Menguatkuasakan undang-undang mengenai hal ehwal Islam.</li>
                  <li>Membantu hal ehwal pentadbiran dan perjalanan sistem keadilan Syariah Islam.</li>
                  <li>Melaksanakan program pencegahan Syariah.</li>
                </ol>
              </div>
            </details>

            <details className="about-section" id="objektif-kualiti">
              <summary>
                <span>OBJEKTIF KUALITI</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <ol className="mb-0">
                  <li>
                    Pegawai Inkuiri (PI) memberi maklumat berstatus For Necessary Action (FNA) bagi
                    kes jenayah Syariah kepada Pegawai Penguatkuasaan Agama (PPA) dalam tempoh
                    tidak melebihi 6 jam untuk di ambil tindakan.
                  </li>
                  <li>
                    PPA hendaklah melaksanakan tindakan penguatkuasaan dalam tempoh tidak
                    melebihi 24 jam daripada maklumat berstatus For Necessary Action (FNA) diterima.
                  </li>
                  <li>
                    Bahagian menghantar kertas siasatan ke Jabatan Pendakwaan Syariah Selangor
                    (JPSS) oleh Unit Daftar dan Dekri dalam tempoh lima (5) hari setelah kertas
                    siasatan disemak dan disyorkan oleh Ketua Penolong Pengarah, Bahagian
                    Pengurusan Penguatkuasaan (KPP BPN).
                  </li>
                  <li>
                    Pegawai Penyiasat melengkapkan kertas siasatan dalam tempoh 40 hari bekerja
                    selepas pegawai penyiasat menerima arahan tentang suatu fail siasatan perlu
                    dibuka. Bagi kes tertentu yang perlu lanjutan tempoh siasatan, hendaklah
                    mendapatkan arahan melalui minit pada kertas siasatan daripada ketua unit atau
                    ketua seksyen.
                  </li>
                  <li>
                    Pegawai Penyiasat hendaklah melengkapkan semula kertas yang dikembalikan
                    dalam tempoh tidak melebihi 30 hari bekerja selepas arahan diterima. Bagi kes
                    tertentu yang perlu lanjutan tempoh siasatan, hendaklah mendapatkan arahan
                    melalui minit pada kertas siasatan daripada ketua unit atau ketua seksyen.
                  </li>
                  <li>
                    PPA hendaklah mengambil tindakan awalan terhadap maklumat berstatus Out
                    Procedure (OP) dalam tempoh tidak melebihi 10 hari bekerja setelah mendapat
                    arahan dari Ketua Penolong Pengarah, Bahagian Pengurusan Penguatkuasaan (KPP
                    BPN).
                  </li>
                  <li>
                    PPA melaporkan maklumat berstatus Out of Procedure (OP) yang telah diambil
                    tindakan dalam tempoh 30 hari kepada Ketua Unit atau Ketua Seksyen.
                  </li>
                </ol>
              </div>
            </details>

            <details className="about-section" id="fungsi-dalaman">
              <summary>
                <span>FUNGSI DALAMAN BAHAGIAN</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <ol className="mb-0">
                  <li>
                    Unit Pentadbiran
                    <div className="mt-2">
                      Mengurus pengurusan pentadbiran bahagian merangkumi pemfailan, surat menyurat,
                      perkhidmatan kakitangan (kehadiran, cuti dan latihan), aset, kenderaan,
                      kewangan dan perolehan.
                    </div>
                  </li>
                  <li className="mt-3">
                    Unit Pengurusan dan Kesalahan
                    <div className="mt-2">
                      Mengurus pelaksanaan risikan dan siasatan, penyediaan kertas siasatan serta
                      tindakan penguatkuasaan berkaitan isu-isu perundangan yang berhubung dengan
                      kesalahan akidah, kesucian agama Islam dan institusinya, kesalahan kesusilaan
                      serta kesalahan matrimoni.
                    </div>
                  </li>
                  <li className="mt-3">
                    Unit Gerakan
                    <div className="mt-2">
                      Mengurus penerimaan dan tindakan terhadap maklumat suatu kesalahan, penjagaan
                      orang kena tuduh (OKT) dan pesalah di Mahkamah serta pelaksanaan tindakan
                      pencegahan.
                    </div>
                  </li>
                  <li className="mt-3">
                    Unit Daftar dan Dekri
                    <div className="mt-2">
                      Mengurus rekod data kertas siasatan, penyedian statistik jenayah syariah,
                      pengurusan eksibit, pengurusan waran tangkap dan penyeliaan sistem e-Jinayat.
                    </div>
                  </li>
                </ol>
                <p className="mt-3 mb-0">
                  *(rujuk panduan di portal JAIS Bahagian Pengurusan Penguatkuasaan - Portal Rasmi
                  Jabatan Agama Islam Selangor)
                </p>
              </div>
            </details>

            {/* <details className="about-section" id="aduan-online">
              <summary>
                <span>ADUAN ONLINE</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <ul className="mb-0">
                  <li>Butiran Pemberi Maklumat (Pengadu)</li>
                  <li>
                    Jenis Aduan
                    <ul>
                      <li>Aduan Jenayah (berhubung kesalahan Aqidah &amp; Kesusilaan)</li>
                      <li>Aduan Keluarga (berhubung kesalahan poligami, nikah, cerai &amp; rujuk)</li>
                    </ul>
                  </li>
                </ul>
                <p className="mt-3 mb-1">Boleh buat nota kecil:</p>
                <div className="about-callout">
                  Butiran Pengadu adalah RAHSIA dan SULIT. Ia hanya bertujuan untuk rekod di Bahagian
                  ini dan tidak akan didedahkan kepada sesiapa)
                </div>
                <p className="mb-1">Sebelum submit tekan hantar aduan</p>
                <p className="mb-1">Perakuan Pemberi Maklumat</p>
                <div className="about-callout">
                  Dengan ini, saya bertanggungjawab atas aduan yang diberikan dan mengesahkan bahawa
                  segala butiran maklumat yang diberikan adalah BENAR. Saya bersetuju untuk menghantar
                  aduan ini kepada JAIS untuk tindakan lanjut.
                </div>
                <p className="mb-1">Selepas submit aduan</p>
                <div className="about-callout">
                  Maklumat aduan anda telah didaftarkan dan diterima masuk ke dalam sistem kami.
                  Pihak kami akan menghubungi anda bagi mengesahkan maklumat aduan yang disalurkan.
                  Terima kasih!
                </div>
                <p className="mb-0">No. Daftar Aduan anda : ***** (SALIN)</p>
              </div>
            </details>

            <details className="about-section" id="semak-status">
              <summary>
                <span>SEMAK STATUS ADUAN</span>
                <i className="bi bi-chevron-down"></i>
              </summary>
              <div className="about-section-body">
                <p className="mb-0">
                  Mohon tambah satu lagi item semakan melalui No. Kad Pengenalan Pemberi Maklumat sebab
                  kadang2 pengadu ni tak terlepas pandang dan tak save pon no daftar aduan yang telah dibuat.
                </p>
              </div>
            </details> */}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
