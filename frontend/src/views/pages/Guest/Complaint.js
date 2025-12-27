import ComplaintForm from '../../../app/modules/aduan/ComplaintForm';

function Complaint() {
    return (
        <div className="complaint-shell">
            <div className="complaint-header">
                <div>
                    <span className="complaint-kicker">Aduan Awam</span>
                    <h1>Aduan Online</h1>
                    <p>Isikan maklumat dengan tepat untuk memudahkan tindakan segera.</p>
                </div>
                <div className="complaint-tip">
                    <i className="bi bi-shield-check"></i>
                    Semua maklumat disimpan dengan selamat dan hanya untuk tujuan siasatan.
                </div>
            </div>

            <ComplaintForm channelSource="web" />
        </div>
    );
}

export default Complaint;
