#!/bin/bash
# Ежедневный запуск veda-match-status-reporter для генерации Telegram отчёта
# Запуск: каждый день в 9:00 по местному времени

set -e

# Конфигурация
PROJECT_DIR="/Users/mamu/Documents/vedicai"
LOG_DIR="$PROJECT_DIR/logs/status-reporter"
LOG_FILE="$LOG_DIR/status-reporter-$(date +\%Y-\%m-\%d).log"

# Создаём директорию для логов
mkdir -p "$LOG_DIR"

echo "🚀 Запуск veda-match-status-reporter" | tee -a "$LOG_FILE"
echo "📅 Дата: $(date '+\%Y-\%m-\%d \%H:\%M:\%S')" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

# Переходим в директорию проекта
cd "$PROJECT_DIR"

# Определяем команду для запуска Qwen Codex
QWEN_CMD=""
if command -v /opt/homebrew/bin/qwen &> /dev/null; then
    QWEN_CMD="/opt/homebrew/bin/qwen"
elif command -v qwen-code &> /dev/null; then
    QWEN_CMD="qwen-code"
elif command -v qwen &> /dev/null; then
    QWEN_CMD="qwen"
elif command -v codex &> /dev/null; then
    QWEN_CMD="codex"
else
    # Пробуем найти через npm
    QWEN_CMD="$(npm bin)/qwen-code"
fi

echo "🤖 Используемая команда: $QWEN_CMD" | tee -a "$LOG_FILE"

# Создаём временный файл с промптом
PROMPT_FILE=$(mktemp)
cat > "$PROMPT_FILE" << 'PROMPT'
Создай ежедневный статусный отчёт Veda Match для Telegram за последние 24 часа.

Требования:
1. Проанализируй git log за последние 24 часа
2. Извлеки метрики: количество коммитов, файлы, строки
3. Сгруппируй изменения по версиям (v1.0.0.X)
4. Создай отчёт в формате Telegram-поста
5. Покажи статус всех 20 сервисов с MVP% и V-beta%
6. Обнови память автоматизации
7. Создай inbox-item

Используй агент veda-match-status-reporter для генерации отчёта.
PROMPT

# Запрашиваем генерацию отчёта за последние 24 часа
# Qwen Code автоматически активирует агента veda-match-status-reporter
$QWEN_CMD -p "$(cat "$PROMPT_FILE")" 2>&1 | tee -a "$LOG_FILE"

# Очищаем временный файл
rm -f "$PROMPT_FILE"

# Проверяем успешность выполнения
if [ $? -eq 0 ]; then
    echo "" | tee -a "$LOG_FILE"
    echo "✅ Отчёт успешно сгенерирован" | tee -a "$LOG_FILE"
else
    echo "" | tee -a "$LOG_FILE"
    echo "❌ Ошибка при генерации отчёта" | tee -a "$LOG_FILE"
    exit 1
fi

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "📊 Лог файл: $LOG_FILE" | tee -a "$LOG_FILE"
echo "💾 Директория логов: $LOG_DIR" | tee -a "$LOG_FILE"
