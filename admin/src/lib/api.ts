import axios from 'axios';
import { clearAuthData } from './auth';
import { resolveApiBaseUrlForHostname } from './vedamatch-hosts';

const normalizeApiBaseURL = (rawBaseURL: string): string => {
    const trimmedBaseURL = rawBaseURL.trim().replace(/\/+$/, '');
    if (!trimmedBaseURL) {
        return trimmedBaseURL;
    }

    if (trimmedBaseURL.endsWith('/api') || trimmedBaseURL.includes('/api/')) {
        return trimmedBaseURL;
    }

    return `${trimmedBaseURL}/api`;
};

// Функция для определения baseURL
export const getApiBaseURL = (): string => {
    // Если переменная окружения установлена, используем её
    if (process.env.NEXT_PUBLIC_API_URL) {
        return normalizeApiBaseURL(process.env.NEXT_PUBLIC_API_URL);
    }

    // Если мы в браузере, определяем URL на основе текущего домена
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Для локальной разработки
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8081/api';
        }
        return resolveApiBaseUrlForHostname(hostname);
    }

    // Fallback для SSR
    return 'http://localhost:8081/api';
};

const api = axios.create({
    baseURL: getApiBaseURL(),
});

// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const adminData = localStorage.getItem('admin_data');
        if (adminData) {
            const parsed = JSON.parse(adminData);
            // GORM returns ID with capital letters, so check both
            const adminId = parsed.ID || parsed.id;
            if (adminId) {
                config.headers['X-Admin-ID'] = adminId;
            }
            if (parsed.token) {
                config.headers['Authorization'] = `Bearer ${parsed.token}`;
            }
        }
    }
    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (typeof window !== 'undefined' && error?.response?.status === 401) {
            clearAuthData();
            const pathname = window.location.pathname;
            const authRoutes = new Set(['/login', '/admin-login', '/register']);
            if (!authRoutes.has(pathname)) {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    },
);

export default api;
