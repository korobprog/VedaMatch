# Telegram Monitoring Automation

## 📋 Обзор

Автоматическая отправка уведомлений и отчетов системы мониторинга в Telegram через бота `@vedamatchmonitoring_bot`.

---

## 🚀 Быстрый старт

### 1. Тестовое сообщение

```bash
cd /Users/mamu/Documents/vedicai/scripts

# Отправить тестовое сообщение
./send_telegram_notification.sh test
```

Если получили сообщение в Telegram - всё работает! ✅

---

## 📤 Типы уведомлений

### 1. Статус системы (по запросу)

```bash
./send_telegram_notification.sh status
```

**Отправляет:**
- Uptime сервера
- Load average
- Использование памяти
- Использование диска
- Статус Docker контейнеров
- Статус сервисов (Grafana, Prometheus, Loki)

### 2. Ежедневный отчет

```bash
./send_telegram_notification.sh daily
```

**Отправляется:** Каждый день в 9:00 AM

### 3. Алерты (автоматически из Grafana)

Настроены через Grafana alerting contact points.

**Срабатывают при:**
- Instance Down (> 1 мин)
- High 5xx Rate (> 2% за 5 мин)
- High Latency P95 (> 800ms за 10 мин)
- Low Disk Space (< 15%)
- Memory Pressure (> 90%)
- Container Restart Spike (> 3 раз за 10 мин)
- Loki Ingestion Errors
- Probe Failed

---

## ⚙️ Настройка

### 1. Конфигурация

**Важно:** Никогда не коммитьте токены в Git!

Переменные окружения должны быть в файле `.env` (не коммитится в git):

```bash
# server/.env (не коммитить!)
TELEGRAM_BOT_TOKEN=8333505498:AAGqOM-8WOcYl7BBmmiEz5eOeQpmuE2cJn4
TELEGRAM_CHAT_ID=-5194955140
GRAFANA_TELEGRAM_BOT_TOKEN=8333505498:AAGqOM-8WOcYl7BBmmiEz5eOeQpmuE2cJn4
GRAFANA_TELEGRAM_CHAT_ID=-5194955140
SERVER_NAME="VedaMatch Production"
```

**Для cron jobs:**
```bash
# В crontab использовать переменные окружения
0 9 * * * TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN TELEGRAM_CHAT_ID=$TELEGRAM_CHAT_ID /path/to/script.sh daily
```

### 2. Автоматизация через Cron

Добавьте в crontab:

```bash
crontab -e
```

Добавьте строки:

```bash
# Daily report at 9:00 AM
0 9 * * * /path/to/vedicai/scripts/send_telegram_notification.sh daily

# Hourly status
30 * * * * /path/to/vedicai/scripts/send_telegram_notification.sh status
```

Или используйте готовый шаблон:

```bash
cat scripts/monitoring-crontab.example
```

### 3. Интеграция с Grafana

Grafana уже настроена для отправки алертов в Telegram.

**Проверка contact point:**

1. Откройте Grafana: `http://localhost:13000`
2. Alerting → Contact points
3. Найдите `telegram`
4. Нажмите "Test" для проверки

**Файл конфигурации:** `infra/monitoring/grafana/provisioning/alerting/contact-points.yml`

---

## 📊 Prometheus Alerts

Алерты настроены в `infra/monitoring/prometheus/alerts.yml`.

**Критические алерты:**
- `InstanceDown` - Сервис недоступен > 1 мин
- `High5xxRate` - > 2% 5xx ошибок за 5 мин
- `DiskLow` - < 15% свободного места на диске
- `ProbeFailed` - HTTP probe не прошла > 2 мин

**Предупреждения:**
- `HighLatencyP95` - P95 латентность > 800ms за 10 мин
- `MemoryPressure` - Использование памяти > 90% за 10 мин
- `ContainerRestartsSpike` - > 3 рестартов контейнера за 10 мин
- `LokiIngestionErrors` - Ошибки записи в Loki

---

## 🔧 Troubleshooting

### Бот не отправляет сообщения

1. Проверьте токен:
   ```bash
   curl "https://api.telegram.org/bot8333505498:AAGqOM-8WOcYl7BBmmiEz5eOeQpmuE2cJn4/getMe"
   ```

2. Проверьте chat_id:
   ```bash
   curl "https://api.telegram.org/bot8333505498:AAGqOM-8WOcYl7BBmmiEz5eOeQpmuE2cJn4/getChat?chat_id=-5194955140"
   ```

3. Проверьте логи:
   ```bash
   tail -f /var/log/vedamatch-telegram.log
   ```

### Grafana не отправляет алерты

1. Проверьте contact point в Grafana UI
2. Проверьте переменные окружения в Docker Compose
3. Перезапустите Grafana:
   ```bash
   docker-compose -f infra/monitoring/docker-compose.monitoring.prod.yml restart grafana
   ```

### Cron не работает

1. Проверьте cron daemon:
   ```bash
   systemctl status cron
   ```

2. Проверьте логи cron:
   ```bash
   grep CRON /var/log/syslog | tail -20
   ```

3. Проверьте права на скрипт:
   ```bash
   ls -la scripts/send_telegram_notification.sh
   ```

---

## 📱 Telegram чат

**Группа:** VedaMatch Monitor  
**Бот:** @vedamatchmonitoring_bot  
**Invite link:** https://t.me/+apipLsR3B280YjIy

---

## 📝 Примеры использования

### Ручная отправка статуса

```bash
./send_telegram_notification.sh status
```

### Отправка кастомного алерта

```bash
ALERT_NAME="Database Connection Lost" \
ALERT_STATUS="firing" \
ALERT_DESCRIPTION="Cannot connect to PostgreSQL for 5 minutes" \
./send_telegram_notification.sh alert
```

### Интеграция с другими скриптами

```bash
#!/bin/bash

# Your monitoring script
if [ some_condition_failed ]; then
    export ALERT_NAME="Custom Alert"
    export ALERT_STATUS="firing"
    export ALERT_DESCRIPTION="Something went wrong"
    /path/to/send_telegram_notification.sh alert
fi
```

---

## 🔐 Безопасность

- Токен бота хранится в `.env` (не коммитить в git!)
- Chat ID только для вашей группы
- Используйте HTTPS для всех API запросов
- Регулярно обновляйте токены

---

*Документация создана: 2026-03-16*
