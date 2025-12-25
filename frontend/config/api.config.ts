import { Platform } from 'react-native';
import Config from 'react-native-config';

// Значение по умолчанию для локальной разработки
const DEFAULT_URL = Platform.OS === 'android' ? 'http://10.0.2.2:8081' : 'http://localhost:8081';

// Приоритет: 1. .env (Config)  2. Значение по умолчанию
export const API_BASE_URL = Config.API_BASE_URL || DEFAULT_URL;

// Базовый путь для API запросов
export const API_PATH = `${API_BASE_URL}/api`;
export const WS_PATH = API_PATH.replace('http', 'ws');

export const APP_ENV = Config.APP_ENV || 'development';

console.log('DEBUG: API Configuration initialized:', {
    API_BASE_URL,
    API_PATH,
    APP_ENV,
    Platform: Platform.OS,
    fromConfig: !!Config.API_BASE_URL
});
