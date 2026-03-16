# 🤖 VedaMatch Monitor Agents

Автоматизированная система мониторинга и отчетности VedaMatch Platform.

---

## 📋 Обзор

Система состоит из двух агентов:

| Агент | Время | Описание |
|-------|-------|----------|
| **Daily Report** | 9:00 ежедневно | Мониторинг сервера, ошибки, метрики |
| **Platform Status** | 10:00 ежедневно | Статус платформы, git-изменения, MVP % |

---

## 📊 Daily Report (9:00)

### Что включает:
- ✅ **Статус сервисов**: Server, Admin, LKM, PostgreSQL, Redis
- 📈 **Метрики системы**: Uptime, CPU Load, RAM, Disk
- ⚠️ **Ошибки за 24 часа**: SSH, Next.js, System errors
- 🔍 **Детали ошибок**: Последние ошибки из journalctl и docker logs
- 💡 **Рекомендации**: Что исправить

### Пример отчета:
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

---

## 🚀 Platform Status Report (10:00)

### Что включает:
- 📊 **Git-статистика**: коммиты, файлы, строки кода
- 🎯 **Темы изменений**: Исправления, Улучшения, Функции
- 📦 **Версии**: Группировка по версиям
- ✨ **Польза для пользователей**: Описание улучшений
- 📈 **Статус сервисов**: MVP % и V-beta %
- 🟢🟡🟠 **Статус каждого сервиса**: с процентами

### Пример отчета:
```
🚀 Veda Match Platform Update
Обновление: 15.03.2026 10:00

📊 Что изменилось с прошлого раза
├─ Коммитов: 15
├─ Файлов изменено: 42
├─ Строк добавлено: 1250
├─ Строк удалено: 380
└─ Изменений в коде: +870

🎯 Основные направления работ
├─ Исправления: 6 улучшений
├─ Улучшения: 4 улучшений
└─ Функции: 5 улучшений

📈 Статус сервисов Veda Match
MVP: 59% | V-beta: 43%

🟢 Готово | 🟡 В разработке | 🟠 Бета/доработка

🔐 Основное
  🟢 Чат и аккаунт: 95% ✅
  🟢 Медиа-сообщения: 90% ✅
  🟢 Комнаты и сообщества: 85% ✅
  
📊 Итого
├─ Готово: 9 сервисов
├─ В разработке: 5 сервисов
└─ Бета/доработка: 7 сервисов
```

---

## 🗂 Файлы на сервере

| Файл | Путь | Описание |
|------|------|----------|
| `daily_report.py` | `/etc/vedamatch/daily_report.py` | Скрипт ежедневного отчета |
| `platform_status_report.py` | `/etc/vedamatch/platform_status_report.py` | Скрипт статуса платформы |
| `daily_report.env` | `/etc/vedamatch/daily_report.env` | Telegram credentials |
| Логи | `/var/log/vedamatch_*.log` | Логи выполнения |
| Inbox | `/var/log/vedamatch_inbox/` | Inbox-items |
| Memory | `/var/log/vedamatch_platform_memory` | История запусков |

---

## ⚙️ Настройка

### Telegram бот
- Бот: `@vedamatchmonitoring_bot`
- Chat ID: `-5194955140`
- Файл: `/etc/vedamatch/daily_report.env`

### Cron задачи
```bash
# Просмотр задач
crontab -l

# Редактирование
crontab -e

# Задачи:
0 9 * * *  # Daily Report
0 10 * * * # Platform Status
```

### Изменение времени
```bash
# Открыть crontab
sudo crontab -e

# Изменить время (часы минуты)
0 9 * * *  →  30 8 * * *  (на 8:30)
```

---

## 🔧 Команды

### Ручной запуск
```bash
# Daily Report
ssh root@vedamatch.com "/usr/bin/python3 /etc/vedamatch/daily_report.py"

# Platform Status
ssh root@vedamatch.com "/usr/bin/python3 /etc/vedamatch/platform_status_report.py"
```

