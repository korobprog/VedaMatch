import Config from 'react-native-config';
import { Platform } from 'react-native';

const PROD_API_URL = 'https://api.vedamatch.ru';

// Значение по умолчанию для запуска на устройствах
const DEFAULT_URL = Platform.select({
    android: 'http://10.0.2.2:8000', // Use 10.0.2.2 for Android emulator
    ios: PROD_API_URL,
    default: PROD_API_URL
}) as string;

let rawUrl;
try {
    rawUrl = Config.API_BASE_URL;
} catch (e) {
    rawUrl = undefined;
}

const sanitizeApiBaseUrl = (url: string): string => {
    if (Platform.OS === 'ios' && /127\.0\.0\.1|localhost/i.test(url)) {
        return PROD_API_URL;
    }
    return url;
};

const configuredUrl = (rawUrl && rawUrl !== 'undefined' && rawUrl !== 'null') ? rawUrl : DEFAULT_URL;
export const API_BASE_URL = sanitizeApiBaseUrl(configuredUrl);

// Базовый путь для API запросов
export const API_PATH = `${API_BASE_URL}/api`;
export const WS_PATH = API_PATH.replace('http', 'ws');

let appEnv;
try {
    appEnv = Config.APP_ENV;
} catch (e) {
    appEnv = 'development';
}
export const APP_ENV = appEnv || 'development';
