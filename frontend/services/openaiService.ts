import OpenAI from 'openai';
let Config: any;
try {
  Config = require('react-native-config').default;
} catch (e) {
  console.error('Failed to load react-native-config:', e);
  Config = {};
}
import { getModelConfig, ModelConfig } from '../config/models.config';

// Base URL для RVFreeLLM API
// OpenAI SDK требует явного указания /v1 в baseURL, если он переопределен
// API_BASE_URL указывает на корень вебхука
const API_BASE_URL = 'https://rvlautoai.ru/webhook';
// #region agent log
console.log('DEBUG: API_BASE_URL configured:', API_BASE_URL);
// #endregion

// Получаем API ключ из переменных окружения через react-native-config
// #region agent log
console.log('DEBUG openaiService: Config loaded:', typeof Config !== 'undefined', 'API_KEY:', Config?.API_OPEN_AI?.substring(0, 10) || 'undefined');
try {
  fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:12', message: 'Checking Config from react-native-config', data: { hasConfig: typeof Config !== 'undefined', configApiKey: Config?.API_OPEN_AI || 'undefined', configApiKeyLength: (Config?.API_OPEN_AI || '').length, allConfigKeys: typeof Config !== 'undefined' ? Object.keys(Config).filter(k => k.includes('API') || k.includes('OPEN')) : [] }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'A' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
} catch (e) {
  console.log('DEBUG: Logging error:', e);
}
// #endregion
const API_KEY = Config?.API_OPEN_AI || '';
// #region agent log
console.log('DEBUG openaiService: API_KEY initialized, length:', API_KEY.length);
try {
  fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:18', message: 'API_KEY initialized from Config', data: { apiKeyLength: API_KEY.length, apiKeyEmpty: API_KEY === '', apiKeyFirstChars: API_KEY.substring(0, 4), hasConfig: typeof Config !== 'undefined' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run3', hypothesisId: 'A' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
} catch (e) {
  console.log('DEBUG: Logging error:', e);
}
// #endregion

if (!API_KEY) {
  console.warn('⚠️ API_OPEN_AI не установлен. Проверьте файл .env и пересоберите приложение');
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:16', message: 'API_KEY is empty after Config', data: { configValue: Config?.API_OPEN_AI, reason: 'Config.API_OPEN_AI not available - need to rebuild app' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
}

