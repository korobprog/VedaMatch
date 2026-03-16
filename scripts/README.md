# VedaMatch Monitor Agents

Ежедневные агенты мониторинга для VedaMatch. Собирают метрики, логи, git-статистику и отправляют отчеты в Telegram.

## Агенты

| Агент | Время | Описание |
|-------|-------|----------|
| **Daily Report** | 9:00 ежедневно | Мониторинг сервера, ошибки, метрики |
| **Platform Status** | 10:00 ежедневно | Статус платформы, git-изменения, MVP % |

---

## Настройка Telegram

### 1. Создать Telegram бота

1. Откройте [@BotFather](https://t.me/BotFather) в Telegram
2. Отправьте команду `/newbot`
3. Введите имя бота (например: `VedaMatch Monitor`)
4. Введите username бота (должен заканчиваться на `bot`, например: `vedamatch_monitor_bot`)
5. Сохраните полученный **API Token**

### 2. Узнать Chat ID

**Для личного чата:**
1. Откройте [@userinfobot](https://t.me/userinfobot)
2. Нажмите Start
3. Бот отправит ваш `Id`

**Для группы/канала:**
1. Добавьте бота в группу/канал
2. Отправьте любое сообщение
3. Перейдите по URL: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Найдите `"chat":{"id": -100xxxxxxxxxx}` в ответе

---

## Установка на сервер

### Быстрая установка

```bash
# Скопировать скрипты на сервер
scp scripts/*.py scripts/install.sh user@vedamatch.com:/tmp/

# Подключиться к серверу
ssh user@vedamatch.com

# Запустить установку
cd /tmp
sudo ./install.sh
```

### Ручная установка

```bash
# Создать директорию
sudo mkdir -p /etc/vedamatch
sudo chmod 755 /etc/vedamatch

# Скопировать скрипты
sudo cp daily_report.py /etc/vedamatch/daily_report.py
sudo cp platform_status_report.py /etc/vedamatch/platform_status_report.py
sudo chmod +x /etc/vedamatch/*.py

# Создать .env файл
sudo nano /etc/vedamatch/daily_report.env
```

Содержимое `.env`:
```env
TELEGRAM_BOT_TOKEN=1234567890:AAHxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TELEGRAM_CHAT_ID=-1001234567890
```

### Настройка cron

```bash
# Открыть crontab
sudo crontab -e

# Добавить задачи на 9:00 и 10:00 ежедневно
0 9 * * * /usr/bin/python3 /etc/vedamatch/daily_report.py >> /var/log/vedamatch_daily_report.log 2>&1
0 10 * * * /usr/bin/python3 /etc/vedamatch/platform_status_report.py >> /var/log/vedamatch_platform_report.log 2>&1
```

---

## Тестирование

```bash
# Daily Report
sudo /usr/bin/python3 /etc/vedamatch/daily_report.py

# Platform Status
sudo /usr/bin/python3 /etc/vedamatch/platform_status_report.py

# Проверить логи
tail /var/log/vedamatch_daily_report.log
tail /var/log/vedamatch_platform_report.log
```

---

## Структура отчетов

### Daily Report
```
📊 VedaMatch Daily Report
15.03.2026 09:00

✅ Статус сервисов
├─ Server: ✅ UP
├─ Admin: ✅ UP
├─ LKM: ✅ UP
├─ PostgreSQL: ✅ UP
└─ Redis: ✅ UP

📈 Метрики системы
├─ Uptime: up 2 days, 18 hours
├─ CPU Load: 0.04, 0.04, 0.05
├─ RAM: 2900MB / 9800MB (29.6%)
└─ Disk: 19G / 99G (21%)

⚠️ Ошибки за 24 часа
├─ SSH kex_protocol_error: 18
├─ Next.js Server Action: 4
└─ Итого: 0 критических, 22 предупреждений
```

### Platform Status Report
```
🚀 Veda Match Platform Update
Обновление: 15.03.2026 10:00

📊 Что изменилось с прошлого раза
├─ Коммитов: 15
├─ Файлов изменено: 42
├─ Строк добавлено: 1250
├─ Строк удалено: 380
└─ Изменений в коде: +870

📈 Статус сервисов Veda Match
MVP: 59% | V-beta: 43%

🟢 Готово | 🟡 В разработке | 🟠 Бета/доработка

🔐 Основное
  🟢 Чат и аккаунт: 95% ✅
  🟢 Медиа-сообщения: 90% ✅
  🟢 Комнаты и сообщества: 85% ✅
```

---

## Полезные команды

```bash
# Просмотр логов
tail -f /var/log/vedamatch_daily_report.log
tail -f /var/log/vedamatch_platform_report.log

# Inbox items
ls -la /var/log/vedamatch_inbox/

# Память автоматизации
cat /var/log/vedamatch_platform_memory

# Редактировать cron
crontab -e

# Изменить время отчета
# В crontab изменить '0 9' на нужное время
```

---

## Обновление статусов сервисов

Отредактируйте файл на сервере:
```bash
sudo nano /etc/vedamatch/platform_status_report.py
```

Найдите секцию `SERVICES_STATUS` и обновите проценты:
```python
SERVICES_STATUS = {
    "Чат и аккаунт": {"status": "🟢", "percent": 95},
    "Союз (знакомства)": {"status": "🟡", "percent": 55},
    ...
}
```

---

## Требования

- Python 3.8+
- Доступ к Docker CLI
- Доступ к systemd journal
- Доступ к git репозиторию
- Интернет для отправки в Telegram

---

## Логи

- Daily Report: `/var/log/vedamatch_daily_report.log`
- Platform Status: `/var/log/vedamatch_platform_report.log`
- Inbox Items: `/var/log/vedamatch_inbox/`
- Memory: `/var/log/vedamatch_platform_memory`

---

## Дополнительная документация

- [MONITORING_AGENTS.md](./MONITORING_AGENTS.md) — Полная документация системы
