import axios from 'axios';

// Функция для определения baseURL
const getBaseURL = (): string => {
    // Если переменная окружения установлена, используем её
    if (process.env.NEXT_PUBLIC_API_URL) {
        return process.env.NEXT_PUBLIC_API_URL;
    }
    
    // Если мы в браузере, определяем URL на основе текущего домена
    if (typeof window !== 'undefined') {
        const hostname = window.location.hostname;
        // Если это продакшн домен, используем API домен
        if (hostname === 'vedamatch.ru' || hostname === 'www.vedamatch.ru') {
            return 'https://api.vedamatch.ru/api';
        }
        // Для локальной разработки
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'http://localhost:8081/api';
        }
        // Для других случаев (например, staging) можно использовать тот же домен
        return `https://api.${hostname}/api`;
    }
    
    // Fallback для SSR
    return 'http://localhost:8081/api';
};

const api = axios.create({
    baseURL: getBaseURL(),
});

// Add a request interceptor to add the auth headers if needed
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const adminData = localStorage.getItem('admin_data');
        if (adminData) {
            const parsed = JSON.parse(adminData);
            // For now we just send the user id in a header since we don't have JWT yet
            // But we will use this to identify the admin
            config.headers['X-Admin-ID'] = parsed.id;
        }
    }
    return config;
});

export default api;
