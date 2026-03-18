#!/bin/bash
# Telegram Webhook Fix via Dokploy API

DOKPLOY_API_KEY="vedamath_appsKnQiYmEXtuKzuZsIWJgAuguaIJTVUXSccEtowjXqqrEgRWRPXoGzJwvGNYrQYPt"
DOKPLOY_URL="https://app.dokploy.com"  # или ваш URL Dokploy

echo "🔧 Telegram Webhook Fix via Dokploy API"
echo "======================================="
echo ""

# 1. Получаем список проектов
echo "1. Получаем список проектов..."
PROJECTS=$(curl -s -X GET "$DOKPLOY_URL/api/team/projects" \
  -H "Authorization: Bearer $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json")

echo "$PROJECTS" | jq .

echo ""
echo "2. Найдите проект с сервером (rag-agent-server или server) и введите projectId:"
read -r PROJECT_ID

if [ -z "$PROJECT_ID" ]; then
    echo "❌ projectId не введен"
    exit 1
fi

echo ""
echo "3. Получаем информацию о проекте..."
PROJECT_INFO=$(curl -s -X GET "$DOKPLOY_URL/api/project/$PROJECT_ID" \
  -H "Authorization: Bearer $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json")

echo "$PROJECT_INFO" | jq .

echo ""
echo "4. Обновляем environment variable..."
echo "Введите environment для обновления (например: SUPPORT_TELEGRAM_WEBHOOK_SECRET):"
read -r ENV_KEY

echo "Введите новое значение (оставьте пустым для обнуления):"
read -r ENV_VALUE

# 5. Обновляем проект
echo "5. Обновляем проект..."
curl -s -X PATCH "$DOKPLOY_URL/api/project/$PROJECT_ID" \
  -H "Authorization: Bearer $DOKPLOY_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"env\": \"$ENV_KEY=$ENV_VALUE\"
  }" | jq .

echo ""
echo "✅ Готово!"
echo ""
echo "6. Обновляем webhook в Telegram..."
curl -s -X POST "https://api.telegram.org/bot8433797814:AAFLKdWNLwFQmQNbElU7WGkfySF3gq61xvw/setWebhook" \
  -d "url=https://api.vedamatch.ru/api/integrations/telegram/support/webhook" | jq .

echo ""
echo "7. Проверяем статус..."
sleep 2
curl -s "https://api.telegram.org/bot8433797814:AAFLKdWNLwFQmQNbElU7WGkfySF3gq61xvw/getWebhookInfo" | jq .
