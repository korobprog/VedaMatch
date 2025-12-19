# Архитектура Rag Agent

## Обзор проекта

Rag Agent - это мобильное приложение (React Native) с бекендом на Go, которое предоставляет чат-интерфейс для общения с AI моделями через внешний API, а также систему регистрации пользователей с интеграцией RAG (Retrieval-Augmented Generation) для персонализации ответов.

## Архитектура системы

### Компоненты

```
┌─────────────────┐
│  React Native   │  Frontend (Android/iOS)
│     App         │  Порт: 8082 (Metro)
└────────┬────────┘
         │ HTTP
         │ http://10.0.2.2:8081/api/v1/chat/completions
         │ (Android Emulator → localhost:8081)
         ▼
┌─────────────────┐
│   Go Backend    │  Fiber Framework
│   Port: 8081    │  /api/v1/chat/completions
└────────┬────────┘
         │ HTTP Proxy
         │ https://rvlautoai.ru/webhook/v1/chat/completions
         ▼
┌─────────────────┐
│  External API   │  RVFreeLLM API
│  rvlautoai.ru   │  Множество AI моделей
└─────────────────┘

┌─────────────────┐
│  PostgreSQL     │  База данных
│   Port: 5435    │  Пользователи и профили
└─────────────────┘

┌─────────────────┐
│  Google Gemini  │  RAG система
│   RAG Store     │  Хранение профилей пользователей
└─────────────────┘
```

## Frontend (React Native)

### Технологии
- **Framework**: React Native 0.76.5
- **Language**: TypeScript
- **Metro Port**: 8082
- **Package Manager**: pnpm

### Структура
```
frontend/
├── App.tsx                    # Главный компонент с чатом
├── RegistrationScreen.tsx     # Экран регистрации пользователя
├── SettingsDrawer.tsx         # Настройки (модели, провайдеры)
├── ChatImage.tsx              # Компонент для изображений в чате
├── services/
│   └── openaiService.ts      # Сервис для работы с AI API
├── config/
│   └── models.config.ts      # Конфигурация моделей по умолчанию
└── context/
    └── SettingsContext.tsx    # Контекст настроек приложения
```

### API Endpoints (Frontend → Backend)
- **Base URL**: `http://10.0.2.2:8081/api` (Android Emulator)
- **Chat**: `POST /v1/chat/completions`
- **Models**: `GET /v1/models`

### Конфигурация моделей
По умолчанию используются:
- **Text**: `meta-llama/Llama-3.3-70B-Instruct-Turbo` (DeepInfra)
- **Audio**: `alloy` (OpenAIFM)
- **Image**: `flux` (PollinationsAI)

### Переменные окружения
- `API_OPEN_AI` - API ключ для внешнего API (через react-native-config)

## Backend (Go)

### Технологии
- **Framework**: Fiber v2
- **Language**: Go
- **Port**: 8081
- **Database**: PostgreSQL (GORM)

### Структура
```
server/
├── cmd/api/
│   └── main.go              # Точка входа, роутинг
├── internal/
│   ├── handlers/
│   │   ├── auth_handler.go # Регистрация/логин
│   │   └── chat.go         # Прокси для AI чата
│   ├── models/
│   │   └── user.go         # Модель пользователя
│   ├── services/
│   │   └── rag_service.go  # Интеграция с Google Gemini RAG
│   └── database/
│       └── database.go     # Подключение к БД
└── go.mod
```

### API Endpoints

#### Аутентификация
- `POST /api/register` - Регистрация пользователя
  - Сохраняет профиль в PostgreSQL
  - Асинхронно загружает профиль в Google Gemini RAG Store
  
- `POST /api/login` - Вход по email
  - Поиск пользователя в БД по email

#### Chat
- `POST /api/v1/chat/completions` - Прокси для AI чата
  - Принимает запрос от фронтенда
  - Проксирует на `https://rvlautoai.ru/webhook/v1/chat/completions`
  - Передает API ключ из переменной окружения `API_OPEN_AI`

### Модель пользователя
```go
type User struct {
    KarmicName    string  // Кармическое имя
    SpiritualName string  // Духовное имя
    Email         string  // Email (уникальный)
    Gender        string  // Пол
    Country       string  // Страна
    City          string  // Город
    Identity      string  // Идентичность
    Diet          string  // Диета
    Madh          string  // Традиция (мадх)
    Mentor        string  // Наставник
    Dob           string  // Дата рождения
    RagFileID     string  // ID файла в RAG системе
}
```

