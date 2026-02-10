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
            return 'Dalam Tindakan';
        case 'kiv':
            return 'KIV';
        case 'selesai':
            return 'Laporan Tindakan Selesai';
        default:
            // Fallback: show raw stage code
            return s;
    }
};

