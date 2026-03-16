#!/bin/bash
# VedaMatch Daily Report Agent - Installer
# Скрипт установки агента мониторинга на сервер

set -e

echo "🚀 VedaMatch Daily Report Agent - Installer"
echo "==========================================="
echo ""

# Проверка root прав
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Запустите скрипт от root (sudo ./install.sh)"
    exit 1
fi

# Создание директории
echo "📁 Создание директории..."
mkdir -p /etc/vedamatch
chmod 755 /etc/vedamatch

# Копирование скрипта
echo "📄 Копирование скрипта..."
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp "$SCRIPT_DIR/daily_report.py" /etc/vedamatch/daily_report.py
chmod +x /etc/vedamatch/daily_report.py

# Создание файла для переменных окружения
echo ""
echo "⚙️  Настройка Telegram..."
echo ""
echo "Введите Telegram Bot Token (получите у @BotFather):"
read -r BOT_TOKEN

echo "Введите Telegram Chat ID (получите у @userinfobot):"
read -r CHAT_ID

# Создание .env файла
cat > /etc/vedamatch/daily_report.env << EOF
TELEGRAM_BOT_TOKEN=$BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
EOF

chmod 600 /etc/vedamatch/daily_report.env

# Создание лог файла
touch /var/log/vedamatch_daily_report.log
chmod 644 /var/log/vedamatch_daily_report.log

# Добавление в cron
echo ""
echo "⏰ Настройка cron задачи на 9:00 ежедневно..."

# Проверяем, есть ли уже задача
if crontab -l 2>/dev/null | grep -q "daily_report.py"; then
    echo "⚠️  Задача уже существует в crontab"
else
    # Добавляем задачу
    (crontab -l 2>/dev/null; echo "0 9 * * * /usr/bin/python3 /etc/vedamatch/daily_report.py >> /var/log/vedamatch_daily_report.log 2>&1") | crontab -
    echo "✅ Задача добавлена в crontab"
fi

# Тестовый запуск
echo ""
echo "🧪 Тестовый запуск..."
/usr/bin/python3 /etc/vedamatch/daily_report.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Установка завершена успешно!"
    echo ""
    echo "📋 Полезные команды:"
    echo "  • Просмотр логов: tail -f /var/log/vedamatch_daily_report.log"
    echo "  • Ручной запуск: /usr/bin/python3 /etc/vedamatch/daily_report.py"
    echo "  • Редактировать cron: crontab -e"
    echo "  • Изменить время: отредактируйте '0 9' в crontab (часы минуты)"
    echo ""
else
    echo ""
    echo "❌ Тестовый запуск не удался. Проверьте логи."
    exit 1
fi
