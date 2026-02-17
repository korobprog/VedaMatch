import AsyncStorage from '@react-native-async-storage/async-storage';
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import DeviceInfo from 'react-native-device-info';
import { API_PATH } from '../config/api.config';

export interface AuthTokens {
    accessToken: string;
    refreshToken?: string;
    accessTokenExpiresAt?: string;
    refreshTokenExpiresAt?: string;
    sessionId?: number;
}

const STORAGE_KEY_ACCESS_TOKEN = 'token';
const STORAGE_KEY_REFRESH_TOKEN = 'refreshToken';
const STORAGE_KEY_ACCESS_EXPIRES = 'accessTokenExpiresAt';
const STORAGE_KEY_REFRESH_EXPIRES = 'refreshTokenExpiresAt';
const STORAGE_KEY_SESSION_ID = 'sessionId';

let cachedTokens: AuthTokens | null = null;
let loadPromise: Promise<AuthTokens | null> | null = null;
let refreshPromise: Promise<AuthTokens | null> | null = null;
let axiosAuthInterceptorInitialized = false;

const API_BASE = API_PATH.replace(/\/+$/, '');

const toStringValue = (value: unknown): string => {
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    return '';
};

const toNumberValue = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseInt(value, 10);
        if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
    return undefined;
};

export const normalizeAuthTokens = (payload: any): AuthTokens | null => {
    if (!payload || typeof payload !== 'object') return null;

    const accessToken = toStringValue(payload.accessToken || payload.token);
    if (!accessToken) return null;

    const refreshToken = toStringValue(payload.refreshToken);
    const accessTokenExpiresAt = toStringValue(payload.accessTokenExpiresAt);
    const refreshTokenExpiresAt = toStringValue(payload.refreshTokenExpiresAt);
    const sessionId = toNumberValue(payload.sessionId);

    return {
        accessToken,
        refreshToken: refreshToken || undefined,
        accessTokenExpiresAt: accessTokenExpiresAt || undefined,
        refreshTokenExpiresAt: refreshTokenExpiresAt || undefined,
        sessionId,
    };
};

const readStoredTokens = async (): Promise<AuthTokens | null> => {
    const values = await AsyncStorage.multiGet([
        STORAGE_KEY_ACCESS_TOKEN,
        STORAGE_KEY_REFRESH_TOKEN,
        STORAGE_KEY_ACCESS_EXPIRES,
        STORAGE_KEY_REFRESH_EXPIRES,
        STORAGE_KEY_SESSION_ID,
    ]);

    const map = new Map(values);
    const accessToken = toStringValue(map.get(STORAGE_KEY_ACCESS_TOKEN));
    if (!accessToken || accessToken === 'undefined' || accessToken === 'null') {
        return null;
    }

    const refreshToken = toStringValue(map.get(STORAGE_KEY_REFRESH_TOKEN));
    const accessTokenExpiresAt = toStringValue(map.get(STORAGE_KEY_ACCESS_EXPIRES));
    const refreshTokenExpiresAt = toStringValue(map.get(STORAGE_KEY_REFRESH_EXPIRES));
    const sessionId = toNumberValue(map.get(STORAGE_KEY_SESSION_ID));

    return {
        accessToken,
        refreshToken: refreshToken || undefined,
        accessTokenExpiresAt: accessTokenExpiresAt || undefined,
        refreshTokenExpiresAt: refreshTokenExpiresAt || undefined,
        sessionId,
    };
};

export const getAuthTokens = async (): Promise<AuthTokens | null> => {
    if (cachedTokens) {
        return cachedTokens;
    }
    if (!loadPromise) {
        loadPromise = readStoredTokens()
            .then(tokens => {
                cachedTokens = tokens;
                return tokens;
            })
            .finally(() => {
                loadPromise = null;
            });
    }
    return loadPromise;
};

