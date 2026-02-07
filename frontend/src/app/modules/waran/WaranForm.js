import React from 'react';

const WaranForm = () => (
    <div className="app-waran">
        <div className="app-waran-header">
            <div>
                <span className="app-eyebrow">i-WARAN</span>
                <h3>Borang Pendaftaran Waran</h3>
                <p>Rekod pendaftaran waran dan laporan perlaksanaan oleh pegawai.</p>
            </div>
        </div>

        <div className="app-waran-layout">
            <aside className="app-waran-summary">
                <div className="app-waran-summary-card">
                    <span className="app-eyebrow">Ringkasan</span>
                    <h4>Maklumat Waran</h4>
                    <p>Lengkapkan semua butiran wajib sebelum simpan.</p>
                    <div className="app-waran-summary-stack">
                        <div>
                            <span className="app-waran-label">Jenis Waran</span>
                            <strong>-</strong>
                        </div>
                        <div>
                            <span className="app-waran-label">No. Ruj Fail</span>
                            <strong>-</strong>
                        </div>
                        <div>
                            <span className="app-waran-label">Status Perlaksanaan</span>
                            <strong>-</strong>
                        </div>
                    </div>
                </div>
            </aside>

            <div className="app-waran-form">
                <section className="app-card app-waran-section">
                    <div className="app-section-header">
                        <h4>Diisi Oleh Pendaftar Waran</h4>
                    </div>

                    <div className="app-section-block">
                        <h5>Butiran Waran</h5>
                        <div className="app-form-grid">
                            <div className="app-form-field span-2">
                                <label>Jenis Waran *</label>
                                <div className="app-radio-row">
                                    <label className="app-radio-card">
                                        <input type="radio" name="jenis_waran" />
                                        Waran Tangkap
                                    </label>
                                    <label className="app-radio-card">
                                        <input type="radio" name="jenis_waran" />
                                        Waran Geledah
                                    </label>
                                </div>
                            </div>
                            <div className="app-form-field">
                                <label>No. Ruj Fail Waran</label>
                                <input type="text" placeholder="Contoh: 494" />
                            </div>
                            <div className="app-form-field">
                                <label>Tarikh / Masa Waran Diterima</label>
                                <input type="datetime-local" />
                            </div>
                            <div className="app-form-field">
                                <label>Tahun</label>
                                <input type="number" placeholder="2026" />
                            </div>
                        </div>
                    </div>

                    <div className="app-section-block">
                        <h5>Butiran Mahkamah</h5>
                        <div className="app-form-grid">
                            <div className="app-form-field">
                                <label>Nombor Kes</label>
                                <input type="text" placeholder="Contoh: 2505-L0510-651-0418" />
                            </div>
                            <div className="app-form-field">
                                <label>Jenis Kesalahan (Mal)</label>
                                <select>
                                    <option value="">Pilih kesalahan</option>
                                </select>
                            </div>
                            <div className="app-form-field">
                                <label>Jenis Kesalahan (Jenayah)</label>
                                <select>
                                    <option value="">Pilih kesalahan</option>
                                </select>
                            </div>
                            <div className="app-form-field">
                                <label>Mahkamah *</label>
                                <select>
                                    <option value="">Pilih mahkamah</option>
                                </select>
                            </div>
                            <div className="app-form-field span-2">
                                <label>Daerah *</label>
                                <div className="app-radio-row">
                                    {['Petaling', 'Klang', 'Hulu Langat', 'Gombak', 'Hulu Selangor', 'Kuala Selangor', 'Kuala Langat', 'Sepang', 'Sabak Bernam']
                                        .map((name) => (
                                            <label key={name} className="app-radio-card is-compact">
                                                <input type="radio" name="daerah" />
                                                {name}
                                            </label>
                                        ))}
                                </div>
                            </div>
                            <div className="app-form-field">
                                <label>Email</label>
                                <input type="email" placeholder="nama@domain.gov.my" />
                            </div>
                            <div className="app-form-field">
                                <label>Email Mahkamah</label>
                                <input type="email" placeholder="mahkamah@domain.gov.my" />
                            </div>
                            <div className="app-form-field">
                                <label>Tarikh Perbicaraan *</label>
                                <input type="date" />
                            </div>
                            <div className="app-form-field">
                                <label>Muat Naik Waran</label>
                                <input type="file" />
                            </div>
                        </div>
                    </div>

                    <div className="app-section-block">
                        <h5>Butiran Penama</h5>
                        <div className="app-form-grid">
                            <div className="app-form-field span-2">
                                <label>Nama OKT *</label>
                                <input type="text" placeholder="Nama penuh" />
                            </div>
                            <div className="app-form-field">
                                <label>Kad Pengenalan / Passport</label>
                                <input type="text" placeholder="950117055451" />
                            </div>
                            <div className="app-form-field">
                                <label>No. Telefon</label>
                                <input type="text" placeholder="01X-XXXXXXX" />
                            </div>
                            <div className="app-form-field span-2">
                                <label>Alamat</label>
                                <textarea rows="3" placeholder="Alamat penuh"></textarea>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="app-card app-waran-section">
                    <div className="app-section-header">
                        <h4>Diisi Oleh Pelaksana Waran</h4>
                    </div>

                    <div className="app-section-block">
                        <h5>Laporan Perlaksanaan</h5>
                        <div className="app-form-grid">
                            <div className="app-form-field">
                                <label>Tindakan Oleh *</label>
                                <select>
                                    <option value="">Pilih pegawai</option>
                                </select>
                            </div>
                            <div className="app-form-field span-2">
                                <label>Alamat Pejabat</label>
                                <textarea rows="2" placeholder="Alamat pejabat"></textarea>
                            </div>
                            <div className="app-form-field span-2">
                                <label>Status *</label>
                                <div className="app-radio-row">
                                    {['Berjaya', 'Tidak Berjaya', 'Dalam Proses', 'Kembalian'].map((name) => (
                                        <label key={name} className="app-radio-card">
                                            <input type="radio" name="status_perlaksanaan" />
                                            {name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="app-form-field span-2">
                                <label>Jumlah Perlaksanaan</label>
                                <div className="app-radio-row">
                                    {['1 Kali', '2 Kali', '3 Kali'].map((name) => (
                                        <label key={name} className="app-radio-card">
                                            <input type="radio" name="jumlah_perlaksanaan" />
                                            {name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <div className="app-form-field">
                                <label>Tarikh / Masa Perlaksanaan (Pertama)</label>
                                <input type="datetime-local" />
                            </div>
                            <div className="app-form-field">
                                <label>Tarikh / Masa Perlaksanaan (Kedua)</label>
                                <input type="datetime-local" />
                            </div>
                            <div className="app-form-field">
                                <label>Tarikh / Masa Perlaksanaan (Ketiga)</label>
                                <input type="datetime-local" />
                            </div>
                        </div>
                    </div>

                    <div className="app-section-block">
                        <h5>Hasil Perlaksanaan</h5>
                        <div className="app-radio-grid">
                            {[
                                'Alamat di luar bidangkuasa',
                                'Alamat tidak ditemui (Tanah Lot)',
                                'Alamat tidak lengkap',
                                'Alamat tidak wujud',
                                'Butiran OKT bercanggah dengan butiran sebenar yang diperolehi',
                                'Ditahan',
                                'OKT sakit, tidak dapat dibawa',
                                'OKT telah berhenti kerja',
                                'OKT telah berpindah',
                                'OKT telah meninggal dunia',
                                'OKT telah tamat pengajian',
                                'OKT tiada di alamat, salinan waran telah ditinggalkan / diserah kepada penghuni / waris yang ada',
                                'OKT tiada di alamat, tetapi dapat bercakap dengan OKT melalui telefon dan memaklumkan akan hadir sepertimana ketetapan',
                                'OKT tiada rekod di dalam syarikat',
                                'OKT tidak menerima sebarang notis / saman kehadiran',
                                'OKT tidak tinggal / bertugas di alamat',
                                'Pemantauan telah dilakukan beberapa kali, OKT menetap di alamat tersebut, tetapi gagal ditemui',
                                'Premis telah ditutup dan tidak beroperasi lagi',
                                'Rumah kosong / ditinggalkan',
                                'Waran berulang (pernah dilaksanakan sebelum ini dan gagal)',
                                'Waran diterima setelah tarikh bicara',
                                'Waran suntuk untuk dilaksanakan (masa terlalu pendek)',
                            ].map((name) => (
                                <label key={name} className="app-radio-card is-compact">
                                    <input type="radio" name="hasil_perlaksanaan" />
                                    {name}
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="app-section-block">
                        <h5>Laporan</h5>
                        <div className="app-form-grid">
                            <div className="app-form-field span-2">
                                <label>Laporan Tahap 1</label>
                                <textarea rows="5" placeholder="Catatan tahap 1"></textarea>
                            </div>
                            <div className="app-form-field span-2">
                                <label>Laporan Tahap 2</label>
                                <textarea rows="5" placeholder="Catatan tahap 2"></textarea>
                            </div>
                        </div>
                    </div>

                    <div className="app-form-actions">
                        <button type="button" className="app-button app-button-ghost">Batal</button>
                        <button type="button" className="app-button">Simpan Waran</button>
                    </div>
                </section>
            </div>
        </div>
    </div>
);

export default WaranForm;
