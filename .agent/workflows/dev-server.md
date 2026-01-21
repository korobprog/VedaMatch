---
description: Запуск dev-сервера (backend + admin)
---

# Запуск dev-сервера

## Быстрый старт (рекомендуется)

// turbo-all

1. Подготовка окружения:
```bash
cd c:\Rag-agent
pnpm install
```

2. Запуск бекенда (всегда через go run для актуального кода):
```bash
pnpm run backend
```
или:
```bash
cd server && go run ./cmd/api/main.go
```

3. Запуск админ-панели (в отдельном терминале):
```bash
pnpm run admin
```

## Проверка версии сервера

При запуске сервера в консоли должна отображаться актуальная версия, например:
```
Server Version: 1.6 (Manual CORS Fix)
```

## Решение проблем

### CORS ошибки
Если получаете ошибку `Access-Control-Allow-Origin header contains invalid value ''`:
1. Убедитесь, что сервер запущен через `go run`, а НЕ через `.exe` файлы
2. Проверьте нет ли старых процессов: `Get-Process | Where-Object { $_.ProcessName -match "main|server" }`
3. Убейте старые процессы: `Stop-Process -Name server -Force`
4. Перезапустите: `pnpm run backend`

### Скомпилированные файлы
В папке `server/` могут быть файлы `server.exe`, `main.exe`, `api.exe`.
Они НЕ используются в dev-режиме — всегда запускается `go run` для актуального кода.

Для production сборки:
```bash
cd server
go build -o server.exe ./cmd/api/main.go
```

## Порты
- Backend API: http://localhost:8081
- Admin Panel: http://localhost:3005
- Metro Bundler: http://localhost:8082