// Инициализация OpenAI клиента с кастомным baseURL
const openaiClient = new OpenAI({
  apiKey: API_KEY,
  baseURL: `${API_BASE_URL}/v1`,
  timeout: 180000, // 3 минуты для сложных запросов
  maxRetries: 2,
});

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SendMessageOptions {
  model?: string;
  provider?: string;
  modelType?: 'text' | 'audio' | 'image';
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model?: string;
  provider?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Отправляет сообщение в RVFreeLLM API
 * @param messages Массив сообщений для контекста разговора
 * @param options Опции запроса (модель, провайдер, параметры)
 * @returns Ответ от API с текстом и метаданными
 */
export const sendMessage = async (
  messages: ChatMessage[],
  options: SendMessageOptions = {}
): Promise<ChatResponse> => {
  // #region agent log
  fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:57', message: 'sendMessage called with Config', data: { apiKeyExists: !!API_KEY, apiKeyLength: API_KEY.length, configApiKey: Config?.API_OPEN_AI || 'undefined', options }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
  // #endregion
  try {
    if (!API_KEY) {
      // #region agent log
      fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:60', message: 'API_KEY check failed after Config', data: { apiKeyValue: API_KEY, configValue: Config?.API_OPEN_AI, hasConfig: typeof Config !== 'undefined' }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run2', hypothesisId: 'A' }) }).catch(() => { });
      // #endregion
      throw new Error('API ключ не установлен. Проверьте файл .env и пересоберите приложение');
    }

    // Определяем модель и провайдер
    let model: string;
    let provider: string | undefined;

    if (options.model) {
      model = options.model;
      provider = options.provider;
    } else if (options.modelType) {
      const modelConfig = getModelConfig(options.modelType);
      model = modelConfig.model;
      provider = modelConfig.provider || options.provider;
    } else {
      // По умолчанию используем текстовую модель
      const defaultConfig = getModelConfig('text');
      model = defaultConfig.model;
      provider = defaultConfig.provider;
    }

    // Формируем тело запроса
    const requestBody: any = {
      model,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      })),
      temperature: options.temperature ?? 0.7,
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    }

    // Если указан провайдер, добавляем его в запрос
    // Согласно документации API, провайдер передается в теле запроса
    if (provider) {
      requestBody.provider = provider;
    }

    // Отправляем запрос
    // #region agent log
    console.log('DEBUG: Request URL base:', API_BASE_URL);
    console.log('DEBUG: Expected full URL:', `${API_BASE_URL}/v1/chat/completions`);
    console.log('DEBUG: Request body:', JSON.stringify(requestBody, null, 2));
    console.log('DEBUG: Provider:', provider);
    console.log('DEBUG: Model:', model);
    try {
      fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:140', message: 'Before API request', data: { baseUrl: API_BASE_URL, expectedUrl: `${API_BASE_URL}/v1/chat/completions`, requestBody: requestBody, provider: provider, model: model, apiKeyLength: API_KEY.length }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run5', hypothesisId: 'B' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
    } catch (e) {
      console.log('DEBUG: Logging error:', e);
    }
    // #endregion

    // 6. Логирование перед запросом
    console.log(`[API] Отправка запроса: Модель=${model}, Провайдер=${provider}`);

    // Попробуем использовать прямой fetch для проверки правильности URL
    // Если OpenAI SDK формирует неправильный URL, используем прямой запрос
    try {
      const response = await fetch(`${API_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log('DEBUG: Direct fetch error:', response.status, errorText);
        // #region agent log
        try {
          fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:160', message: 'Direct fetch failed', data: { status: response.status, statusText: response.statusText, errorText: errorText.substring(0, 200), url: `${API_BASE_URL}/v1/chat/completions` }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run5', hypothesisId: 'B' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
        } catch (e) {
          console.log('DEBUG: Logging error:', e);
        }
        // #endregion
        throw new Error(`Ошибка API (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      // #region agent log
      console.log('DEBUG: Direct fetch success');
      try {
        fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:170', message: 'Direct fetch success', data: { model: data.model }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run5', hypothesisId: 'B' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
      } catch (e) {
        console.log('DEBUG: Logging error:', e);
      }
      // #endregion

      const content = data.choices[0]?.message?.content || '';
      const responseModel = data.model;
      const usage = data.usage;
      const metadata = data._metadata;
      const finalProvider = metadata?.provider || provider;
      const finalModel = metadata?.original_model || responseModel;

      // 5. Мониторинг использования токенов (Log usage)
      if (usage) {
        console.log(`[API] Использовано токенов: ${usage.total_tokens}`);
        console.log(`[API] Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}`);
      }

      // Лог fallback информации
      if (metadata && metadata.fallback_attempts > 0) {
        console.warn(`[API] Внимание: Произошел Fallback!`);
        console.warn(`[API] Запрашивали: ${metadata.original_model} (${metadata.original_provider})`);
        console.warn(`[API] Ответил: ${responseModel} (${finalProvider})`);
        console.warn(`[API] Попыток: ${metadata.fallback_attempts}`);
      }

      return {
        content,
        model: finalModel,
        provider: finalProvider,
        usage: usage
          ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
          : undefined,
      };
    } catch (directFetchError: any) {
      // Если прямой fetch не сработал, пробуем через OpenAI SDK
      console.log('DEBUG: Direct fetch failed, trying OpenAI SDK:', directFetchError.message);
      const completion = await openaiClient.chat.completions.create(requestBody);
      // #region agent log
      console.log('DEBUG: API response received via SDK');
      try {
        fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:207', message: 'After API request success via SDK', data: { model: completion.model }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run5', hypothesisId: 'B' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
      } catch (e) {
        console.log('DEBUG: Logging error:', e);
      }
      // #endregion

      // Извлекаем ответ
      const content = completion.choices[0]?.message?.content || '';
      const responseModel = completion.model;
      const usage = completion.usage;

      // Проверяем метаданные fallback из ответа
      const metadata = (completion as any)._metadata;
      const finalProvider = metadata?.provider || provider;
      const finalModel = metadata?.original_model || responseModel;

      return {
        content,
        model: finalModel,
        provider: finalProvider,
        usage: usage
          ? {
            prompt_tokens: usage.prompt_tokens,
            completion_tokens: usage.completion_tokens,
            total_tokens: usage.total_tokens,
          }
          : undefined,
      };
    }
  } catch (error: any) {
    console.error('Ошибка при отправке сообщения в RVFreeLLM API:', error);
    // #region agent log
    console.log('DEBUG: Error details:', {
      errorType: error?.constructor?.name,
      status: error?.status,
      message: error?.message,
      url: error?.request?.url || error?.url,
      baseURL: API_BASE_URL,
    });
    try {
      fetch('http://127.0.0.1:7245/ingest/83b895de-46c0-4a18-802e-4e3a6af9118c', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ location: 'openaiService.ts:145', message: 'API request error', data: { errorType: error?.constructor?.name, status: error?.status, message: error?.message, url: error?.request?.url || error?.url, baseURL: API_BASE_URL }, timestamp: Date.now(), sessionId: 'debug-session', runId: 'run4', hypothesisId: 'B' }) }).catch((err) => console.log('DEBUG: Fetch error:', err));
    } catch (e) {
      console.log('DEBUG: Logging error:', e);
    }
    // #endregion

    // Обработка различных типов ошибок
    if (error instanceof OpenAI.APIError) {
      const status = error.status;
      const message = error.message;

      // Rate limit (429)
      if (status === 429) {
        const retryAfter = error.headers?.['retry-after'] || '60';
        throw new Error(
          `Превышен лимит запросов. Попробуйте через ${retryAfter} секунд. Лимит: 30 запросов в минуту.`
        );
      }

      // Service unavailable (503) - все модели недоступны
      if (status === 503) {
        throw new Error(
          'Все модели временно недоступны. API автоматически пробует другие модели. Попробуйте позже.'
        );
      }

      // Другие ошибки API
      throw new Error(`Ошибка API (${status}): ${message}`);
    }

    // Ошибка сети или таймаут
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      throw new Error('Превышено время ожидания ответа. Проверьте подключение к интернету.');
    }

    // Другие ошибки
    throw new Error(error.message || 'Неизвестная ошибка при отправке запроса');
  }
};

/**
 * Получает список доступных моделей
 * @param provider Опциональный провайдер для фильтрации
 * @returns Список доступных моделей
 */
export const getAvailableModels = async (provider?: string): Promise<any> => {
  try {
    const url = provider
      ? `${API_BASE_URL}/v1/models?provider=${provider}`
      : `${API_BASE_URL}/v1/models`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${Config.API_OPEN_AI || API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Ошибка получения моделей: ${response.status}`);
    }

    return await response.json();
  } catch (error: any) {
    console.error('Ошибка при получении списка моделей:', error);
    throw new Error(error.message || 'Не удалось получить список моделей');
  }
};

