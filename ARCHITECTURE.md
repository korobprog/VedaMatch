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

┌─────────────────┐
│     FirstVDS    │  S3 Storage (Медиа)
│   S3 (default)  │  Аватары, фото, файлы
│  (S3 protocol)  │  Signature v4 auth
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
├── components/
│   └── chat/
│       ├── MessageList.tsx    # Отрисовка сообщений (Text, Audio, Image, Doc)
│       └── AudioPlayer.tsx    # Компонент воспроизведения голосовых
├── services/
│   ├── openaiService.ts       # Сервис для работы с AI API
│   └── mediaService.ts        # Сервис загрузки медиа в S3
├── config/
│   └── models.config.ts       # Конфигурация моделей по умолчанию
└── context/
    ├── ChatContext.tsx        # Логика чата, медиа и WebSocket
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
│   │   ├── auth_handler.go   # Регистрация/логин/друзья/блокировки
│   │   ├── chat.go           # Прокси для AI чата
│   │   ├── dating_handler.go # Поиск кандидатов, AI совместимость
│   │   ├── media_handler.go  # Управление фото (загрузка, удаление)
│   │   ├── room_handler.go   # Управление комнатами и участниками
│   │   └── message_handler.go# Сообщения и саммари
│   ├── models/
│   │   ├── user.go           # Модель пользователя + Dating профиль
│   │   ├── media.go          # Модель для фото пользователя
│   │   ├── room.go           # Модель комнат
│   │   └── message.go        # Модель сообщений
│   ├── services/
│   │   ├── rag_service.go    # Интеграция с Google Gemini RAG
│   │   ├── ai_chat_service.go# Сервис для AI ответов и совместимости
│   │   └── s3_service.go     # Интеграция с S3 (Storage)
│   └── database/
│       └── database.go       # Подключение к БД и миграции
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
    KarmicName     string  // Кармическое имя
    SpiritualName  string  // Духовное имя
    Email          string  // Email (уникальный)
    Gender         string  // Пол
    Country        string  // Страна
    City           string  // Город
    Identity       string  // Идентичность
    Diet           string  // Диета
    Madh           string  // Традиция (мадх)
    Mentor         string  // Наставник
    Dob            string  // Дата рождения
    // Поля для знакомств (Dating)
    Bio            string  // О себе
    Interests      string  // Интересы
    LookingFor     string  // Кого ищу
    MaritalStatus  string  // Семейное положение
    BirthTime      string  // Время рождения
    BirthPlaceLink string  // Место рождения (ссылка или название)
    DatingEnabled  bool    // Включен ли профиль знакомств
    RagFileID      string  // ID файла в RAG системе
}

type Media struct {
    UserID    uint
    URL       string  // Путь к файлу (Локальный путь или S3 URL)
    IsProfile bool    // Является ли фото основным аватаром
}
```

### Переменные окружения
- `DB_HOST` - Хост БД (по умолчанию: localhost)
- `DB_PORT` - Порт БД (по умолчанию: 5435)
- `DB_USER` - Пользователь БД (по умолчанию: raguser)
- `DB_PASSWORD` - Пароль БД (по умолчанию: ragpassword)
- `DB_NAME` - Имя БД (по умолчанию: ragdb)
- `API_OPEN_AI` - API ключ для внешнего AI API

#### S3 (FirstVDS)
- `S3_ENDPOINT` - URL эндпоинта (https://s3.firstvds.ru)
- `S3_REGION` - Регион (default)
- `S3_ACCESS_KEY` - Ключ доступа S3
- `S3_SECRET_KEY` - Секретный ключ S3
- `S3_BUCKET_NAME` - Имя бакета
- `S3_PUBLIC_URL` - Публичный URL бакета для формирования ссылок

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

### Управление комнатами и сообществами (Communities)
```
Frontend (PortalChatScreen)
  → GET /api/v1/rooms
    → Go Backend (rooms_handler.go)
      → PostgreSQL (fetch rooms/communities)
        → Frontend (список активных чатов)
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
   - Управление сообществами и комнатами (замена моков в `PortalChatScreen.tsx`)

5. **Перспективные идеи (Social & Community)**:
   - **📢 Каналы вещания**: Создание комнат "только для чтения" для новостей и анонсов.
   - **📍 Гео-чаты**: Поиск и отображение комнат на основе местоположения пользователя.
   - **🤖 AI-модератор**: Внедрение AI в групповые чаты для помощи участникам и модерации.
   - **📊 Опросы (Polls)**: Интерактивные голосования внутри сообществ.

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

## Gemini API Integration (Chat)

### Обзор
Система интегрирует Google Gemini API для чата с многоуровневым fallback механизмом, обеспечивающим высокую доступность сервиса.

