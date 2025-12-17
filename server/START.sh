#!/bin/bash

echo "🚀 Запуск Rag Agent Server"
echo ""

# Проверка Go
if ! command -v go &> /dev/null; then
    echo "❌ Go не установлен!"
    echo "Установи Go: https://go.dev/dl/"
    exit 1
fi

# Проверка Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker не установлен!"
    echo "Установи Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Запуск PostgreSQL
echo "📦 Запускаю PostgreSQL..."
docker-compose up -d

# Ждём пока БД поднимется
echo "⏳ Жду пока PostgreSQL запустится..."
sleep 3

# Установка зависимостей
echo "📥 Устанавливаю зависимости Go..."
go mod download

# Запуск сервера
echo "🔥 Запускаю сервер на http://localhost:8081"
echo ""
go run cmd/api/main.go
