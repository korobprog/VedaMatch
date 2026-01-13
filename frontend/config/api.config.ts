import Config from 'react-native-config';

// Значение по умолчанию для локальной разработки
const DEFAULT_URL = 'http://127.0.0.1:8081';

let rawUrl;
try {
    rawUrl = Config.API_BASE_URL;
} catch (e) {
    rawUrl = undefined;
}
export const API_BASE_URL = (rawUrl && rawUrl !== 'undefined' && rawUrl !== 'null') ? rawUrl : DEFAULT_URL;

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


