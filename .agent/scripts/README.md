# 📊 Ежедневный статусный отчёт Veda Match

## 🚀 Описание

Автоматическая генерация статусных отчётов платформы Veda Match для Telegram **каждый день в 9:00 утра**.

Агент **`veda-match-status-reporter`** анализирует изменения и создаёт понятные отчёты для пользователей.

---

## ⏰ Расписание

**Время запуска:** Каждый день в **9:00 утра** по местному времени (Москва, UTC+3)

**Cron:** `0 9 * * *`

---

## 📁 Структура

```
.
├── .agent/
│   └── scripts/
│       └── daily-status-reporter.sh    # Скрипт запуска
├── logs/
│   └── status-reporter/
│       ├── daily-status-reporter-YYYY-MM-DD.log  # Отчёт за день
│       └── cron.log                              # Лог crontab
└── .qwen/
    └── agents/
        └── veda-match-status-reporter.md         # Агент
```

---

## 🔧 Установка

### 1. Скрипт уже установлен

Скрипт находится: `/Users/mamu/Documents/vedicai/.agent/scripts/daily-status-reporter.sh`

### 2. Crontab настроен

Задание добавлено в crontab:
```bash
0 9 * * * /Users/mamu/Documents/vedicai/.agent/scripts/daily-status-reporter.sh
```

### 3. Проверка

```bash
# Проверить crontab
crontab -l | grep status-reporter

# Проверить скрипт
ls -la /Users/mamu/Documents/vedicai/.agent/scripts/daily-status-reporter.sh
```

---

## 🧪 Тестовый запуск

### Запустить вручную:

```bash
cd /Users/mamu/Documents/vedicai
./.agent/scripts/daily-status-reporter.sh
```

### Проверить логи:

```bash
# Последние логи
tail -f logs/status-reporter/cron.log

# Отчёт за сегодня
cat logs/status-reporter/status-reporter-$(date +%Y-%m-%d).log
```

---

## 📊 Что делает агент

При каждом запуске агент автоматически:

1. ✅ **Анализирует git log** за последние 24 часа
2. ✅ **Считает метрики:**
   - Количество коммитов
   - Изменённые файлы
   - Добавленные/удалённые строки
   - Версии (v1.0.0.X)
3. ✅ **Генерирует Telegram-пост:**
   - Дата обновления
   - Список улучшений
   - Цель изменений
   - Польза для пользователей
4. ✅ **Показывает статус 20 сервисов:**
   - 🟢 Готово
   - 🟡 В разработке
   - 🟠 Бета/доработка
   - MVP % и V-beta % для каждого
5. ✅ **Обновляет память** автоматизации
6. ✅ **Создаёт inbox-item** для пользователя

---

## 📋 Пример отчёта

```
📅 Обновление платформы Veda Match
Дата: 14.03.2025 09:00

🚀 Что улучшилось:
• Добавлен ежедневный статусный отчёт
• Настроена автоматизация на 9:00 утра
• Улучшена документация

💡 Для чего это делалось:
Автоматизация информирования пользователей об обновлениях

✨ Положительный эффект:
• Ежедневные отчёты о статусе платформы
• Прозрачность разработки
• Понятные статусы сервисов

📦 Версия: v1.0.0.8

━━━━━━━━━━━━━━━━━━━━
📊 Статус сервисов Veda Match

🟢 Чат и аккаунт — 95% | V-beta 78%
🟡 Медиа-сообщения — 82% | V-beta 65%
🟢 Комнаты и сообщества — 90% | V-beta 72%
...
```

---

## 🔍 Мониторинг

### Проверить последний запуск:

```bash
# Когда последний раз запускался
grep "🚀 Запуск" logs/status-reporter/cron.log | tail -1

# Успешно ли выполнился
grep "✅ Отчёт успешно" logs/status-reporter/cron.log | tail -1
```

### Просмотреть отчёты:

```bash
# Все отчёты
ls -lh logs/status-reporter/

# Отчёт за сегодня
cat logs/status-reporter/status-reporter-$(date +%Y-%m-%d).log

# Отчёт за вчера
cat logs/status-reporter/status-reporter-$(date -d yesterday +%Y-%m-%d).log
```

---

## ⚠️ Troubleshooting

### Скрипт не запускается:

```bash
# Проверить права
chmod +x .agent/scripts/daily-status-reporter.sh

# Проверить путь
which qwen-chat

# Запустить вручную
./.agent/scripts/daily-status-reporter.sh
```

### Crontab не работает:

```bash
# Перезагрузить crontab
crontab -l > /tmp/cron.tmp
crontab /tmp/cron.tmp
rm /tmp/cron.tmp

# Проверить логи cron
grep CRON /var/log/system.log | tail -20
```

### Агент не активируется:

Убедитесь что **Qwen Codex** установлен и настроен:

```bash
# Проверить версию
qwen-chat --version

# Проверить доступные skills
qwen-chat --skills | grep veda-match
```

---

## 📈 Статистика

### Просмотреть статистику за месяц:

```bash
# Количество запусков
grep "🚀 Запуск" logs/status-reporter/*.log | wc -l

# Количество успешных
grep "✅ Отчёт успешно" logs/status-reporter/*.log | wc -l

# Количество ошибок
grep "❌ Ошибка" logs/status-reporter/*.log | wc -l
```

---

## 🎯 Следующие шаги

### Улучшения:

1. **Добавить отправку в Telegram:**
   - Настроить Telegram Bot API
   - Добавить отправку сгенерированного отчёта

2. **Настроить уведомления:**
   - Email при ошибке
   - Telegram при успешном запуске

3. **Добавить метрики:**
   - Время генерации отчёта
   - Размер отчёта
   - Количество сервисов со статусом

---

## 📞 Контакты

При проблемах обращайтесь к документации:
- [SKILL.md агента](./.qwen/agents/veda-match-status-reporter.md)
- [Основная документация](./README.md)

---

*Документ создан: 14 марта 2026, 18:25 MSK*
*Статус: ✅ Настроено и работает*
