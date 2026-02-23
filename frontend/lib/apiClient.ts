import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_PATH } from '../config/api.config';
import { getAccessToken, refreshAuthTokens } from '../services/authSessionService';

const HEADER_REQUEST_ID = 'X-Request-ID';

const generateRequestID = (): string => {
    const now = Date.now().toString(36);
    const random = Math.random().toString(36).slice(2, 10);
    return `${now}-${random}`;
};

const hasHeader = (headers: Record<string, any>, key: string): boolean => {
    const target = key.toLowerCase();
    return Object.keys(headers).some((name) => name.toLowerCase() === target);
};

const getHeaderKey = (headers: Record<string, any>, key: string): string | null => {
    const target = key.toLowerCase();
    for (const name of Object.keys(headers)) {
        if (name.toLowerCase() === target) {
            return name;
        }
    }
    return null;
};

const isRefreshRequest = (url?: string): boolean => {
    if (!url) return false;
    return url.includes('/auth/refresh');
};

const apiClient = axios.create({
    baseURL: API_PATH,
    timeout: 15_000,
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const headers = { ...(config.headers || {}) } as Record<string, any>;

    if (!hasHeader(headers, HEADER_REQUEST_ID)) {
        headers[HEADER_REQUEST_ID] = generateRequestID();
    }

    const authHeaderKey = getHeaderKey(headers, 'Authorization');
    const hasAuthorization = authHeaderKey !== null && String(headers[authHeaderKey] || '').trim() !== '';

    if (!hasAuthorization) {
        const token = await getAccessToken();
        if (token) {
            headers.Authorization = `Bearer ${token}`;
        }
    }

    config.headers = headers as any;
    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const status = error?.response?.status;
        const originalConfig = (error?.config || {}) as AxiosRequestConfig & {
            __isRetryRequest?: boolean;
            __skipAuthRetry?: boolean;
        };

        if (
            status !== 401 ||
            originalConfig.__skipAuthRetry ||
            originalConfig.__isRetryRequest ||
            isRefreshRequest(originalConfig.url)
        ) {
            throw error;
        }

        originalConfig.__isRetryRequest = true;

        if (!refreshPromise) {
            refreshPromise = refreshAuthTokens()
                .then((tokens) => tokens?.accessToken || null)
                .finally(() => {
                    refreshPromise = null;
                });
        }

        const newAccessToken = await refreshPromise;
        if (!newAccessToken) {
            throw error;
        }

        const nextHeaders = { ...(originalConfig.headers || {}) } as Record<string, any>;
        const authHeaderKey = getHeaderKey(nextHeaders, 'Authorization');
        if (authHeaderKey && authHeaderKey !== 'Authorization') {
            delete nextHeaders[authHeaderKey];
        }
        nextHeaders.Authorization = `Bearer ${newAccessToken}`;
        originalConfig.headers = nextHeaders;

        return apiClient.request(originalConfig);
    },
);

export default apiClient;
