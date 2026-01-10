import { API_BASE_URL } from '../config/api.config';

export const getMediaUrl = (path: string | null | undefined): string | null => {
    if (!path) return null;

    // Check if it's already a full URL (S3) or local file
    if (path.startsWith('http') || path.startsWith('file://')) {
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

    // Fallback: return path as-is (might be a CDN URL or other format)
    return path;
};
