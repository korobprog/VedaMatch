# VedaMatch — Проектная документация

## 📋 Обзор проекта

**VedaMatch** — это полномасштабная экосистема для ведического сообщества, объединяющая:
- Мобильное приложение (React Native, TypeScript)
- Backend на Go (Fiber framework)
- Админ-панель (Next.js)
- LKM Wallet (Next.js)
- Микросервисную архитектуру с Docker

**Основной домен**: `vedamatch.ru`

---

## 🏗 Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                        VedaMatch Ecosystem                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Mobile App  │  │  Admin Panel │  │  LKM Wallet  │          │
│  │ React Native │  │   Next.js    │  │   Next.js    │          │
│  │   Port 8082  │  │   Port 3005  │  │   Port 3006  │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                 │                 │                   │
│         └─────────────────┼─────────────────┘                   │
│                           │                                     │
│                           ▼                                     │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Go Backend (Fiber v2)                       │   │
│  │                   Port 8083                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │   │
│  │  │   Chat   │ │  Dating  │ │  Rooms   │ │  Media   │   │   │
│  │  │ Service  │ │ Service  │ │ Service  │ │ Service  │   │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
│         │                 │                 │                   │
│         ▼                 ▼                 ▼                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  PostgreSQL  │  │    Redis     │  │  S3 Storage  │          │
│  │   Port 5435  │  │   Port 6379  │  │  (FirstVDS)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  CoTurn      │  │   LiveKit    │  │  AI APIs     │          │
│  │  Port 3478   │  │  Port 7880   │  │  (External)  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Структура проекта

```
vedicai/
├── frontend/           # React Native мобильное приложение
│   ├── App.tsx
│   ├── screens/        # Экраны приложения
│   ├── components/     # UI компоненты
│   ├── services/       # API сервисы
│   ├── context/        # React Context
│   ├── config/         # Конфигурация
│   └── android/ios/    # Нативные платформы
│
├── server/             # Go backend
│   ├── cmd/api/        # Точка входа
│   ├── internal/
│   │   ├── handlers/   # HTTP обработчики
│   │   ├── services/   # Бизнес-логика
│   │   ├── models/     # GORM модели
│   │   └── database/   # Подключение к БД
│   └── scripts/        # Скрипты (CORS, seed)
│
├── admin/              # Next.js админ-панель
│   ├── src/
│   │   ├── app/        # Next.js App Router
│   │   ├── components/ # UI компоненты
│   │   ├── hooks/      # React hooks
│   │   └── lib/        # Утилиты
│   └── public/
│
├── lkm/                # Next.js LKM Wallet
│   └── src/
│
├── livekit/            # LiveKit конфигурация
├── conductor/          # Вспомогательные сервисы
├── design-system/      # Дизайн-система
│
├── docker-compose.yml        # Dev окружение
├── docker-compose.prod.yml   # Production окружение
├── .env.example              # Шаблон переменных окружения
└── package.json              # Корневые скрипты
```

---

## 🚀 Запуск проекта

### Требования
- **Node.js**: v20+
- **Go**: 1.23+
- **Docker**: 24+
- **pnpm**: 8+
- **Android SDK** (для мобильной разработки)
- **Xcode** (для iOS разработки)

### Быстрый старт (Development)

```bash
# Установка зависимостей
pnpm install

# Запуск всех сервисов (Backend + Admin + Frontend)
pnpm run dev:emulator    # Для Android эмулятора
pnpm run dev:usb         # Для физического устройства через USB
pnpm run dev:ios         # Для iOS симулятора
```

### Отдельный запуск сервисов

```bash
# Backend (Go)
pnpm run backend
# или
cd server && go run cmd/api/main.go

# Admin Panel (Next.js)
pnpm run admin
# или
cd admin && pnpm run dev

# LKM Wallet (Next.js)
pnpm run lkm
# или
cd lkm && npm run dev

# Frontend (React Native Metro)
pnpm run frontend
# или
cd frontend && pnpm run start

# Docker (PostgreSQL, Redis, Server)
docker-compose up -d
```

### Production сборка

