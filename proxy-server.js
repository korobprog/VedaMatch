#!/usr/bin/env node

/**
 * Прокси-сервер для добавления параметра "provider" в запросы Roo Code Nightly
 * к OpenAI Compatible API
 * 
 * Этот сервер перехватывает запросы от плагина и добавляет обязательный
 * параметр "provider" перед отправкой на реальный API.
 */

const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const app = express();

// Порт прокси-сервера
const PROXY_PORT = 3001;

// URL вашего OpenAI Compatible API
// Замените на ваш реальный URL API
// По умолчанию используется API из openaiService.ts
const TARGET_API_URL = process.env.API_BASE_URL || 'https://rvlautoai.ru/webhook';

// Провайдер по умолчанию (можно изменить через переменную окружения)
const DEFAULT_PROVIDER = process.env.DEFAULT_PROVIDER || 'Capi';

// Маппинг моделей к провайдерам (на основе документации API)
// Если модель не найдена, используется DEFAULT_PROVIDER
const MODEL_PROVIDER_MAP = {
  // Модели Perplexity
  'gpt5': 'Perplexity',
  'gpt-5': 'Perplexity',
  'claude45sonnetthinking': 'Perplexity',
  'claude45sonnet': 'Perplexity',
  'claude41opusthinking': 'Perplexity',
  'claude40opusthinking': 'Perplexity',
  'claude37sonnetthinking': 'Perplexity',
  'o3': 'Perplexity',
  'o3mini': 'Perplexity',
  'o3pro': 'Perplexity',
  'grok4': 'Perplexity',
  'gemini2flash': 'Perplexity',
  'pplx_reasoning': 'Perplexity',
  'pplx_pro': 'Perplexity',
  'turbo': 'Perplexity',
  'experimental': 'Perplexity',
  // Модели PollinationsAI
  'gpt-5-nano': 'PollinationsAI',
  'gpt-5-mini': 'PollinationsAI',
  'o4-mini': 'PollinationsAI',
  'deepseek-v3': 'PollinationsAI',
  'midijourney': 'PollinationsAI',
  'chickytutor': 'PollinationsAI',
  'llama-roblox': 'PollinationsAI',
  // Модели DeepInfra
  'meta-llama/Llama-3.3-70B-Instruct-Turbo': 'DeepInfra',
  'meta-llama/Llama-3.3-70B-Instruct': 'DeepInfra',
  'deepseek-ai/DeepSeek-V3-0324': 'DeepInfra',
  'deepseek-ai/DeepSeek-R1-0528': 'DeepInfra',
  'Qwen/Qwen3-Next-80B-A3B-Instruct': 'DeepInfra',
  'moonshotai/Kimi-K2-Instruct-0905': 'DeepInfra',
  // Модели HuggingSpace
  'qwen-3-235b': 'HuggingSpace',
  'qwen-3-32b': 'HuggingSpace',
  'qwen-3-4b': 'HuggingSpace',
  'qwen-3-1.7b': 'HuggingSpace',
  'qwen-3-0.6b': 'HuggingSpace',
  'ling': 'HuggingSpace',
  'ling-1t': 'HuggingSpace',
  'command-r-08-2024': 'HuggingSpace',
  'command-r7b-12-2024': 'HuggingSpace',
  'flux': 'HuggingSpace',
  'flux-dev': 'HuggingSpace',
};

// Парсинг JSON для модификации тела запроса
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Логирование запросов
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  
  // Специальное логирование для запросов списка моделей
  if (req.path.includes('models') || req.url.includes('models')) {
    console.log(`[PROXY] 🔍 Запрос списка моделей: ${req.method} ${req.path}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`);
  }
  
  next();
});

