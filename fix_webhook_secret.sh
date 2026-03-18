#!/bin/bash
# Telegram Webhook Secret Fix Script
# Выполняет SQL запрос для обнуления webhook secret

echo "🔧 Fix Telegram Webhook Secret"
echo "=============================="
echo ""

# Подключение к серверу и выполнение SQL
echo "1. Подключаемся к серверу и выполняем SQL..."
ssh root@45.150.9.229 << 'ENDSSH'
echo "Находим PostgreSQL контейнер..."
POSTGRES_CONTAINER=$(docker ps | grep postgres | grep -v grep | awk '{print $1}' | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ PostgreSQL контейнер не найден!"
    exit 1
fi

echo "✅ Найден контейнер: $POSTGRES_CONTAINER"
echo ""
echo "2. Выполняем SQL для обнуления webhook secret..."

docker exec -it $POSTGRES_CONTAINER psql -U raguser -d ragdb -c "
INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES ('SUPPORT_TELEGRAM_WEBHOOK_SECRET', '', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = '', 
    updated_at = NOW();
"

echo ""
echo "3. Проверяем результат..."
docker exec -it $POSTGRES_CONTAINER psql -U raguser -d ragdb -c "
SELECT key, 
       CASE 
           WHEN value = '' THEN '(empty - webhook auth disabled)'
           WHEN value IS NULL THEN '(null)'
           ELSE '*** SET ***'
       END as value_status,
       updated_at
FROM system_settings 
WHERE key = 'SUPPORT_TELEGRAM_WEBHOOK_SECRET';
"

echo ""
echo "✅ Готово!"
ENDSSH

echo ""
echo "4. Обновляем webhook..."
curl -s -X POST "https://api.telegram.org/bot8433797814:AAFLKdWNLwFQmQNbElU7WGkfySF3gq61xvw/setWebhook" \
  -d "url=https://api.vedamatch.ru/api/integrations/telegram/support/webhook" | jq .

echo ""
echo "5. Проверяем статус..."
sleep 2
curl -s "https://api.telegram.org/bot8433797814:AAFLKdWNLwFQmQNbElU7WGkfySF3gq61xvw/getWebhookInfo" | jq .

echo ""
echo "=============================="
echo "Если pending_update_count = 0 и нет last_error_message - бот работает! ✅"
echo "Откройте @vedamatch_bot и нажмите /start для проверки"