```bash
# Android APK
pnpm run build:release

# Docker (production)
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 🔧 Основные команды

| Команда | Описание |
|---------|----------|
| `pnpm run dev:emulator` | Полный запуск для Android эмулятора |
| `pnpm run dev:usb` | Полный запуск для физического Android устройства |
| `pnpm run dev:ios` | Полный запуск для iOS симулятора |
| `pnpm run backend` | Запуск Go backend на порту 8083 |
| `pnpm run admin` | Запуск Admin Panel на порту 3005 |
| `pnpm run lkm` | Запуск LKM Wallet на порту 3006 |
| `pnpm run frontend` | Запуск Metro bundler на порту 8082 |
| `pnpm run android` | Запуск Android приложения |
| `pnpm run ios` | Запуск iOS симулятора |
| `pnpm run clean` | Очистка кэшей и портов |
| `pnpm run build:release` | Сборка release APK |

---

## 🌐 API Endpoints

### Backend (Port 8083)

#### Аутентификация
- `POST /api/register` — Регистрация пользователя
- `POST /api/login` — Вход по email

#### Chat
- `POST /api/v1/chat/completions` — AI чат (OpenAI-compatible)
- `GET /api/v1/models` — Список доступных моделей

#### Dating
- `GET /api/v1/dating/candidates` — Кандидаты для знакомств
- `POST /api/v1/dating/compatibility` — AI совместимость

#### Rooms/Communities
- `GET /api/v1/rooms` — Список комнат
- `POST /api/v1/rooms` — Создание комнаты
- `GET /api/v1/rooms/:id/messages` — Сообщения комнаты

#### Media
- `POST /api/v1/media/upload` — Загрузка файлов (S3)
- `DELETE /api/v1/media/:id` — Удаление файла

#### Profile
- `GET /api/v1/profile` — Получение профиля
- `PUT /api/v1/profile` — Обновление профиля
- `PUT /api/v1/update-location` — Обновление локации

---

## 🔐 Переменные окружения

### Основные (.env)

```env
# AI APIs
API_OPEN_AI=rvf_xxx                    # RVFreeLLM API ключ
GEMINI_BASE_URL=https://mute-waterfall-ef1e.makstreid.workers.dev
GEMINI_CORPUS_ID=xxx
GEMINI_API_KEY=xxx
GEMINI_API_KEY_BACKUP_1=xxx
GEMINI_API_KEY_BACKUP_2=xxx

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=raguser
DB_PASSWORD=ragpassword
DB_NAME=ragdb

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=

# S3 Storage (FirstVDS)
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=default
S3_ACCESS_KEY=xxx
S3_SECRET_KEY=xxx
S3_BUCKET_NAME=vedamatch-media
S3_PUBLIC_URL=https://cdn.vedamatch.ru

# JWT
JWT_SECRET=xxx

# Superadmin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=xxx

# LiveKit (SFU)
LIVEKIT_API_KEY=xxx
LIVEKIT_API_SECRET=xxx
LIVEKIT_WS_URL=wss://livekit.vedamatch.ru

# CoTurn
TURN_EXTERNAL_IP=45.150.9.229
TURN_USER=admin
TURN_PASSWORD=xxx
TURN_REALM=vedamatch.ru
TURN_SECRET=xxx

# Feature Flags
FF_REDIS_RATE_LIMIT=off
FF_HTTP_CONDITIONAL_CACHE=off
FF_CONTACTS_LEGACY_MODE=on
```

---

## 🎨 Дизайн-система "Liquid Glass"

Проект использует премиальную дизайн-систему с элементами глассморфизма:

- **Фон**: Глубокий космический `#0a0a14`
- **Акцент**: Жидкое золото `#F59E0B`
- **Эффекты**: Backdrop blur, стеклянные поверхности, мягкое свечение
- **Типографика**: Cinzel для заголовков (ведическая стилистика)

---

## 🧪 Тестирование

```bash
# Frontend тесты
cd frontend && pnpm test

# Backend тесты
cd server && go test ./...

# Lint
pnpm run lint
```

---

