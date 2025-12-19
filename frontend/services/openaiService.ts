import OpenAI from 'openai';
import { Platform } from 'react-native';
let Config: any;
try {
  Config = require('react-native-config').default;
} catch (e) {
  console.error('Failed to load react-native-config:', e);
  Config = {};
}
import { getModelConfig, ModelConfig } from '../config/models.config';

import { API_PATH } from '../config/api.config';

const API_KEY = Config?.API_OPEN_AI || '';

if (!API_KEY) {
  console.warn('⚠️ API_OPEN_AI не установлен. Проверьте файл .env и пересоберите приложение');
}

// Инициализация OpenAI клиента с кастомным baseURL
const openaiClient = new OpenAI({
  apiKey: API_KEY,
  baseURL: `${API_PATH}/v1`,
  timeout: 180000,
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
  signal?: AbortSignal;
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
 */
export const sendMessage = async (
  messages: ChatMessage[],
  options: SendMessageOptions = {}
): Promise<ChatResponse> => {
  try {
    if (!API_KEY) {
      throw new Error('API ключ не установлен. Проверьте файл .env и пересоберите приложение');
    }

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
      const defaultConfig = getModelConfig('text');
      model = defaultConfig.model;
      provider = defaultConfig.provider;
    }

    const imageOnlyProviders = ['PollinationsAI'];
    const isTextRequest = options.modelType !== 'image' && options.modelType !== 'audio';

    if (!options.model && provider && imageOnlyProviders.includes(provider) && isTextRequest) {
      console.warn(`Провайдер ${provider} предназначен только для изображений. Используется текстовая модель.`);
      const defaultConfig = getModelConfig('text');
      model = defaultConfig.model;
      provider = defaultConfig.provider;
    }

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

    if (provider) {
      requestBody.provider = provider;
    }

    // Попробуем прямой fetch
    try {
      const response = await fetch(`${API_PATH}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body: JSON.stringify(requestBody),
        signal: options.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content || '';
      const responseModel = data.model;
      const usage = data.usage;
      const metadata = data._metadata;
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
    } catch (directFetchError: any) {
      if (directFetchError.name === 'AbortError') throw directFetchError;

      // Fallback на SDK
      const completion = await openaiClient.chat.completions.create(requestBody, {
        signal: options.signal
      });

      const content = completion.choices[0]?.message?.content || '';
      const responseModel = completion.model;
      const usage = completion.usage;
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
    console.error('Ошибка в sendMessage:', error);
    throw new Error(error.message || 'Ошибка при отправке сообщения');
  }
};

/**
 * Получает список доступных моделей
 */
export const getAvailableModels = async (provider?: string): Promise<any> => {
  try {
    const url = provider
      ? `${API_PATH}/v1/models?provider=${provider}`
      : `${API_PATH}/v1/models`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Ошибка получения моделей: ${response.status}`);
    }

    const text = await response.text();
    if (!text || text === 'undefined') throw new Error('Пустой или некорректный ответ');

    return JSON.parse(text);
  } catch (error: any) {
    console.warn('Ошибка в getAvailableModels:', error?.message || error);
    throw error;
  }
};
