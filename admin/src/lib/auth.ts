/**
 * Получение токена авторизации из localStorage
 * Поддерживает оба формата: прямой 'token' и объект 'admin_data'
 */
export function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;

    // Сначала проверяем прямой токен
    const directToken = localStorage.getItem('token');
    if (directToken) return directToken;

    // Затем проверяем admin_data
    const adminData = localStorage.getItem('admin_data');
    if (adminData) {
        try {
            const parsed = JSON.parse(adminData);
            return parsed.token || null;
        } catch {
            return null;
        }
    }

    return null;
}

/**
 * Получение заголовков авторизации для fetch
 */
export function getAuthHeaders(): HeadersInit {
    const token = getAuthToken();
    return token
        ? { 'Authorization': `Bearer ${token}` }
        : {};
}

/**
 * Проверка авторизации
 */
export function isAuthenticated(): boolean {
    return !!getAuthToken();
}