### Архитектура fallback

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GEMINI FALLBACK CHAIN                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   gemini-2.5-flash + Key 1                                         │
│         ↓ (429/error)                                               │
│   gemini-2.5-flash + Key 2                                         │
│         ↓ (429/error)                                               │
│   gemini-2.5-flash + Key 3                                         │
│         ↓ (all keys exhausted)                                      │
│   gemini-2.5-flash-lite + Key 1                                    │
│         ↓ (429/error)                                               │
│   gemini-2.5-flash-lite + Key 2                                    │
│         ↓ (429/error)                                               │
│   gemini-2.5-flash-lite + Key 3                                    │
│         ↓ (all Gemini exhausted)                                    │
│   OpenAI (RVFreeLLM proxy)                                         │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Компоненты

#### 1. GeminiService (`server/internal/services/gemini_service.go`)
- **Ротация ключей**: Автоматическое переключение между 3 API ключами
- **Fallback моделей**: При исчерпании лимитов gemini-2.5-flash → gemini-2.5-flash-lite
- **Формат запроса**: Использует заголовок `X-goog-api-key` для аутентификации
- **Конвертация**: Преобразует OpenAI-формат в Gemini-формат и обратно

#### 2. Cloudflare Worker Proxy (`GEMINI_BASE_URL`)
- **URL**: `https://mute-waterfall-ef1e.makstreid.workers.dev`
- **Назначение**: Проксирование запросов к `generativelanguage.googleapis.com` для обхода региональных ограничений
- **Функции**:
  - Передача заголовка `X-goog-api-key`
  - CORS обработка
  - Проксирование изображений (параметр `?url=`)

#### 3. AutoMagic Routing (`server/internal/handlers/chat.go`)
- **Приоритет**: Gemini модели (provider=Google) имеют наивысший приоритет
- **Fallback**: При ошибках Gemini автоматически переключается на OpenAI

### Переменные окружения

```env
# Primary Gemini key (используется первым)
GEMINI_API_KEY=

# Backup keys (автоматический fallback)
GEMINI_API_KEY_BACKUP_1=
GEMINI_API_KEY_BACKUP_2=

# Proxy URL (Cloudflare Worker)
GEMINI_BASE_URL=
```

### Поддерживаемые модели (2025)

| Модель | Статус | Описание |
|--------|--------|----------|
| `gemini-2.5-flash` | ✅ Активна | Основная рабочая модель, высокая скорость |
| `gemini-2.5-flash-lite` | ✅ Активна | Лёгкая версия, fallback модель |
| `gemini-2.0-flash` | ⚠️ Лимиты | Может быть исчерпана на Free Tier |
| `gemini-3-*` | ❌ Preview | Ещё не доступны через API |

### Автоматический Seed моделей

При запуске сервера (`SeedGeminiModels()` в `database/seed.go`) автоматически добавляются модели Gemini в базу данных с включённым AutoRouting.

### Cloudflare Worker Code

```javascript
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 1. CORS Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-goog-api-key',
        },
      });
    }

    // 2. Image Proxy (with User-Agent to avoid 403)
    const proxyUrl = url.searchParams.get('url');
    if (proxyUrl) {
      try {
        const imageResponse = await fetch(proxyUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });
        
        const newHeaders = new Headers();
        newHeaders.set('Access-Control-Allow-Origin', '*');
        newHeaders.set('Content-Type', imageResponse.headers.get('Content-Type') || 'image/webp');
        
        return new Response(imageResponse.body, {
          status: imageResponse.status,
          headers: newHeaders
        });
      } catch (e) {
        return new Response('Proxy Error: ' + e.message, { status: 500 });
      }
    }
    
    // 3. Gemini API Proxy  
    if (url.pathname.startsWith('/v1beta/')) {
        url.hostname = 'generativelanguage.googleapis.com';
        
        const headers = new Headers(request.headers);
        headers.set('Content-Type', 'application/json');
        const apiKey = request.headers.get('X-goog-api-key');
        if (apiKey) headers.set('X-goog-api-key', apiKey);

        const body = request.method === 'POST' ? await request.text() : null;
        const response = await fetch(url.toString(), {
          method: request.method,
          headers: headers,
          body: body,
        });

        const respHeaders = new Headers(response.headers);
        respHeaders.set('Access-Control-Allow-Origin', '*');

        return new Response(await response.blob(), {
          status: response.status,
          headers: respHeaders,
        });
    }
    
    return new Response('Not Found', { status: 404 });
  },
};
```

### Логирование

В логах сервера можно отслеживать работу Gemini:

```
[Gemini] Attempting direct Gemini API for model: gemini-2.5-flash
[GeminiService] Success with model gemini-2.5-flash, key index 0
[Gemini] All Gemini keys failed for gemini-2.5-flash: ... Falling back to OpenAI proxy.
```

### Админка

- **Settings → AI & API**: Поля для управления 3 Gemini ключами
- **AI Models**: Отображение Gemini моделей с возможностью включения/отключения

## Последние изменения и исправления (Январь 2026)

