/**
 * Конфигурация AI моделей для чата
 * Модели обновляются каждые сутки в 02:00 по МСК
 * Проверяйте актуальность моделей через API: GET /v1/models
 */

export interface ModelConfig {
  model: string;
  provider?: string;
}

export interface ModelsConfig {
  text: ModelConfig;
  audio: ModelConfig;
  image: ModelConfig;
}

/**
 * Настройки моделей по умолчанию
 * Можно изменить на любые доступные модели из API
 */
export const modelsConfig: ModelsConfig = {
  // Модель для текстовых ответов
  text: {
    model: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
    provider: 'DeepInfra',
  },
  // Модель для генерации аудио
  audio: {
    model: 'alloy',
    provider: 'OpenAIFM',
  },
  // Модель для генерации изображений
  image: {
    model: 'flux',
    provider: 'PollinationsAI',
  },
};

/**
 * Получить конфигурацию модели по типу
 */
export function getModelConfig(type: keyof ModelsConfig): ModelConfig {
  return modelsConfig[type];
}

