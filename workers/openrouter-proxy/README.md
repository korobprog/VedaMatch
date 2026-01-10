# OpenRouter Proxy Worker

Cloudflare Worker для проксирования запросов к OpenRouter API.

## Зачем нужен прокси

1. **Безопасность** — API ключ OpenRouter хранится в worker, не передаётся клиенту
2. **Rate Limiting** — контроль количества запросов на пользователя
3. **Логирование** — отслеживание использования API
4. **CORS** — разрешение запросов с вашего домена

## Настройка

### 1. Установка Wrangler CLI

```bash
npm install -g wrangler
```

### 2. Деплой worker

```bash
cd workers/openrouter-proxy
wrangler login
wrangler deploy
```

### 3. Настройка секретов

```bash
wrangler secret put OPENROUTER_API_KEY
# Введите ваш OpenRouter API ключ
```

## Использование

Worker будет доступен по адресу:
```
https://openrouter-proxy.<your-subdomain>.workers.dev/v1/chat/completions
```

Или привяжите к вашему домену в Dashboard Cloudflare.

## Эндпоинты

- `POST /v1/chat/completions` — проксирует запросы к OpenRouter
- `GET /health` — проверка статуса worker
- `GET /models` — список доступных моделей