### Переменные окружения
- `DB_HOST` - Хост БД (по умолчанию: localhost)
- `DB_PORT` - Порт БД (по умолчанию: 5435)
- `DB_USER` - Пользователь БД (по умолчанию: raguser)
- `DB_PASSWORD` - Пароль БД (по умолчанию: ragpassword)
- `DB_NAME` - Имя БД (по умолчанию: ragdb)
- `API_OPEN_AI` - API ключ для внешнего AI API

## База данных (PostgreSQL)

### Конфигурация
- **Image**: postgres:15-alpine
- **Port**: 5435 (host) → 5432 (container)
- **Database**: ragdb
- **User**: raguser
- **Password**: ragpassword

### Миграции
Автоматические миграции через GORM при старте сервера.

## RAG Integration (Google Gemini)

### Процесс загрузки профиля
1. **Форматирование данных** - Профиль пользователя форматируется в текстовый формат
2. **Upload File** - Загрузка файла в Google Gemini через `upload/v1beta/files`
3. **Import to Store** - Импорт файла в RAG Store через `fileSearchStores/{storeId}:importFile`

### Конфигурация
- **API Key**: Хардкод в `rag_service.go` (TODO: вынести в env)
- **Store ID**: `my-store-tva5a8g0mgj3` (TODO: сделать динамическим)
- **Upload URL**: `https://generativelanguage.googleapis.com/upload/v1beta/files`
- **Import URL**: `https://generativelanguage.googleapis.com/v1beta/fileSearchStores/{storeId}:importFile`

## Proxy Server (Node.js)

### Назначение
Отдельный прокси-сервер для Roo Code Nightly плагина (не используется мобильным приложением).

### Конфигурация
- **Port**: 3001
- **Target**: `https://rvlautoai.ru/webhook`
- **Default Provider**: Capi

### Функции
- Автоматическое добавление параметра `provider` в запросы
- Маппинг моделей к провайдерам
- Логирование запросов/ответов

## Docker Compose

### Сервисы
1. **postgres** - PostgreSQL база данных
2. **server** - Go бекенд сервер

### Порты
- PostgreSQL: 5435 (host) → 5432 (container)
- Server: 8082 (host) → 8080 (container)

## Поток данных

### Регистрация пользователя
```
Frontend (RegistrationScreen)
  → POST /api/register
    → Go Backend (auth_handler.go)
      → PostgreSQL (save initial user)
      → Google Gemini RAG (rag_service.go)
        → Upload Profile (native Go HTTP request)
        → Import to Store (native Go HTTP request)
        → Return RagFileID
      → PostgreSQL (update user with RagFileID)
```

### Чат с AI
```
Frontend (App.tsx)
  → sendMessage() (openaiService.ts)
    → POST http://10.0.2.2:8081/api/v1/chat/completions
      → Go Backend (chat.go)
        → POST https://rvlautoai.ru/webhook/v1/chat/completions
          → External API (RVFreeLLM)
            → Response
              → Go Backend (проксирование)
                → Frontend (отображение ответа)
```

## Особенности архитектуры

### Android Emulator Networking
- `10.0.2.2` - специальный IP адрес Android эмулятора для доступа к localhost хоста
- Используется для подключения фронтенда к бекенду на хосте

### Асинхронная обработка RAG
- Загрузка профиля в RAG выполняется асинхронно (goroutine)
- Регистрация не блокируется на RAG операциях
- Ошибки RAG логируются, но не влияют на успешность регистрации

### Проксирование запросов
- Go бекенд выступает как прокси между фронтендом и внешним API
- Позволяет скрыть API ключ от клиента
- Централизованная обработка ошибок и логирование

## Запуск проекта

### Backend
```bash
cd server
go run cmd/api/main.go
```

### Frontend
```bash
cd frontend
pnpm start
```

### Docker Compose
```bash
docker-compose up -d
```

### Полный запуск (из корня)
```bash
pnpm run dev  # Backend + Frontend одновременно
```

## API Documentation (Unlimited-LLMs / RVFreeLLM)

Проект использует внешний API-шлюз **RVFreeLLM** (Unlimited-LLMs) для взаимодействия с различными AI моделями. В проекте этот API также упоминается через переменную окружения `API_OPEN_AI`.

