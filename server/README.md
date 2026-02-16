# Rag Agent Server

Go-сервер на Fiber для обработки профилей пользователей и интеграции с RAG системой.

## Быстрый старт

### 1. Установи зависимости

```bash
go mod download
```

### 2. Запусти PostgreSQL (через Docker)

```bash
docker-compose up -d
```

Или вручную:
```bash
docker run -d \
  --name rag-postgres \
  -e POSTGRES_USER=raguser \
  -e POSTGRES_PASSWORD=ragpassword \
  -e POSTGRES_DB=ragdb \
  -p 5435:5432 \
  postgres:15-alpine
```

### 3. Настрой переменные окружения (опционально)

Скопируй `.env.example` в `.env` и измени значения при необходимости:

```bash
cp .env.example .env
```

По умолчанию используются значения:
- DB_HOST=localhost
- DB_PORT=5435
- DB_USER=raguser
- DB_PASSWORD=ragpassword
- DB_NAME=ragdb

### 4. Запусти сервер

```bash
go run cmd/api/main.go
```

Или собери и запусти:

```bash
go build -o server cmd/api/main.go
./server
```

Сервер запустится на `http://localhost:8080`

## API Endpoints

- `POST /api/register` - Регистрация профиля пользователя
- `POST /api/login` - Вход по email
- `GET /api/video-circles` - Лента video-circles (protected)
- `POST /api/video-circles/upload` - Upload + create circle (protected)
- `POST /api/video-circles/:id/interactions` - Реакции/счетчики (protected)
- `POST /api/video-circles/:id/boost` - Применить boost с billing (protected)
- `GET /api/video-tariffs` - Актуальные тарифы boost (public)
- `POST /api/admin/video-tariffs` - Создать тариф (admin)
- `PUT /api/admin/video-tariffs/:id` - Обновить тариф (admin)

Подробная спецификация:

- `/Users/mamu/Documents/vedicai/docs/video-circles-api.md`

## Структура проекта

```
server/
├── cmd/api/main.go          # Точка входа
├── internal/
│   ├── database/            # Подключение к БД
│   ├── handlers/            # HTTP хендлеры
│   ├── models/              # Модели данных
│   └── services/            # Бизнес-логика (RAG)
└── go.mod                   # Зависимости
```

## Docker

Собрать образ:
```bash
docker build -t rag-agent-server .
```

Запустить:
```bash
docker run -p 8080:8080 \
  -e DB_HOST=host.docker.internal \
  -e DB_PORT=5435 \
  -e DB_USER=raguser \
  -e DB_PASSWORD=ragpassword \
  -e DB_NAME=ragdb \
  rag-agent-server
```
curl https://generativelanguage.googleapis.com/v1beta/corpora?key=<GEMINI_API_KEY>
    -X POST \
    -H "Content-Type: application/json" \
    -d '{ "display_name": "User Profiles Store" }'