## 📦 Docker сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| `postgres` | 5435 → 5432 | PostgreSQL база данных |
| `redis` | 6379 | Redis кэш и сессии |
| `server` | 8083 → 8080 | Go backend |
| `feed-worker` | - | Worker для ленты новостей |
| `media-worker` | - | Worker для обработки медиа |
| `lkm` | 3006 → 3000 | LKM Wallet |
| `coturn` | 3478 | WebRTC TURN сервер |
| `livekit` | 7880 | SFU для видеозвонков |

---

## 🔧 Troubleshooting

### Android сборка
```bash
# Ошибка: couldn't find DSO to load: libreanimated.so
# Решение: Обновить архитектуры в gradle.properties
reactNativeArchitectures=arm64-v8a,x86_64

# Ошибка: Missing class com.facebook.proguard.annotations.DoNotStrip
# Решение: Включить ProGuard и добавить правила
def enableProguardInReleaseBuilds = true
```

### S3 SignatureDoesNotMatch
- Проверить, что используются S3 ключи (не Swift)
- Убедиться, что регион указан верно (`default` для FirstVDS)

### Gemini API 400 Bad Request
- Проверить регион сервера (Google блокирует РФ)
- Использовать Cloudflare Worker прокси (`GEMINI_BASE_URL`)
- Или настроить HTTP прокси в `rag_service.go`

### Docker контейнеры не запускаются
```bash
# Очистить и пересобрать
docker-compose down -v
docker-compose up -d --build

# Проверить логи
docker-compose logs -f server
```

---

## 📚 Дополнительная документация

- [ARCHITECTURE.md](./ARCHITECTURE.md) — Детальная архитектура системы
- [README.md](./README.md) — Обзор проекта
- [AGENTS.md](./AGENTS.md) — Правила для AI агентов
- [MEMORY.md](./MEMORY.md) — Контекст проекта
- [docs/](./docs/) — Дополнительная документация

---

## 🛠 Технологический стек

### Frontend (Mobile)
- **Framework**: React Native 0.76.5
- **Language**: TypeScript 5
- **Navigation**: React Navigation 6
- **State**: React Context + Hooks
- **Query**: TanStack Query (React Query)
- **i18n**: i18next
- **UI**: Lucide Icons, expo-blur, gradients

### Backend
- **Language**: Go 1.23
- **Framework**: Fiber v2
- **Database**: PostgreSQL 15 (GORM)
- **Cache**: Redis 7
- **Storage**: S3 (FirstVDS)
- **WebSocket**: Fiber WebSocket
- **AI**: Google Gemini, OpenAI-compatible

### Admin & LKM
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4
- **Charts**: Recharts
- **Animation**: Framer Motion

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Docker Compose
- **WebRTC**: CoTurn, LiveKit
- **CI/CD**: GitHub Actions, Dokploy

---

## 📝 Последние изменения (Март 2026)

### Исправление сборки Admin (13 марта 2026)
- **Проблема**: `Cannot find module '@/services/profileService'`
- **Решение**: Добавлен локальный интерфейс `LocationData` в `admin/src/app/profile/page.tsx`
- **Коммит**: `d4f01f24`

### Миграция S3 (Февраль 2026)
- Переезд с Timeweb Cloud на FirstVDS S3
- Обновлены ключи и эндпоинты в `.env`

### Исправление React Native Release (Январь 2026)
- Включен ProGuard для release сборок
- Обновлены ABI фильтры (`arm64-v8a,x86_64`)
- Добавлены ProGuard правила для React Native

---

## 📞 Контакты

**Репозиторий**: `github.com/korobprog/VedaMatch`  
**Домен**: `vedamatch.ru`

---

*Проект находится в активной разработке. Документация обновляется по мере развития системы.*

## Qwen Added Memories
- Dokploy MCP credentials:
- URL: https://dokploy.vedamatch.ru/api
- API Key: vedamath_appSzKpwJoOwaRTYEtfbwFiGkgGbikvaskjOTxxXGnsPzJiKgCZOhdDDPxUFNfvdnwe
- Dokploy MCP API ключ: qwen_appQwLOiePdGlMwjoitSiosgDakETvwMNDiPQItvdMIIQcQjPRwbowqtGBzmQhbGwmx
