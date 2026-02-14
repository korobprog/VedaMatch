import Config from 'react-native-config';
import { Platform } from 'react-native';

// Значение по умолчанию для локальной разработки
const DEFAULT_URL = Platform.select({
    android: 'http://10.0.2.2:8000', // Use 10.0.2.2 for Android emulator
    ios: 'http://127.0.0.1:8000',
    default: 'http://127.0.0.1:8000'
}) as string;

let rawUrl;
try {
    rawUrl = Config.API_BASE_URL;
} catch (e) {
    rawUrl = undefined;
}
export const API_BASE_URL = (rawUrl && rawUrl !== 'undefined' && rawUrl !== 'null') ? rawUrl : DEFAULT_URL;

// Базовый путь для API запросов
export const API_PATH = `${API_BASE_URL}/api`;
console.log('📡 [API Config] API_PATH:', API_PATH);
export const WS_PATH = API_PATH.replace('http', 'ws');

let appEnv;
try {
    appEnv = Config.APP_ENV;
} catch (e) {
    appEnv = 'development';
}
export const APP_ENV = appEnv || 'development';


