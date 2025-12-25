import axios from 'axios';

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api',
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
