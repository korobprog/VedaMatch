import { clearPortalAuthData } from '@/lib/shared-session';

/**
 * Получение токена авторизации из localStorage.
 * Поддерживает оба формата: прямой `token` и объект `admin_data`.
 */
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    const directToken = localStorage.getItem('token');
    if (directToken && directToken !== 'undefined' && directToken !== 'null') {
        return directToken;
    }

    const adminData = localStorage.getItem('admin_data');
    if (adminData) {
        try {
            const parsed = JSON.parse(adminData);
            const token = parsed.token;
            if (token && token !== 'undefined' && token !== 'null') {
                return token;
            }
            return null;
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Получение заголовков авторизации для fetch.
 */
export function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Проверка авторизации.
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}

/**
 * Полный logout портала с очисткой общего shared-session cookie.
 */
export function clearAuthData(): void {
    clearPortalAuthData();
}