### Базовая информация
- **Base URL**: `https://rvlautoai.ru/webhook`
- **Формат данных**: JSON (`Content-Type: application/json`)
- **Совместимость**: OpenAI API Compatible (с расширениями)

### Аутентификация
Все запросы к методам генерации требуют авторизации через заголовок `Authorization`.

- **Формат**: `Authorization: Bearer YOUR_API_KEY`
- **Ключ проекта**: Переменная `API_OPEN_AI` (префикс `rvf_`, длина 75 символов)

### Основные эндпойнты

#### 1. Генерация текста и чат
- **Метод**: `POST /v1/chat/completions`
- **Обязательные параметры**:
  - `model`: Название модели (например, `gpt-4o`, `meta-llama/Llama-3.3-70B-Instruct-Turbo`)
  - `provider`: Провайдер модели (обязателен для уточнения маршрутизации, например, `Capi`, `DeepInfra`)
  - `messages`: Массив сообщений в формате OpenAI (`role`, `content`)

**Пример запроса через бэкенд (Go Proxy):**
Бэкенд проксирует запросы с фронтенда, автоматически добавляя ключ `API_OPEN_AI` из окружения.

```json
{
  "model": "gpt-4o",
  "provider": "Capi",
  "messages": [
    {"role": "user", "content": "Привет, расскажи о себе"}
  ],
  "stream": false
}
```

#### 2. Список доступных моделей
- **Метод**: `GET /v1/models`
- **Аутентификация**: Не требуется (публичный метод)
- **Описание**: Возвращает список всех доступных моделей, их провайдеров, категории и оценку качества.

### Типы поддерживаемых моделей
| Тип | Назначение | Примеры в проекте |
|-----|------------|------------------|
| `text` | Чат и текст | `Llama-3.3-70B`, `gpt-4o` |
| `image` | Генерация изображений | `flux`, `dall-e-3` |
| `audio` | TTS и транскрипция | `alloy`, `whisper` |

### Рекомендации для технологий проекта
1. **Маппинг моделей**: В `frontend/config/models.config.ts` следует указывать не только имя модели, но и соответствующего провайдера.
2. **Fallback**: API поддерживает автоматический fallback. Если основная модель недоступна, система может переключить запрос на аналогичную (подробнее в документации Unlimited-LLMs).
3. **Локальный Proxy**: В проекте настроен вспомогательный Proxy-сервер (Node.js на порту 3001), который может автоматически подставлять параметры провайдера для специфических инструментов разработки.

## TODO / Улучшения

1. **RAG Service**:
   - Вынести API ключ Google Gemini в переменные окружения
   - Сделать Store ID динамическим или конфигурируемым
   - Добавить обработку ошибок и retry логику

2. **Безопасность**:
   - Добавить JWT токены для аутентификации
   - Валидация входных данных
   - Rate limiting

3. **Функциональность**:
   - Использование RAG контекста в чате (персонализация ответов)
   - История сообщений в БД
   - Поддержка изображений в чате

4. **Инфраструктура**:
   - Логирование (структурированные логи)
   - Мониторинг и метрики
   - CI/CD pipeline

## Рекомендации по работе с RAG (API Restrictions)

### 1. Региональные ограничения Google
Google Gemini API (особенно Semantic Retrieval / Corpora) имеет жесткие географические ограничения. Если сервер находится в неподдерживаемом регионе (например, РФ), прямые запросы из Go-бэкенда к `generativelanguage.googleapis.com` будут возвращать ошибку `400 Bad Request: User location is not supported`.

### 2. Способы решения
*   **Использование VDS в поддерживаемом регионе**: Бэкенд должен быть развернут на сервере (например, в США или Европе), где API доступно без ограничений.
*   **Использование HTTP-прокси**: В `rag_service.go` можно внедрить поддержку проксирования через переменную `PROXY_URL` в `.env`, чтобы запросы к Google шли через разрешенный IP.
*   **Предварительное создание Corpus**: Создание хранилища (Corpus) рекомендуется выполнять один раз через VPN или удаленный сервер, после чего прописывать полученный `GEMINI_CORPUS_ID` в конфиг.

### 3. Резервный вариант (File API)
Если работа с `corpora` остается нестабильной из-за блокировок, архитектура предусматривает переход на **Gemini File API**. В этом случае профиль пользователя загружается как обычный файл, который передается в контекст модели (`generateContent`) при каждом запросе, что менее чувствительно к региональным проверкам на этапе поиска.

