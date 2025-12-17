# Быстрый запуск сервера

## 1. Установи Go (если ещё не установлен)

```bash
# Fedora/RHEL
sudo dnf install golang

# Или скачай с https://go.dev/dl/
```

Проверь установку:
```bash
go version
```

## 2. PostgreSQL уже запущен! ✅

PostgreSQL запущен через Docker Compose на порту `5435`.

Проверить статус:
```bash
docker-compose ps
```

Остановить:
```bash
docker-compose down
```

## 3. Установи зависимости Go

```bash
cd /home/maxim/Documents/Rag-agent/server
go mod download
```

## 4. Запусти сервер

```bash
go run cmd/api/main.go
```

Или используй скрипт:
```bash
./START.sh
```

Сервер будет доступен на: **http://localhost:8081**

## Проверка работы

```bash
# Проверка регистрации
curl -X POST http://localhost:8081/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "karmicName": "Test User",
    "email": "test@example.com",
    "country": "Russia",
    "city": "Moscow",
    "gender": "Male",
    "identity": "Yogi",
    "diet": "Vegetarian",
    "dob": "1990-01-01T00:00:00Z"
  }'
```

## Переменные окружения (опционально)

По умолчанию используются:
- DB_HOST=localhost
- DB_PORT=5435
- DB_USER=raguser
- DB_PASSWORD=ragpassword
- DB_NAME=ragdb

Можешь задать свои через `.env` или экспорт переменных:
```bash
export DB_HOST=localhost
export DB_PORT=5435
go run cmd/api/main.go
```

