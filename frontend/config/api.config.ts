import Config from 'react-native-config';

// Значение по умолчанию для локальной разработки
const DEFAULT_URL = 'http://127.0.0.1:8081';

// Приоритет: 1. .env (Config)  2. Значение по умолчанию
export const API_BASE_URL = Config.API_BASE_URL || DEFAULT_URL;

// Базовый путь для API запросов
export const API_PATH = `${API_BASE_URL}/api`;
export const WS_PATH = API_PATH.replace('http', 'ws');

export const APP_ENV = Config.APP_ENV || 'development';