export const getAccessToken = async (): Promise<string | null> => {
    const tokens = await getAuthTokens();
    return tokens?.accessToken || null;
};

export const saveAuthTokens = async (payload: any): Promise<AuthTokens | null> => {
    const tokens = normalizeAuthTokens(payload);
    if (!tokens) return null;

    cachedTokens = tokens;

    const setPairs: [string, string][] = [[STORAGE_KEY_ACCESS_TOKEN, tokens.accessToken]];
    if (tokens.refreshToken) {
        setPairs.push([STORAGE_KEY_REFRESH_TOKEN, tokens.refreshToken]);
    }
    if (tokens.accessTokenExpiresAt) {
        setPairs.push([STORAGE_KEY_ACCESS_EXPIRES, tokens.accessTokenExpiresAt]);
    }
    if (tokens.refreshTokenExpiresAt) {
        setPairs.push([STORAGE_KEY_REFRESH_EXPIRES, tokens.refreshTokenExpiresAt]);
    }
    if (tokens.sessionId) {
        setPairs.push([STORAGE_KEY_SESSION_ID, String(tokens.sessionId)]);
    }

    await AsyncStorage.multiSet(setPairs);

    const removeKeys: string[] = [];
    if (!tokens.refreshToken) removeKeys.push(STORAGE_KEY_REFRESH_TOKEN);
    if (!tokens.accessTokenExpiresAt) removeKeys.push(STORAGE_KEY_ACCESS_EXPIRES);
    if (!tokens.refreshTokenExpiresAt) removeKeys.push(STORAGE_KEY_REFRESH_EXPIRES);
    if (!tokens.sessionId) removeKeys.push(STORAGE_KEY_SESSION_ID);
    if (removeKeys.length > 0) {
        await AsyncStorage.multiRemove(removeKeys);
    }

    return tokens;
};

export const clearAuthTokens = async () => {
    cachedTokens = null;
    await AsyncStorage.multiRemove([
        STORAGE_KEY_ACCESS_TOKEN,
        STORAGE_KEY_REFRESH_TOKEN,
        STORAGE_KEY_ACCESS_EXPIRES,
        STORAGE_KEY_REFRESH_EXPIRES,
        STORAGE_KEY_SESSION_ID,
    ]);
};

export const logoutAuthSession = async (): Promise<void> => {
    const current = await getAuthTokens();
    if (!current?.sessionId && !current?.refreshToken) {
        return;
    }

    try {
        await fetch(`${API_PATH}/auth/logout`, {
            method: 'POST',
            headers: mergeHeaders(
                { 'Content-Type': 'application/json' },
                current?.accessToken || null,
            ),
            body: JSON.stringify({
                sessionId: current?.sessionId,
                refreshToken: current?.refreshToken,
            }),
        });
    } catch {
        // Logout should remain best-effort; local cleanup still continues.
    }
};