// Исправление путей для запросов без /v1 префикса
app.use((req, res, next) => {
  // Если запрос идет на /models или /chat/completions без /v1, добавляем префикс
  if (req.path === '/models' || req.path.startsWith('/models')) {
    const newPath = req.path.replace(/^\/models/, '/v1/models');
    req.url = newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    console.log(`[PROXY] 📋 Запрос списка моделей: ${req.path} → ${newPath}`);
    if (req.url.includes('?')) {
      console.log(`[PROXY] 📋 Параметры запроса: ${req.url.substring(req.url.indexOf('?'))}`);
    }
  } else if (req.path === '/chat/completions' || req.path.startsWith('/chat/completions')) {
    const newPath = req.path.replace(/^\/chat\/completions/, '/v1/chat/completions');
    req.url = newPath + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : '');
    console.log(`[PROXY] Перенаправляю ${req.path} на ${newPath}`);
  }
  next();
});

// Middleware для добавления параметра provider
// Обрабатываем как /v1/chat/completions, так и /chat/completions (после перенаправления)
app.use(['/v1/chat/completions', '/chat/completions'], (req, res, next) => {
  if (req.method === 'POST' && req.body) {
    const model = req.body.model;
    
    // Если параметр provider отсутствует, определяем его на основе модели
    if (!req.body.provider) {
      // Проверяем маппинг моделей
      const mappedProvider = MODEL_PROVIDER_MAP[model] || DEFAULT_PROVIDER;
      req.body.provider = mappedProvider;
      
      if (MODEL_PROVIDER_MAP[model]) {
        console.log(`[PROXY] Определен провайдер для модели "${model}": ${mappedProvider}`);
      } else {
        console.log(`[PROXY] Использую провайдер по умолчанию для модели "${model}": ${mappedProvider}`);
      }
    } else {
      console.log(`[PROXY] Провайдер уже указан: ${req.body.provider}`);
    }
    
    // Логируем тело запроса для отладки
    console.log(`[PROXY] Модель: ${model}, Провайдер: ${req.body.provider}`);
    
    // Проверяем, запрашивается ли streaming
    const isStreamingRequest = req.body.stream === true;
    
    // Детальное логирование запроса (можно включить через DEBUG_BODY=true)
    if (process.env.DEBUG_BODY === 'true') {
      console.log(`[PROXY] Полное тело запроса:`, JSON.stringify(req.body, null, 2));
    } else {
      // Логируем только ключевые параметры
      const logBody = {
        model: req.body.model,
        provider: req.body.provider,
        messages_count: req.body.messages?.length || 0,
        temperature: req.body.temperature,
        max_tokens: req.body.max_tokens,
        stream: req.body.stream
      };
      console.log(`[PROXY] Параметры запроса:`, JSON.stringify(logBody));
    }
    
    // Сохраняем информацию о streaming запросе для проверки ответа
    req._isStreamingRequest = isStreamingRequest;
    
    // ВАЖНО: API может не поддерживать streaming для некоторых моделей/провайдеров
    // Автоматически отключаем streaming, чтобы избежать ошибок в плагине
    if (isStreamingRequest) {
      console.log(`[PROXY] ⚠️ Запрашивается streaming, но API может вернуть обычный JSON`);
      console.log(`[PROXY] 💡 Отключаю streaming для совместимости с API`);
      req.body.stream = false;
      req._originalStreamRequest = true; // Сохраняем, что изначально был streaming запрос
    }
  }
  next();
});