### 1. Исправление интеграции S3 (Timeweb Cloud)
*   **Ошибка**: `SignatureDoesNotMatch` (403 Forbidden). Наблюдалась из-за использования ключей от протокола Swift вместо S3.
*   **Решение**: В файле `.env` бэкенда актуализирован `S3_SECRET_KEY`.
*   **Результат**: Успешная загрузка голосовых сообщений и изображений в облако Timeweb.

### 2. Оптимизация списков в React (Duplicate Keys)
*   **Ошибка**: `Encountered two children with the same key`. Возникала из-за конфликта ID локальных сообщений и сообщений из БД (ID `3`).
*   **Решение**:
    *   Внедрены префиксы для локальных ID: `ai_`, `user_`, `sys_`, `welcome_`.
    *   В `ChatContext.tsx` добавлена логика предотвращения дублирования при получении одного и того же сообщения одновременно через WebSocket и HTTP response.

### 3. Поддержка медиа в групповых чатах (Rooms)
*   **Проблема**: В `RoomChatScreen.tsx` сообщения отображались только как текст (URL ссылки на файлы).
*   **Решение**:
    *   Обновлен маппинг сообщений в `ChatContext` и `RoomChatScreen` для поддержки поля `type`.
    *   Добавлена отрисовка `AudioPlayer`, `Image` и `Document` в списке сообщений рума.
    *   Теперь голосовые сообщения проигрываются прямо в чате групповых комнат.

### 4. Исправление React Native Release Build (Январь 2026)
*   **Проблема**: APK собирался успешно, но при запуске на телефоне приложение мгновенно закрывалось (crash).
*   **Ошибки**:
    *   `com.facebook.soloader.B: couldn't find DSO to load: libreanimated.so`
    *   `Missing class com.facebook.proguard.annotations.DoNotStrip` при включении ProGuard
*   **Корневые причины**:
    1. **Неверная конфигурация ABI**: `reactNativeArchitectures` в `gradle.properties` был установлен только на `armeabi-v7a` (32-bit)
    2. **Отключен ProGuard**: `enableProguardInReleaseBuilds = false` в `app/build.gradle`
    3. **Отсутствие ProGuard правил**: Missing keep rules для React Native классов
*   **Решение**:
    1. **Изменение ABI архитектур** (`frontend/android/gradle.properties:34`):
        ```gradle
        reactNativeArchitectures=arm64-v8a,x86_64  # Было: armeabi-v7a
        ```
    2. **Включение ProGuard** (`frontend/android/app/build.gradle:8`):
        ```gradle
        def enableProguardInReleaseBuilds = true  # Было: false
        ```
    3. **Добавление ProGuard правил** (`frontend/android/app/proguard-rules.pro`):
        ```proguard
        -keep class com.facebook.react.** { *; }
        -dontwarn com.facebook.react.**
        -dontwarn com.facebook.proguard.annotations.**
        -keep class com.facebook.proguard.annotations.** { *; }
        -keep class com.facebook.hermes.** { *; }
        -keep class com.facebook.jsi.** { *; }
        ```
    4. **Обновление ABI фильтров** (`frontend/android/app/build.gradle:80-82`):
        ```gradle
        ndk {
            abiFilters 'arm64-v8a', 'x86_64'  # Было: 'armeabi-v7a', 'arm64-v8a'
        }
        ```
    5. **Удаление проблемного codegenConfig** из `package.json` (конфликтовал с React Native 0.76.5)
*   **Результат**:
    *   APK успешно собирается (30 MB)
    *   Приложение корректно запускается на Android устройствах
    *   Google Play принимает APK (64-bit требование выполнено)
*   **Дополнительные исправления для стабильности**:
    *   Добавлен `resolutionStrategy` для устранения конфликтов версий зависимостей
    *   Настроены `packagingOptions` для корректной упаковки .so файлов
    *   Исключен `com.facebook.yoga:proguard-annotations` (падает из react-native 0.76)

### 5. Переезд на новый S3 (Февраль 2026)
*   **Событие**: Миграция хранилища медиа-файлов с Timeweb Cloud на FirstVDS.
*   **Что сделано**:
    *   Обновлены настройки `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY` и `S3_REGION` in `.env`.
    *   Создан профиль для Cyberduck (`server/s3profil/firstvds-s3.cyberduckprofile`) для удобного управления файлами.
    *   Конфигурация бэкенда сохранена в Path-Style режиме для совместимости с FirstVDS.

## Design System: VedaMatch "Liquid Glass" (Февраль 2026)

В феврале 2026 года в проект была внедрена новая дизайн-система для разделов **Marketplace (Services)** и **Wallet**, целью которой является создание ощущения премиального, "дорогого" и технологичного продукта.

### 1. Концепция: Liquid Glass
Дизайн сочетает в себе эстетику глассморфизма (стеклянные поверхности, размытие, прозрачность) с элементами роскоши и ведической тематики.

