# Интеграция фронтенда с n8n сервером

## Информация о сервере

- **URL сервера**: `https://n8n.vedamatch.com`
- **Внутренний хост**: `vaishnava-n8nrunnerpostgresollama-c9fae6-168-222-255-226.traefik.me`
- **Протокол**: HTTPS
- **Порт**: 5678 (внутренний)
- **База данных**: PostgreSQL
- **Очередь**: Redis (Bull)
- **AI интеграция**: Ollama (http://ollama:11434)

## Архитектура n8n на сервере

Сервер использует распределенную архитектуру:
- **n8n-main**: Основной контейнер (API и UI)
- **n8n-worker**: Воркер для выполнения workflow
- **n8n-runner**: Runner для выполнения задач
- **PostgreSQL**: База данных для хранения workflows и credentials
- **Redis**: Очередь для управления задачами
- **Ollama**: AI сервис для интеграции

## Способы интеграции фронтенда с n8n

### 1. REST API

n8n предоставляет REST API для управления workflows, credentials и выполнения задач.

#### Базовый URL API
```
https://n8n.vedamatch.com/api/v1
```

#### Аутентификация

Для работы с API необходимо создать API ключ в настройках n8n:
1. Зайти в настройки n8n (Settings → API)
2. Создать новый API ключ
3. Использовать ключ в заголовке `X-N8N-API-KEY`

#### Пример использования в React Native

```typescript
import axios from 'axios';

const N8N_API_URL = 'https://n8n.vedamatch.com/api/v1';
const N8N_API_KEY = 'your-api-key-here'; // Получить из настроек n8n

const n8nClient = axios.create({
  baseURL: N8N_API_URL,
  headers: {
    'X-N8N-API-KEY': N8N_API_KEY,
    'Content-Type': 'application/json',
  },
});

// Получить все активные workflows
export const getActiveWorkflows = async () => {
  try {
    const response = await n8nClient.get('/workflows?active=true');
    return response.data;
  } catch (error) {
    console.error('Error fetching workflows:', error);
    throw error;
  }
};

// Запустить workflow по ID
export const executeWorkflow = async (workflowId: string, data?: any) => {
  try {
    const response = await n8nClient.post(`/workflows/${workflowId}/execute`, {
      data,
    });
    return response.data;
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
};

// Получить статус выполнения
export const getExecutionStatus = async (executionId: string) => {
  try {
    const response = await n8nClient.get(`/executions/${executionId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching execution status:', error);
    throw error;
  }
};
```

### 2. Webhooks

Webhooks позволяют триггерить workflows из внешних приложений.

#### Создание Webhook в n8n

1. Создать новый workflow в n8n
2. Добавить ноду "Webhook"
3. Настроить метод (GET/POST) и путь
4. Активировать workflow
5. Получить URL webhook из ноды

#### Пример использования Webhook в React Native

```typescript
import axios from 'axios';

// Webhook URL получается из n8n workflow
const WEBHOOK_URL = 'https://n8n.vedamatch.com/webhook/your-webhook-path';