### Просмотр логов
```bash
# Daily Report логи
ssh root@vedamatch.com "tail -f /var/log/vedamatch_daily_report.log"

# Platform Status логи
ssh root@vedamatch.com "tail -f /var/log/vedamatch_platform_report.log"

# Inbox items
ssh root@vedamatch.com "ls -la /var/log/vedamatch_inbox/"
```

### Обновление статусов сервисов
Отредактируйте `platform_status_report.py` на сервере:
```bash
ssh root@vedamatch.com "nano /etc/vedamatch/platform_status_report.py"
```

Найдите секцию `SERVICES_STATUS` и обновите проценты:
```python
SERVICES_STATUS = {
    "Чат и аккаунт": {"status": "🟢", "percent": 95},
    "Союз (знакомства)": {"status": "🟡", "percent": 55},  # Изменено
    ...
}
```

---

## 📈 Метрики

### MVP %
Средний процент готовности всех сервисов:
```
MVP = (сумма % всех сервисов) / (количество сервисов)
```

### V-beta %
Процент полностью готовых сервисов (🟢):
```
V-beta = (кол-во 🟢 сервисов) / (всего сервисов) * 100
```

---

## 🧩 Архитектура

```
┌─────────────────────────────────────────────────────────────┐
│                    VedaMatch Monitor                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────┐         ┌──────────────────┐         │
│  │  Daily Report    │         │ Platform Status  │         │
│  │    9:00 daily    │         │   10:00 daily    │         │
│  │                  │         │                  │         │
│  │  • System metrics│         │  • Git changes   │         │
│  │  • Docker status │         │  • MVP/V-beta    │         │
│  │  • Error logs    │         │  • Service status│         │
│  │  • Recommendations│        │  • User benefits │         │
│  └────────┬─────────┘         └────────┬─────────┘         │
│           │                            │                    │
│           └────────────┬───────────────┘                    │
│                        │                                    │
│                        ▼                                    │
│            ┌──────────────────────┐                        │
│            │   Telegram Bot       │                        │
│            │ @vedamatchmonitoring │                        │
│            │ Chat: -5194955140    │                        │
│            └──────────────────────┘                        │
│                        │                                    │
│                        ▼                                    │
│            ┌──────────────────────┐                        │
│            │   Inbox Items        │                        │
│            │ /var/log/vedamatch_  │                        │
│            │ inbox/               │                        │
│            └──────────────────────┘                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🛠 Troubleshooting

### Бот не отправляет отчеты
```bash
# Проверить токен
ssh root@vedamatch.com "cat /etc/vedamatch/daily_report.env"

# Тест отправки
ssh root@vedamatch.com "/usr/bin/python3 /etc/vedamatch/daily_report.py"

# Проверить логи
ssh root@vedamatch.com "tail /var/log/vedamatch_daily_report.log"
```

### Cron не запускается
```bash
# Проверить cron
ssh root@vedamatch.com "systemctl status cron"

# Перезапустить cron
ssh root@vedamatch.com "systemctl restart cron"

# Проверить задачи
ssh root@vedamatch.com "crontab -l"
```

### Репозиторий не найден
```bash
# Найти .git директории
ssh root@vedamatch.com "find / -name '.git' -type d"

# Обновить REPO_PATHS в скрипте
ssh root@vedamatch.com "nano /etc/vedamatch/platform_status_report.py"
```

---

## 📝 История обновлений

### 15.03.2026
- ✅ Создан Daily Report Agent
- ✅ Создан Platform Status Report Agent
- ✅ Настроена отправка в Telegram
- ✅ Добавлены Inbox-items и Memory

---

## 📞 Контакты

- Telegram бот: `@vedamatchmonitoring_bot`
- Чат для отчетов: `-5194955140`
- Сервер: `vedamatch.com`

---

*Автоматическая система мониторинга VedaMatch Platform*