### 2. Визуальный стиль
- **Атмосфера**: Глубокое темное пространство с акцентами из "жидкого золота".
- **Эффекты**: 
    - Backdrop Blur (размытие фона).
    - Тонкие границы (1px) с легким свечением.
    - Многослойность и Z-глубина.
    - Скругления углов: 24px - 32px для крупных карточек.

### 3. Цветовая палитра
| Роль | HEX код | Описание |
|------|---------|----------|
| Background | `#0a0a14` | Глубокий космический темный |
| Accent/Luxury | `#F59E0B` | Янтарное золото (Laxmi Gold) |
| Card Surface | `rgba(255,255,255,0.04)` | Прозрачное стекло |
| Success | `#4CAF50` | Изумрудный доход |
| Danger | `#F44336` | Рубиновый расход |

### 4. Типографика
- **Headers (Заголовки)**: `Cinzel-Bold` — подчеркивает премиальность и ведические корни проекта.
- **Body (Текст)**: `Montserrat` / `Inter` — обеспечивает высокую читаемость и современный вид.

### 5. Ключевые компоненты
- **Service Card**: Переработанная карточка с увеличенным радиусом (24px), стеклянными бейджами рейтинга и акцентированной ценой.
- **Wallet Balance**: Иммерсивная золотая карта с shimmer-эффектом и встроенной аналитикой.
- **Discovery Icons**: Круглые категории с неоновой подсветкой выбранного состояния.
- **Marketplace Header**: Кастомный заголовок с парящим поиском и прозрачной кнопкой баланса.

Авторизация:
ВКонтакте
для проджект весрии
<div>
  <script nonce="csp_nonce" src="https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js"></script>
  <script nonce="csp_nonce" type="text/javascript">
    if ('VKIDSDK' in window) {
      const VKID = window.VKIDSDK;

      VKID.Config.init({
        app: 54418465,
        redirectUrl: 'https://api.vedamatch.ru/auth/vk/callback',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '', // Заполните нужными доступами по необходимости
      });

      const oneTap = new VKID.OneTap();

      oneTap.render({
        container: document.currentScript.parentElement,
        showAlternativeLogin: true
      })
      .on(VKID.WidgetEvents.ERROR, vkidOnError)
      .on(VKID.OneTapInternalEvents.LOGIN_SUCCESS, function (payload) {
        const code = payload.code;
        const deviceId = payload.device_id;

        VKID.Auth.exchangeCode(code, deviceId)
          .then(vkidOnSuccess)
          .catch(vkidOnError);
      });
    
      function vkidOnSuccess(data) {
        // Обработка полученного результата
      }
    
      function vkidOnError(error) {
        // Обработка ошибки
      }
    }
  </script>
</div>
для DEV версии 

<div>
  <script nonce="csp_nonce" src="https://unpkg.com/@vkid/sdk@<3.0.0/dist-sdk/umd/index.js"></script>
  <script nonce="csp_nonce" type="text/javascript">
    if ('VKIDSDK' in window) {
      const VKID = window.VKIDSDK;

      VKID.Config.init({
        app: 54418465,
        redirectUrl: 'http://localhost',
        responseMode: VKID.ConfigResponseMode.Callback,
        source: VKID.ConfigSource.LOWCODE,
        scope: '', // Заполните нужными доступами по необходимости
      });

      const floatingOneTap = new VKID.FloatingOneTap();

      floatingOneTap.render({
        appName: 'VedamatchAI',
        showAlternativeLogin: true
      })
      .on(VKID.WidgetEvents.ERROR, vkidOnError)
      .on(VKID.FloatingOneTapInternalEvents.LOGIN_SUCCESS, function (payload) {
        const code = payload.code;
        const deviceId = payload.device_id;

        VKID.Auth.exchangeCode(code, deviceId)
          .then(vkidOnSuccess)
          .catch(vkidOnError);
      });
    
      function vkidOnSuccess(data) {
        floatingOneTap.close();
        
        // Обработка полученного результата
      }
    
      function vkidOnError(error) {
        // Обработка ошибки
      }
    }
  </script>
</div>

## Архитектура WebRTC Видеозвонков (Январь 2026)

Система видеозвонков в Rag Agent построена на базе протокола WebRTC и обеспечивает P2P связь между пользователями с гарантированным обходом NAT через собственный TURN-сервер.

### 1. Стек технологий
- **Клиент**: `react-native-webrtc` для захвата медиа и управления PeerConnection.
- **Аудио**: `react-native-incall-manager` для управления режимами динамика/гарнитуры.
- **Сигналинг**: WebSocket (существующий Hub в Go backend).
- **Relay**: Coturn (STUN/TURN сервер) для пробивки NAT.
- **Backend**: Go (Fiber) для генерации временных учетных данных TURN (REST API).

