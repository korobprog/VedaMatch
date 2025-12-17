# Решение проблемы "Missing required field: provider" в Roo Code Nightly

## Проблема
Плагин Roo Code Nightly не передает обязательный параметр `provider` в запросах к OpenAI Compatible API, что вызывает ошибку:
```
OpenAI completion error: 400 {"message":"Missing required field: provider","type":"invalid_request_error","param":"provider","code":"missing_required_parameter"}
```

## Решение

### Вариант 1: Использование прокси-сервера (Рекомендуется)

Создан Node.js прокси-сервер, который перехватывает запросы от плагина и добавляет параметр `provider`.

#### Установка и запуск:

1. Установите зависимости:
```bash
cd /home/maxim/Documents/Rag-agent
pnpm install express http-proxy-middleware
```

2. Настройте переменные окружения (опционально):
```bash
# Установите URL вашего API (если отличается от rvlautoai.ru)
export API_BASE_URL="https://rvlautoai.ru/webhook"

# Установите провайдер по умолчанию (например, Capi, HuggingSpace, DeepInfra)
export DEFAULT_PROVIDER="Capi"
```

3. Запустите прокси-сервер:
```bash
node proxy-server.js
# или
pnpm start
```

4. В настройках Roo Code Nightly:
   - Откройте настройки плагина
   - Найдите поле "Base URL" или "API Base URL"
   - Измените на: `http://localhost:3001`
   - Сохраните настройки

5. Перезапустите Cursor или перезагрузите плагин

### Вариант 2: Настройка через переменные окружения

Если плагин поддерживает кастомные заголовки или параметры, можно попробовать настроить через переменные окружения.

### Вариант 3: Использование другого провайдера

Попробуйте выбрать другой провайдер в настройках плагина, который может автоматически добавлять параметр `provider`.

## Структура запроса согласно Unlimited-LLMs API

Согласно документации, запрос должен содержать:

```json
{
  "model": "claude45sonnetthinking",
  "provider": "Capi",  // Обязательный параметр!
  "messages": [
    {
      "role": "user",
      "content": "текст сообщения"
    }
  ]
}
```

## Доступные провайдеры

Список доступных провайдеров можно посмотреть в файле `providers.json`:
- DeepInfra
- PollinationsAI
- Perplexity
- HuggingSpace
- И другие...

## Примечание

Если вы используете модель `claude45sonnetthinking`, убедитесь, что выбран правильный провайдер (например, `Capi` или другой, поддерживающий эту модель).

## Определение правильного провайдера для модели

Чтобы узнать, какой провайдер поддерживает вашу модель:

1. Проверьте файл `providers.json` - там указаны все доступные провайдеры
2. Или сделайте запрос к API `/v1/models?provider=<название_провайдера>` для получения списка моделей провайдера
3. Для модели `claude45sonnetthinking` обычно используется провайдер `Capi`

## Альтернативное решение: Изменение провайдера в прокси

Если нужно использовать другой провайдер, запустите прокси с переменной окружения:

```bash
DEFAULT_PROVIDER=HuggingSpace node proxy-server.js
```

Или отредактируйте файл `proxy-server.js` и измените значение `DEFAULT_PROVIDER`.

