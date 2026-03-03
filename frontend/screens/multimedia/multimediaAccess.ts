export interface MultimediaAccessUser {
    ID?: number | null;
    role?: string | null;
    godModeEnabled?: boolean | null;
    currentPlan?: string | null;
    madh?: string | null;
}

export interface MultimediaAccessScope {
    isProViewer: boolean;
    isAuthenticated: boolean;
    userMadh?: string;
}

export const MULTIMEDIA_MADH_OPTIONS = [
    { id: 'iskcon', label: 'ISKCON' },
    { id: 'gaudiya', label: 'Gaudiya' },
    { id: 'srivaishnava', label: 'Sri Vaishnava' },
    { id: 'vedic', label: 'Vedic' },
] as const;

export const normalizeMadhKey = (value?: string | null): string | undefined => {
    if (typeof value !== 'string') return undefined;
    const normalized = value.trim().toLowerCase();
    return normalized.length > 0 ? normalized : undefined;
};

export const isMultimediaProViewer = (user?: MultimediaAccessUser | null): boolean => {
    if (!user) return false;
    const role = String(user.role || '').trim().toLowerCase();
    const plan = String(user.currentPlan || '').trim().toLowerCase();
    return Boolean(user.godModeEnabled)
        || role === 'admin'
        || role === 'superadmin'
        || plan === 'admin'
        || plan.includes('pro');
};

export const resolveMultimediaAccessScope = (user?: MultimediaAccessUser | null): MultimediaAccessScope => {
    const isAuthenticated = Boolean(user?.ID);
    const isProViewer = isMultimediaProViewer(user);
    const userMadh = normalizeMadhKey(user?.madh);
    return { isAuthenticated, isProViewer, userMadh };
};
