export const getComplaintStageLabel = (stage, viewerRole = '') => {
    const s = (stage || '').toString().trim();
    const role = (viewerRole || '').toString().trim().toLowerCase();
    if (!s) return '';

    switch (s) {
        case 'baru':
            return 'Baru';
        case 'tunggu_pengesahan':
            return 'Menunggu Pengesahan';
        case 'menunggu_tindakan_pi':
            return 'Disahkan';
        case 'disahkan':
            return 'Disahkan';
        case 'dihantar_ke_daerah':
            if (role === 'pegawai_daerah') {
                return 'KES BARU';
            }
            return 'Dihantar ke Daerah';
        case 'dalam_tindakan':
            return 'Tindakan Aduan';
        case 'kiv':
            return 'KIV';
        case 'laporan_tindakan':
            return 'Laporan Tindakan Selesai';
        case 'selesai':
            return 'Laporan Tindakan Selesai';
        default:
            // Fallback: show raw stage code
            return s;
    }
};

export const getPublicComplaintStageLabel = (stage, complaint = {}) => {
    const s = (stage || '').toString().trim();
    const createdAt = complaint?.created_at ? String(complaint.created_at) : '';
    const updatedAt = complaint?.updated_at ? String(complaint.updated_at) : '';
    const hasReceiver = Boolean(
        complaint?.received_at
        || complaint?.received_by?.name
        || complaint?.received_by_user_id
    );
    const hasBeenUpdated = Boolean(updatedAt && createdAt && updatedAt !== createdAt);

    if (['selesai', 'laporan_tindakan'].includes(s)) {
        return 'Selesai';
    }

    if (['menunggu_tindakan_pi', 'disahkan', 'dihantar_ke_daerah', 'kiv'].includes(s)) {
        return 'Aduan Dalam Tindakan';
    }

    if (s === 'dalam_tindakan') {
        return 'Aduan Diterima';
    }

    if (s === 'tunggu_pengesahan') {
        return 'Aduan Diterima';
    }

    if (s === 'baru') {
        return (hasReceiver || hasBeenUpdated) ? 'Aduan Diterima' : 'Baru';
    }

    return (hasReceiver || hasBeenUpdated) ? 'Aduan Diterima' : (s || '-');
};