// Прокси для всех остальных путей
app.use(
  '/',
  createProxyMiddleware({
    target: TARGET_API_URL,
    changeOrigin: true,
    // Важно: сохраняем заголовки для streaming
    preserveHeaderKeyCase: true,
    // Исправляем пути: добавляем /v1 префикс где нужно
    pathRewrite: {
      '^/models': '/v1/models', // /models -> /v1/models
      '^/chat/completions': '/v1/chat/completions', // /chat/completions -> /v1/chat/completions
    },
    onProxyReq: (proxyReq, req, res) => {
      // Логируем заголовки авторизации для отладки
      if (req.headers.authorization) {
        const authHeader = req.headers.authorization;
        const keyPreview = authHeader.startsWith('Bearer ') 
          ? `Bearer ${authHeader.substring(7, 15)}...` 
          : `${authHeader.substring(0, 8)}...`;
        console.log(`[PROXY] ✅ API ключ найден: ${keyPreview}`);
        proxyReq.setHeader('Authorization', authHeader);
      } else {
        console.error(`[PROXY] ❌ API ключ отсутствует! Проверьте настройки Roo Code Nightly.`);
        console.error(`[PROXY] 💡 Убедитесь, что в настройках плагина указан API ключ.`);
      }
      
      // Логируем все заголовки для отладки (опционально)
      if (process.env.DEBUG_HEADERS === 'true') {
        console.log(`[PROXY] Заголовки запроса:`, Object.keys(req.headers));
      }
      
      // Если это POST запрос с телом, модифицируем его
      if (req.method === 'POST' && req.body && Object.keys(req.body).length > 0) {
        const bodyData = JSON.stringify(req.body);
        
        // Логируем отправляемый запрос для отладки (только для chat/completions)
        if (req.path.includes('chat/completions')) {
          const requestPreview = {
            model: req.body.model,
            provider: req.body.provider,
            messages_count: req.body.messages?.length || 0,
            has_stream: req.body.stream !== undefined,
            temperature: req.body.temperature,
            max_tokens: req.body.max_tokens
          };
          console.log(`[PROXY] 📤 Отправляю запрос:`, JSON.stringify(requestPreview));
        }
        
        proxyReq.setHeader('Content-Type', 'application/json');
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        // Очищаем тело запроса перед записью нового
        proxyReq.removeHeader('Content-Length');
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // Логируем ответ
      const statusCode = proxyRes.statusCode;
      console.log(`[PROXY] Ответ: ${statusCode}`);
      
      // Специальная обработка для запросов списка моделей
      if (req.path.includes('/models') || req.url.includes('/models')) {
        if (statusCode === 200) {
          console.log(`[PROXY] ✅ Список моделей успешно получен`);
        } else {
          console.error(`[PROXY] ❌ Ошибка получения списка моделей: ${statusCode}`);
        }
      }
      
      // Логируем заголовки ответа для отладки
      const contentType = proxyRes.headers['content-type'];
      const isStreaming = contentType && contentType.includes('text/event-stream');
      const wasStreamingRequest = req._isStreamingRequest;
      
      if (isStreaming) {
        console.log(`[PROXY] 📡 Streaming ответ обнаружен`);
      } else if (contentType) {
        console.log(`[PROXY] 📄 Content-Type: ${contentType}`);
        
        // Предупреждение: запрашивался streaming, но пришел обычный JSON
        if (wasStreamingRequest && !isStreaming) {
          console.warn(`[PROXY] ⚠️ ВНИМАНИЕ: Запрашивался streaming, но API вернул обычный JSON ответ`);
          console.warn(`[PROXY] 💡 Это может вызывать ошибки в плагине. API может не поддерживать streaming для этой модели.`);
        }
      }
      
      // Копируем все важные заголовки для корректной работы плагина
      // http-proxy-middleware делает это автоматически, но убедимся что все заголовки переданы
      const importantHeaders = [
        'content-type',
        'content-encoding',
        'transfer-encoding',
        'cache-control',
        'x-ratelimit-limit',
        'x-ratelimit-remaining',
        'x-ratelimit-reset'
      ];
      
      importantHeaders.forEach(header => {
        if (proxyRes.headers[header]) {
          res.setHeader(header, proxyRes.headers[header]);
        }
      });
      
      // Для запросов списка моделей убеждаемся, что Content-Type правильный
      if (req.path.includes('/models') || req.url.includes('/models')) {
        if (!res.getHeader('content-type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        console.log(`[PROXY] 📋 Content-Type для списка моделей: ${res.getHeader('content-type')}`);
      }
      
      // Логируем rate limit заголовки
      const rateLimitRemaining = proxyRes.headers['x-ratelimit-remaining'];
      const rateLimitReset = proxyRes.headers['x-ratelimit-reset'];
      if (rateLimitRemaining !== undefined) {
        console.log(`[PROXY] Rate Limit: осталось ${rateLimitRemaining} запросов`);
        if (rateLimitReset) {
          const resetDate = new Date(parseInt(rateLimitReset) * 1000);
          console.log(`[PROXY] Rate Limit сбросится: ${resetDate.toLocaleString()}`);
        }
      }
      
      // Для успешных streaming ответов логируем начало
      if (statusCode === 200 && isStreaming) {
        console.log(`[PROXY] ✅ Streaming ответ начат, передаю данные плагину...`);
      }
      
      // Для успешных не-streaming ответов логируем первые байты (опционально)
      if (statusCode === 200 && !isStreaming && process.env.DEBUG_RESPONSE === 'true') {
        const chunks = [];
        const originalOn = proxyRes.on;
        proxyRes.on('data', (chunk) => {
          chunks.push(chunk);
          if (chunks.length === 1) {
            try {
              const preview = chunk.toString().substring(0, 200);
              console.log(`[PROXY] 📥 Первые байты ответа: ${preview}...`);
            } catch (e) {
              // Игнорируем ошибки парсинга
            }
          }
        });
      }
      
      // Логируем детали ошибок 400 и 500
      if (statusCode === 400 || statusCode === 500 || statusCode === 401 || statusCode === 403 || statusCode === 429) {
        // Читаем тело ответа для логирования ошибки
        const chunks = [];
        const originalOn = proxyRes.on;
        proxyRes.on('data', (chunk) => chunks.push(chunk));
        proxyRes.on('end', () => {
          try {
            const body = Buffer.concat(chunks).toString();
            if (body) {
              const errorData = JSON.parse(body);
              const errorMessage = errorData.error?.message || errorData.message || body.substring(0, 200);
              console.error(`[PROXY] ❌ Ошибка ${statusCode}:`, errorMessage);
              
              if (statusCode === 401 || statusCode === 403) {
                console.error(`[PROXY] 🔑 Проблема с авторизацией! Проверьте API ключ в настройках Roo Code Nightly.`);
              } else if (statusCode === 429) {
                const retryAfter = proxyRes.headers['retry-after'] || '60';
                console.error(`[PROXY] ⏳ Rate Limit превышен! Подождите ${retryAfter} секунд перед следующим запросом.`);
                console.error(`[PROXY] 💡 Лимит: 30 запросов в минуту для full ключей`);
              } else if (statusCode === 500) {
                console.error(`[PROXY] ⚠️ Ошибка сервера (500). Возможные причины:`);
                console.error(`[PROXY]   1. Временная проблема на стороне API сервера (попробуйте через несколько секунд)`);
                console.error(`[PROXY]   2. Модель "${req.body?.model}" временно недоступна у провайдера "${req.body?.provider}"`);
                console.error(`[PROXY]   3. Превышен rate limit (30 запросов в минуту для full ключей)`);
                console.error(`[PROXY] 💡 Рекомендации:`);
                console.error(`[PROXY]   - Подождите несколько секунд и повторите запрос`);
                console.error(`[PROXY]   - Попробуйте другую модель (например, gpt5_thinking, o3mini, claude45sonnet)`);
                console.error(`[PROXY]   - Проверьте rate limit в заголовках ответа`);
              }
              
              if (req.body?.model && req.body?.provider) {
                console.error(`[PROXY] 💡 Проверьте доступные модели: curl "${TARGET_API_URL}/v1/models?provider=${req.body.provider}"`);
              }
            }
          } catch (e) {
            // Игнорируем ошибки парсинга
            if (statusCode === 500) {
              console.error(`[PROXY] ⚠️ Ошибка 500: Не удалось прочитать детали ошибки`);
            }
          }
        });
      }
    },
    onError: (err, req, res) => {
      console.error(`[PROXY] Ошибка:`, err.message);
      res.status(500).json({
        error: 'Proxy error',
        message: err.message
      });
    },
  })
);

// Запуск сервера
app.listen(PROXY_PORT, () => {
  console.log(`🚀 Прокси-сервер запущен на порту ${PROXY_PORT}`);
  console.log(`📡 Перенаправляет запросы на: ${TARGET_API_URL}`);
  console.log(`🔧 Провайдер по умолчанию: ${DEFAULT_PROVIDER}`);
  console.log(`\nНастройте Roo Code Nightly использовать Base URL: http://localhost:${PROXY_PORT}`);
  console.log(`\nДля изменения провайдера установите переменную окружения:`);
  console.log(`  DEFAULT_PROVIDER=HuggingSpace node proxy-server.js`);
});

