-- Telegram Webhook Secret Fix
-- Выполнить на production PostgreSQL сервере

-- Обнулить webhook secret (чтобы проверка отключилась)
INSERT INTO system_settings (key, value, created_at, updated_at)
VALUES ('SUPPORT_TELEGRAM_WEBHOOK_SECRET', '', NOW(), NOW())
ON CONFLICT (key) DO UPDATE SET 
    value = '', 
    updated_at = NOW();

-- Проверить результат
SELECT key, 
       CASE 
           WHEN value = '' THEN '(empty - webhook auth disabled)'
           WHEN value IS NULL THEN '(null)'
           ELSE '*** SET ***'
       END as value_status,
       updated_at
FROM system_settings 
WHERE key = 'SUPPORT_TELEGRAM_WEBHOOK_SECRET';
