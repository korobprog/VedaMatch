import axios, { AxiosError, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { API_PATH } from '../config/api.config';
import { getAccessToken, refreshAuthTokens } from '../services/authSessionService';
import { reportNetworkFailure } from '../context/networkStatusRuntime';

const HEADER_REQUEST_ID = 'X-Request-ID';
const API_BASE = API_PATH.replace(/\/+$/, '');

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

const isAbsoluteHTTPUrl = (url: string): boolean => /^https?:\/\//i.test(url);

const isApiRequest = (url?: string, baseURL?: string): boolean => {
    if (!url || typeof url !== 'string') return false;

    if (url.startsWith(API_BASE) || url.startsWith(API_PATH) || url.startsWith('/api/')) {
        return true;
    }

    if (isAbsoluteHTTPUrl(url)) {
        return url.startsWith(API_BASE);
    }

    if (baseURL && typeof baseURL === 'string' && isAbsoluteHTTPUrl(baseURL)) {
        const normalizedBase = baseURL.replace(/\/+$/, '');
        return normalizedBase.startsWith(API_BASE);
    }

    return true;
};

const apiClient = axios.create({
    baseURL: API_PATH,
    timeout: 15_000,
});

let refreshPromise: Promise<string | null> | null = null;

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const requestConfig = config as InternalAxiosRequestConfig & {
        __skipAuthSession?: boolean;
    };
    const headers = { ...(config.headers || {}) } as Record<string, any>;

    if (!hasHeader(headers, HEADER_REQUEST_ID)) {
        headers[HEADER_REQUEST_ID] = generateRequestID();
    }

    if (requestConfig.__skipAuthSession || !isApiRequest(requestConfig.url, requestConfig.baseURL)) {
        config.headers = headers as any;
        return config;
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
            __skipAuthSession?: boolean;
        };
        const message = String(error?.message || '').toLowerCase();
        const isTimeout = error.code === 'ECONNABORTED' || message.includes('timeout') || message.includes('aborted');
        const isNetworkFailure = !error.response && (
            message.includes('network error')
            || message.includes('network request failed')
            || message.includes('load failed')
            || isTimeout
        );

        if (isApiRequest(originalConfig.url, originalConfig.baseURL) && isNetworkFailure) {
            reportNetworkFailure(isTimeout ? 'timeout' : 'network');
        }

        if (
            status !== 401 ||
            originalConfig.__skipAuthSession ||
            originalConfig.__skipAuthRetry ||
            originalConfig.__isRetryRequest ||
            !isApiRequest(originalConfig.url, originalConfig.baseURL) ||
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
