import { API_BASE_URL } from '../config/api.config';

export const getMediaUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;

    // Check if it's already a full URL (S3)
    if (path.startsWith('http')) {
        return path;
    }

    // Check if it's a local path
    if (path.startsWith('/')) {
        return `${API_BASE_URL}${path}`;
    }

    // Check if it's a relative local path
    if (path.startsWith('./') || path.startsWith('uploads/')) {
        const cleanPath = path.startsWith('./') ? path.substring(2) : path;
        return `${API_BASE_URL}/${cleanPath}`;
    }

    return null;
};