// Отправить данные в webhook
export const triggerWebhook = async (data: any) => {
  try {
    const response = await axios.post(WEBHOOK_URL, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error triggering webhook:', error);
    throw error;
  }
};

// GET запрос к webhook
export const triggerWebhookGet = async (params?: Record<string, string>) => {
  try {
    const response = await axios.get(WEBHOOK_URL, { params });
    return response.data;
  } catch (error) {
    console.error('Error triggering webhook:', error);
    throw error;
  }
};
```

### 3. Polling для получения результатов

Если workflow выполняется асинхронно, можно использовать polling:

```typescript
export const pollExecutionStatus = async (
  executionId: string,
  interval: number = 1000,
  maxAttempts: number = 60
): Promise<any> => {
  let attempts = 0;
  
  while (attempts < maxAttempts) {
    try {
      const status = await getExecutionStatus(executionId);
      
      if (status.finished === true) {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
      attempts++;
    } catch (error) {
      console.error('Error polling execution status:', error);
      throw error;
    }
  }
  
  throw new Error('Execution timeout');
};
```

## Основные API Endpoints

### Workflows

- `GET /workflows` - Получить список workflows
- `GET /workflows/:id` - Получить workflow по ID
- `POST /workflows` - Создать новый workflow
- `PUT /workflows/:id` - Обновить workflow
- `DELETE /workflows/:id` - Удалить workflow
- `POST /workflows/:id/activate` - Активировать workflow
- `POST /workflows/:id/deactivate` - Деактивировать workflow
- `POST /workflows/:id/execute` - Выполнить workflow

### Executions

- `GET /executions` - Получить список выполнений
- `GET /executions/:id` - Получить выполнение по ID
- `DELETE /executions/:id` - Удалить выполнение

### Credentials

- `GET /credentials` - Получить список credentials
- `GET /credentials/:id` - Получить credential по ID
- `POST /credentials` - Создать credential
- `PUT /credentials/:id` - Обновить credential
- `DELETE /credentials/:id` - Удалить credential

## Обработка ошибок

```typescript
const handleN8nError = (error: any) => {
  if (error.response) {
    // Сервер ответил с кодом ошибки
    switch (error.response.status) {
      case 401:
        throw new Error('Неверный API ключ');
      case 404:
        throw new Error('Workflow не найден');
      case 500:
        throw new Error('Ошибка сервера n8n');
      default:
        throw new Error(`Ошибка API: ${error.response.status}`);
    }
  } else if (error.request) {
    // Запрос был отправлен, но ответа не получено
    throw new Error('Нет соединения с сервером n8n');
  } else {
    // Ошибка при настройке запроса
    throw new Error(`Ошибка запроса: ${error.message}`);
  }
};
```

## Безопасность

1. **API ключи**: Храните API ключи в безопасном месте (например, используйте react-native-keychain)
2. **HTTPS**: Все запросы должны идти через HTTPS
3. **Валидация данных**: Всегда валидируйте данные перед отправкой в n8n
4. **Обработка ошибок**: Правильно обрабатывайте ошибки и не логируйте чувствительные данные

## Пример полной интеграции

```typescript
import axios from 'axios';
import * as Keychain from 'react-native-keychain';

class N8nService {
  private apiUrl = 'https://n8n.vedamatch.com/api/v1';
  private client: axios.AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: this.apiUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Добавляем interceptor для API ключа
    this.client.interceptors.request.use(async (config) => {
      const credentials = await Keychain.getGenericPassword();
      if (credentials) {
        config.headers['X-N8N-API-KEY'] = credentials.password;
      }
      return config;
    });
  }

  async getWorkflows(active?: boolean) {
    try {
      const params = active !== undefined ? { active } : {};
      const response = await this.client.get('/workflows', { params });
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async executeWorkflow(workflowId: string, data?: any) {
    try {
      const response = await this.client.post(
        `/workflows/${workflowId}/execute`,
        { data }
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  async triggerWebhook(webhookPath: string, data: any) {
    try {
      const response = await axios.post(
        `https://n8n.vedamatch.com/webhook/${webhookPath}`,
        data
      );
      return response.data;
    } catch (error) {
      this.handleError(error);
    }
  }

  private handleError(error: any) {
    if (error.response) {
      throw new Error(
        `n8n API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`
      );
    } else if (error.request) {
      throw new Error('Нет соединения с сервером n8n');
    } else {
      throw new Error(`Ошибка запроса: ${error.message}`);
    }
  }
}

export default new N8nService();
```

## Технологии для интеграции

- **HTTP клиент**: axios (уже установлен в проекте)
- **Хранение ключей**: react-native-keychain (рекомендуется установить)
- **Типизация**: TypeScript (уже настроен)
- **Обработка асинхронности**: async/await, Promises

## Дополнительные ресурсы

- [n8n API документация](https://docs.n8n.io/api/)
- [n8n Webhooks](https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/)
- [n8n REST API Reference](https://docs.n8n.io/api/)