### 2. Схема взаимодействия

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│   Caller     │          │   Backend    │          │   Callee     │
│ (App/React)  │          │ (Go/Socket)  │          │ (App/React)  │
└──────┬───────┘          └──────┬───────┘          └──────┬───────┘
       │                         │                         │
       │ 1. Get TURN Credentials │                         │
       ├────────────────────────>│                         │
       │ <──────────────────────┤│                         │
       │                         │                         │
       │ 2. Send OFFER (WS)      │                         │
       ├────────────────────────>│                         │
       │                         │ 3. Forward OFFER (WS)   │
       │                         ├────────────────────────>│
       │                         │                         │
       │                         │ 4. ACCEPT & Create Ans. │
       │                         │<────────────────────────┤
       │ 5. Forward ANSWER (WS)  │                         │
       │<────────────────────────┤                         │
       │                         │                         │
       │ 6. Exchange ICE Cand.   │                         │
       │<───────────────────────>│<───────────────────────>│
       │                         │                         │
       │         7. P2P Direct Media (UDP)                 │
       │<═════════════════════════════════════════════════>│
       │         (or via TURN: 45.150.9.229)               │
```

### 3. Компоненты системы

#### A. Signaling (WebSocket Hub)
Передает JSON-сообщения между участниками звонка:
- `offer`: Содержит SDP оффера.
- `answer`: Содержит SDP ответа.
- `candidate`: ICE-кандидаты для поиска оптимального пути связи.
- `hangup`: Завершение вызова.

#### B. TURN Server (Coturn)
- **IP**: `45.150.9.229` (Порт 3478 UDP/TCP).
- **AUTH**: REST API Auth (Time-limited credentials). 
- **Secret**: Задан в `.env` (бэкенд) и `docker-compose.prod.yml`.
- **Режим**: `network_mode: host` в Docker для прямой работы с портами 49152-49162.

#### C. Backend Logic (`server/internal/handlers/turn_handler.go`)
Реализует генерацию HMAC-SHA1 подписи для временных пользователей:
- Формат Username: `timestamp:userID`
- Пароль: HMAC-SHA1 от Username с использованием `TURN_SECRET`.

#### D. Client Logic (`webRTCService.ts`)
- **Multi-STUN Strategy**: Используется список из Google и российских серверов (Sipnet, Chathelp, Comtube) для обхода региональных блокировок.
- **Track Handling**: Автоматическое объединение приходящих аудио и видео треков в один `MediaStream`.
- **Race Condition Prevention**: Буферизация ICE-кандидатов до установки `RemoteDescription`.

### 4. Оптимизация для РФ
В связи с нестабильностью Google STUN (stun.l.google.com), в конфигурацию ICE добавлены локальные узлы:
- `stun:stun.sipnet.ru:3478`
- `stun:stun.chathelp.ru:3478`
- `stun:stun.comtube.ru:3478`

### 5. Конфигурация Docker (Coturn)
```yaml
  coturn:
    image: coturn/coturn
    network_mode: host
    environment:
      - EXTERNAL_IP=45.150.9.229
      - LISTENING_PORT=3478
      - MIN_PORT=49152
      - MAX_PORT=49162
      - STATIC_AUTH_SECRET=${TURN_SECRET}
      - REALM=vedamatch.ru
```

## Сервис Карт (Map Service)

В январе 2026 года в проект был интегрирован сервис карт на собственной архитектуре, заменивший зависимость от Google Maps. Это решение обеспечивает независимость от вендора, совместимость с web-технологиями и гибкую настройку отображения.

### 1. Стек технологий

- **Frontend (Map View)**: `react-native-webview` + Leaflet.js
- **Map Provider**: Geoapify (Tile Layer, Autocomplete, Reverse Geocoding)
- **Backend Proxy**: Go (Fiber) для проксирования запросов к Geoapify API
- **Map Library**: Leaflet.js 1.9.4 (загружается через CDN)
- **Clustering**: Leaflet.markercluster (для группировки маркеров)

### 2. Архитектура взаимодействия

```
┌─────────────────┐       HTTPS       ┌─────────────────┐       HTTPS       ┌─────────────────┐
│ React Native    │ <───────────────> │    Go Backend   │ <───────────────> │  Geoapify API   │
│ (WebView)       │    API Proxy      │ (map_handler.go)│    API Key        │ (Maps/Search)   │
└────────┬────────┘                   └────────┬────────┘                   └─────────────────┘
         │                                     │
         │ JS Injection (postMessage)          │
         ▼                                     │
┌─────────────────┐                            │
│ Leaflet Map     │                            │
│ (HTML/CS/JS)    │                            │
└─────────────────┘                            │
                                               │
                                      ┌────────┴────────┐
                                      │   PostgreSQL    │
                                      │ (Marker Data)   │
                                      └─────────────────┘
