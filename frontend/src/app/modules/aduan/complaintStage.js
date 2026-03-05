export const getComplaintStageLabel = (stage) => {
    const s = (stage || '').toString().trim();
    if (!s) return '';

    switch (s) {
        case 'baru':
            return 'Baru';
        case 'tunggu_pengesahan':
            return 'Menunggu Pengesahan';
        case 'disahkan':
            return 'Disahkan';
        case 'dalam_tindakan':
            return 'Tindakan Aduan';
        case 'kiv':
            return 'KIV';
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

    if (s === 'selesai') {
        return 'Selesai';
    }

    if (['disahkan', 'kiv'].includes(s)) {
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
