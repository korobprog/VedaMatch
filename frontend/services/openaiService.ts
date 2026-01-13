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
import { getAuthHeaders } from './contactService';

// Fallback if API_PATH is somehow still missing in some contexts
const SAFE_API_PATH = typeof API_PATH !== 'undefined' ? API_PATH : 'http://localhost:8081/api';

// Клиент инициализируется без ключа, так как прокси на бэкенде сам добавит ключ
const openaiClient = new OpenAI({
  apiKey: 'not-needed-for-proxy',
  baseURL: `${SAFE_API_PATH}/v1`,
  timeout: 180000,
  maxRetries: 2,
  dangerouslyAllowBrowser: true // Для React Native это безопасно через прокси
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
      content_type: 'text', // Prevent proxy from detecting as audio
    };

    if (options.maxTokens) {
      requestBody.max_tokens = options.maxTokens;
    }

    if (provider) {
      requestBody.provider = provider;
    }

    // Попробуем прямой fetch
    try {
      const authHeaders = await getAuthHeaders();
      const response = await fetch(`${SAFE_API_PATH}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          ...authHeaders,
        },
        body: JSON.stringify(requestBody),
        signal: options.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ошибка API (${response.status}): ${errorText.substring(0, 100)}`);
      }

      const text = await response.text();
      console.log('DEBUG: Received API response text length:', text.length);
      console.log('DEBUG: Response preview:', text.substring(0, 500));

      let data: any;
      try {
        data = JSON.parse(text);
        console.log('DEBUG: Parsed JSON data keys:', Object.keys(data));
      } catch (e) {
        console.error('DEBUG: JSON parse error:', e);
        throw new Error(`Failed to parse JSON response: ${text.substring(0, 100)}...`);
      }

      // Handle DALL-E style image response
      // Check if data.data exists and is an array with a url
      if (data && data.data && Array.isArray(data.data) && data.data.length > 0 && data.data[0]?.url) {
        console.log('DEBUG: Detected DALL-E style image response');
        return {
          content: `![Image](${data.data[0].url})`,
          model: data.model || options.model,
          provider: data.provider || options.provider
        };
      }

      // Handle standard ChatCompletion
      if (!data || !data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('DEBUG: Unexpected API response structure. Data:', JSON.stringify(data));
        if (data && data.error) {
          throw new Error(data.error.message || JSON.stringify(data.error));
        }
        throw new Error('API returned empty choices or invalid format' + JSON.stringify(data));
      }

      const choice = data.choices[0];
      if (!choice) {
        throw new Error('First choice is undefined');
      }

      const content = choice.message?.content || '';
      console.log('DEBUG: Extracted content length:', content.length);

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
      ? `${SAFE_API_PATH}/v1/models?provider=${provider}`
      : `${SAFE_API_PATH}/v1/models`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const authHeaders = await getAuthHeaders();
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        ...authHeaders,
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