```

### 3. Компоненты

#### A. Frontend (`frontend/screens/portal/map/MapGeoapifyScreen.tsx`)
- **WebView**: Отрисовывает HTML-контент карты.
- **Двусторонняя связь**:
    - **App -> Map**: `injectJavaScript()` (смещение камеры, обновление фильтров, результаты поиска).
    - **Map -> App**: `onMessage()` (клики по маркерам, изменение границ карты map bounds).
- **Поиск**: Реализован через нативный `TextInput` поверх карты. При выборе результата карта программно перемещается (`map.setView`) и ставит временный маркер.

#### B. Backend Proxy (`server/internal/handlers/map_handler.go`)
Backend выступает шлюзом для всех гео-запросов, скрывая API ключ Geoapify от клиента.

- `GET /api/map/config`: Возвращает URL тайлов и атрибуцию.
- `GET /api/map/summary`: Агрегированные данные для кластеризации (оптимизация производительности).
- `GET /api/map/markers`: Детальная информация о маркерах в видимой области (viewport).
- `GET /api/map/autocomplete`: Прокси для поиска адресов (Geoapify Autocomplete API).

#### C. Geoapify Integration (`server/internal/services/map_service.go`)
- **Tiles**: Используется стиль `osm-bright` (или `osm-carto` как fallback).
- **Autocomplete**: Поиск с поддержкой `bias=proximity` (приоритет результатов рядом с пользователем).
- **Geocoding**: Автоматическое определение координат по названию города для профилей пользователей.

### 4. Особенности реализации

*   **Кластеризация**: Все маркеры группируются на клиенте (Leaflet) для производительности. Цвета кластеров динамически меняются в зависимости от преобладающего типа контента (Users=Фиолетовый, Shops=Зеленый, Ads=Красный).
*   **Search UX**:
    *   Поиск реализован нативно ("над картой").
    *   При выборе адреса ставится временный оранжевый маркер.
    *   Клик в любое место карты очищает поиск.
*   **Оффлайн-устойчивость**: Базовая конфигурация карты кешируется, но тайлы требуют интернета.

### 5. Переменные окружения (Backend)
- `MAP_GEOAPIFY_KEY`: API ключ от Geoapify Project.
- `MAP_STYLE`: Стиль карты (по умолчанию `osm-bright`).

## Библиотека Скриптур: Оптимизация и Офлайн (Январь 2026)

Система электронной библиотеки была значительно переработана для обеспечения стабильной работы с большими каноническими текстами в условиях нестабильного соединения.

### 1. Пакетная загрузка (Batch Export)
- **Метод**: Внедрена система экспорта всей книги за один запрос на язык (`/library/books/{code}/export`).
- **Проблема**: Ранее скачивание происходило поглавно, что вызывало ошибки "Too Many Requests" и занимало до 10 минут для больших книг.
- **Результат**: Время офлайн-сохранения сократилось до нескольких секунд. Устранена нагрузка на API.

### 2. Поддержка Песен (Cantos)
- **Архитектура**: Модель данных и API теперь поддерживают поле `canto`.
- **Офлайн-хранилище**: В IndexedDB (PWA) и RNFS (Mobile) ключи хранения обновлены на формат `${canto}-${chapter}`. Это критически важно для книг вроде "Шримад-Бхагаватам", где номера глав повторяются в разных песнях.
- **Навигация**: Экран чтения (Reader) теперь корректно переключает главы с учетом текущей песни при переходах "Вперед/Назад".

### 3. Унификация отрисовки Санскрита
- **Logic Sync**: В PWA версии (Next.js) логика отображения Devanagari и Transliteration приведена в соответствие с мобильной версией. 
- **Fix**: Разделены условия отрисовки. Теперь транслитерация (латиница/кириллица санскрита) отображается даже если само письмо Деванагари отсутствует в базе для конкретного стиха.

### 4. Улучшение UX Загрузок (Mobile)
- **Interaction**: Иконки статуса скачивания на главной странице библиотеки стали интерактивными кнопками.
- **Progress**: Добавлена детальная индикация стадий загрузки (загрузка структуры -> экспорт данных -> запись в файловую систему).
- **Cleanup**: Реализована возможность удаления скачанных книг для освобождения места на устройстве.

## Анти-мигание UI и плавность обновлений (Февраль 2026)

Для экранов с фото-обоями и частыми state-обновлениями (чат, портал) зафиксирован единый набор практик, чтобы убрать моргание фона, дергание списка и резкие скролл-анимации.

### 1. Стабильный рендер фона без remount
- **Проблема**: внутренний компонент-обертка фона, объявленный внутри `render`, меняет identity на каждом рендере и может размонтировать/монтировать subtree.
- **Практика**: не рендерить `<BackgroundWrapper />` как отдельный inner-component. Использовать обычную функцию, которая возвращает JSX-обертку (или вынесенный внешний компонент).
- **Результат**: исчезает кратковременный "белый кадр" и скачки при обновлении данных.

### 2. Стабильный `ImageBackground` source + кэш
- **Практика**:
  - мемоизировать источник: `{ uri, cache: 'force-cache' }` через `useMemo`;
  - для удаленных URL вызывать `Image.prefetch(url)` заранее;
  - на Android отключать fade при смене/перерисовке: `fadeDuration={0}`.
- **Основание**: рекомендации React Native docs (`Image.prefetch`, `cache` strategy).

### 3. Не анимировать автоскролл во время upload
- **Проблема**: при загрузке медиа частые изменения высоты списка + animated `scrollToEnd` создают "слайд/рывки".
- **Практика**:
  - коалесцировать `onContentSizeChange` через `requestAnimationFrame`;
  - при `isUploading=true` использовать `scrollToEnd({ animated: false })`.

### 4. Снижение лишних ререндеров от таймеров записи
- **Проблема**: слишком частое обновление таймера записи вызывает лишние перерисовки input/chat.
- **Практика**: обновлять таймер записи раз в 1 секунду (достаточно для UX), а не чаще.

### 5. Где уже применено в коде
- `frontend/screens/ChatScreen.tsx`: стабильный image background, prefetch, `fadeDuration={0}`.
- `frontend/screens/portal/PortalMainScreen.tsx`: такой же стабильный паттерн для главной портала.
- `frontend/components/chat/MessageList.tsx`: мягкий автоскролл без анимации в upload-состоянии.
- `frontend/components/chat/AudioRecorder.tsx`: уменьшена частота тиков таймера.

### 6. Чеклист для новых экранов с обоями
1. Не создавать inner-компоненты-обертки внутри `render`.
2. Мемоизировать `Image`/`ImageBackground` source.
3. Prefetch remote background до показа экрана.
4. Ставить `fadeDuration={0}` для `ImageBackground` с частыми обновлениями.
5. Не запускать тяжелые анимации в момент upload/refresh.

## Оптимизация Портала и Обоев (Февраль 2026)

Для портала внедрены дополнительные визуальные и технические улучшения, решающие проблемы читаемости и плавности при использовании динамических фонов.

### 1. Контрастность текста (Label Pill)
- **Проблема**: Белый текст под иконками сервисов и папок становился нечитаемым на светлых или пёстрых фоновых изображениях.
- **Решение**: Добавление полупрозрачного тёмного контейнера (`labelPill`) вокруг текста.
- **Реализация**:
    - Контейнер: `backgroundColor: 'rgba(0,0,0,0.45)'`, `borderRadius: 8`.
    - Условие: Применяется автоматически только при `portalBackgroundType === 'image'`.
    - Компоненты: `PortalIcon.tsx`, `PortalFolder.tsx`.

### 2. Бесшовное слайд-шоу (Double-Buffer Transition)
- **Проблема**: При смене слайдов (обоев) возникала кратковременная вспышка ("flash") или "прыжок" изображения из-за одновременной смены источника в нижнем слое и исчезновения верхнего.
- **Решение**: Система с двумя слоями и отложенной очисткой.
- **Технические детали**:
    - **Предзагрузка (Prefetch)**: Следующее изображение загружается в кэш через `Image.prefetch(url)` до начала анимации fade.
    - **Двойной буфер**: Новый слайд отрисовывается в верхнем слое с `opacity: 0`, затем плавно появляется до `opacity: 1`.
    - **requestAnimationFrame**: После завершения анимации сначала обновляется нижний (основной) слой, и только через один кадр (через `requestAnimationFrame`) верхний слой сбрасывается. Это гарантирует отсутствие "пустых" кадров при ротации слоёв.
- **Файлы**: `screens/portal/PortalMainScreen.tsx`.

## SFU Room Calls (LiveKit Self-Hosted) (Февраль 2026)

### 1. Зачем ушли от room P2P
- Старая room-видеосвязь была основана на single-peer `RTCPeerConnection` в клиенте и custom WS signaling (`room_offer/room_answer/...`), что не масштабируется на большие комнаты.
- Новая цель: стабильные комнаты до 50 участников с управляемым качеством и предсказуемой нагрузкой на мобильные устройства.

### 2. Новая схема компонентов
```
RN App (RoomChat/RoomVideoBar)
  ├─ GET/POST /api/rooms/:id/sfu/*  -> Go API (auth + membership + token issue)
  └─ connect(wss://LIVEKIT_WS_URL, token) -> LiveKit SFU

Go API
  ├─ проверка доступа в комнату (owner/admin/member)
  ├─ выдача short-lived LiveKit JWT
  └─ метрики/логи room_sfu_token_*

LiveKit SFU
  ├─ signaling/media relay
  └─ dynacast + adaptive stream + simulcast
```

### 3. Auth/token flow
1. Клиент запрашивает `GET /api/rooms/:id/sfu/config`.
2. Клиент запрашивает `POST /api/rooms/:id/sfu/token`.
3. Backend проверяет membership через room access layer.
4. Backend подписывает LiveKit JWT (HS256):
   - `iss=LIVEKIT_API_KEY`
   - `sub=user-<id>`
   - `video.room=room-<roomID>`
   - `video.roomJoin=true`
   - `exp` короткий TTL (по умолчанию 15 минут).
5. Клиент подключается к `LIVEKIT_WS_URL` с токеном.

### 4. Identity model
- LiveKit room: `room-<roomID>`
- Participant identity: `user-<userID>`
- Metadata: `{"role":"owner|admin|member","roomId":<id>, ...whitelisted client metadata}`

### 5. Media policy для 50 участников
- `dynacastEnabled=true`
- `adaptiveStreamEnabled=true`
- `simulcastEnabled=true`
- Ограничение подписок на клиенте: `maxSubscriptions` (дефолт 9 видимых потоков/карточек одновременно).

### 6. Default permissions/UX
- При входе в room call:
  - микрофон выключен;
  - камера выключена.
- Публикация аудио/видео только явным действием пользователя.

### 7. Новые backend API
- `GET /api/rooms/:id/sfu/config`
- `POST /api/rooms/:id/sfu/token`

### 8. Конфигурация окружения
- Feature flags:
  - `ROOM_SFU_ENABLED`
  - `ROOM_SFU_PROVIDER`
  - `ROOM_SFU_REQUIRE_MEMBERSHIP`
  - `ROOM_SFU_MAX_PARTICIPANTS`
  - `ROOM_SFU_MAX_SUBSCRIPTIONS`
- LiveKit:
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
  - `LIVEKIT_WS_URL`

### 9. Наблюдаемость
- Метрики:
  - `room_sfu_token_issued_total`
  - `room_sfu_token_denied_total`
  - `room_sfu_token_error_total`
- Структурные логи выдачи токена:
  - `room_id`, `actor_id`, `actor_role`, `provider=livekit`.

## Migration Notes (SFU rollout)

1. Coexistence:
- P2P `webRTCService` и old call screen остаются для point-to-point сценариев.
- RoomChat переведён на SFU token/config flow.

2. Rollout:
- По умолчанию `ROOM_SFU_ENABLED=false`.
- Включение на staging/internal-room allowlist, затем поэтапный production rollout.

3. Rollback:
- Достаточно выключить `ROOM_SFU_ENABLED` на backend.
- Клиент покажет controlled unavailable state без краша.

## Unified Service Support Collection (Ledger Standard) (Февраль 2026)

### 1. Принцип
- Любой сервисный сбор (`Rooms`, `Seva`, и будущие сервисы) проходит через единый donation pipeline (`/api/charity/donate`) и обязательно получает атрибуцию источника.
- Баланс не хранится как "одно число": источник и движение фиксируются в проводках `lkm_ledger_entries`.

### 2. Обязательные атрибуты источника
- `sourceService` — откуда пришел сбор (`rooms|seva|travel|other`).
- `sourceTrigger` — каким UX-сценарием инициирован сбор (`support_prompt|donate_modal|campaign_banner|manual`).
- `sourceContext` — сериализованный контекст (например `roomId`, `screen`, `feature`).

Если старый клиент не прислал атрибуты, backend нормализует значения в `unknown` и не ломает совместимость.

### 3. Routing rule (service -> fund account)
- `rooms` -> `rooms_fund`
- `seva` -> `seva_fund`
- fallback -> `platform_fund`

Для platform contribution по донату создаются двойные проводки:
1. debit `user_wallet`
2. credit `<service>_fund`

Возврат (refund) пишет обратные проводки, чтобы аналитика по сервисам оставалась консистентной.

### 4. Config resolution и fallback
- Канонический источник конфигурации поддержки сервиса: `system_settings` (`support.<service>.*`).
- Fallback: env (`<SERVICE>_SUPPORT_*`), например:
  - `ROOMS_SUPPORT_PROJECT_ID`
  - `SEVA_SUPPORT_PROJECT_ID`
- Приоритет: **DB settings -> env -> disabled**.

### 5. Idempotency и reconciliation
- Бизнес-идентификатор для donation проводок: `tx_group_id = donation:<donationId>`.
- Для refund: `tx_group_id = donation_refund:<donationId>`.
- Сверка выполняется через admin ledger API с фильтрами по `service/trigger/project/account`.

### 6. Onboarding checklist для нового сервиса
1. Создать charity project для сервиса (projectId выбирается в админке).
2. Заполнить `support.<service>.project_id` и базовые `support.<service>.*` настройки.
3. Передавать `sourceService + sourceTrigger + sourceContext` в `/charity/donate`.
4. Проверить, что проводки пишутся в нужный service fund.
5. Прогнать интеграционные тесты (`support config`, donation attribution, ledger filters/export).

### 7. Finance RBAC
- Введены granular admin permissions:
  - `finance_manager` — создание заявок на списание, просмотр сводки/журнала.
  - `finance_approver` — подтверждение/отклонение заявок, просмотр сводки/журнала.
- `superadmin` имеет implicit bypass и может управлять выдачей/отзывом permissions.
- Назначения хранятся в `admin_permission_grants` и управляются через:
  - `GET /api/admin/funds/permissions`
  - `GET /api/admin/funds/permissions/me`
  - `POST /api/admin/funds/permissions/grant`
  - `POST /api/admin/funds/permissions/revoke`