const refreshAuthTokensInternal = async (): Promise<AuthTokens | null> => {
    const current = await getAuthTokens();
    if (!current?.refreshToken) {
        return null;
    }

    let deviceId = '';
    try {
        deviceId = await DeviceInfo.getUniqueId();
    } catch {
        deviceId = '';
    }

    const response = await fetch(`${API_PATH}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            refreshToken: current.refreshToken,
            sessionId: current.sessionId,
            deviceId,
        }),
    });

    if (!response.ok) {
        await clearAuthTokens();
        return null;
    }

    const data = await response.json();
    return saveAuthTokens(data);
};

export const refreshAuthTokens = async (): Promise<AuthTokens | null> => {
    if (!refreshPromise) {
        refreshPromise = refreshAuthTokensInternal().finally(() => {
            refreshPromise = null;
        });
    }
    return refreshPromise;
};

const mergeHeaders = (headers: HeadersInit | undefined, accessToken: string | null) => {
    const merged = new Headers(headers || {});
    if (accessToken) {
        merged.set('Authorization', `Bearer ${accessToken}`);
    } else {
        merged.delete('Authorization');
    }
    return merged;
};

const isApiRequest = (url?: string): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (url.startsWith(API_BASE)) return true;
    if (url.startsWith(API_PATH)) return true;
    if (url.startsWith('/api/')) return true;
    return false;
};

const mergeAxiosAuthHeader = (headers: any, accessToken: string | null) => {
    const nextHeaders = { ...(headers || {}) };
    if (accessToken) {
        nextHeaders.Authorization = `Bearer ${accessToken}`;
    } else {
        delete nextHeaders.Authorization;
    }
    return nextHeaders;
};

export const setupAxiosAuthInterceptor = () => {
    if (axiosAuthInterceptorInitialized) return;
    axiosAuthInterceptorInitialized = true;

    axios.interceptors.request.use(async (config: any) => {
        if (config?.__skipAuthSession || !isApiRequest(config?.url)) {
            return config;
        }

        const hasAuthorization = typeof config?.headers?.Authorization === 'string' && config.headers.Authorization.trim() !== '';
        if (hasAuthorization) {
            return config;
        }

        const token = await getAccessToken();
        config.headers = mergeAxiosAuthHeader(config?.headers, token);
        return config;
    });

    axios.interceptors.response.use(
        (response) => response,
        async (error: any) => {
            const status = error?.response?.status;
            const originalConfig: any = error?.config || {};

            if (
                status !== 401 ||
                originalConfig?.__skipAuthSession ||
                originalConfig?.__isRetryRequest ||
                !isApiRequest(originalConfig?.url)
            ) {
                throw error;
            }

            originalConfig.__isRetryRequest = true;
            const refreshed = await refreshAuthTokens();
            if (!refreshed?.accessToken) {
                throw error;
            }

            originalConfig.headers = mergeAxiosAuthHeader(originalConfig?.headers, refreshed.accessToken);
            return axios.request(originalConfig);
        },
    );
};

export const authorizedFetch = async (
    input: RequestInfo | URL,
    init: RequestInit = {},
    options: { retry401?: boolean; skipAuth?: boolean } = {},
): Promise<Response> => {
    const { retry401 = true, skipAuth = false } = options;

    const token = skipAuth ? null : await getAccessToken();
    const firstResponse = await fetch(input, {
        ...init,
        headers: mergeHeaders(init.headers, token),
    });

    if (firstResponse.status !== 401 || !retry401 || skipAuth) {
        return firstResponse;
    }

    const refreshed = await refreshAuthTokens();
    if (!refreshed?.accessToken) {
        return firstResponse;
    }

    return fetch(input, {
        ...init,
        headers: mergeHeaders(init.headers, refreshed.accessToken),
    });
};

export const authorizedAxiosRequest = async <T = any>(
    config: AxiosRequestConfig,
    options: { retry401?: boolean; skipAuth?: boolean } = {},
): Promise<AxiosResponse<T>> => {
    const { retry401 = true, skipAuth = false } = options;
    const token = skipAuth ? null : await getAccessToken();

    const firstConfig: AxiosRequestConfig = {
        ...config,
        // This helper manages refresh/retry itself.
        ...({ __skipAuthSession: true } as any),
        headers: {
            ...(config.headers || {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
    };

    try {
        return await axios.request<T>(firstConfig);
    } catch (error: any) {
        const status = error?.response?.status;
        if (!retry401 || skipAuth || status !== 401) {
            throw error;
        }

        const refreshed = await refreshAuthTokens();
        if (!refreshed?.accessToken) {
            throw error;
        }

        const retryConfig: AxiosRequestConfig = {
            ...config,
            ...({ __skipAuthSession: true } as any),
            headers: {
                ...(config.headers || {}),
                Authorization: `Bearer ${refreshed.accessToken}`,
            },
        };
        return axios.request<T>(retryConfig);
    }
};

setupAxiosAuthInterceptor();
