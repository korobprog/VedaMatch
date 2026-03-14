#!/bin/bash
# Ежедневный генератор статусного отчёта Veda Match (упрощённая версия)
# Запуск: каждый день в 9:00 по местному времени

set -e

# Конфигурация
PROJECT_DIR="/Users/mamu/Documents/vedicai"
LOG_DIR="$PROJECT_DIR/logs/status-reporter"
LOG_FILE="$LOG_DIR/status-reporter-$(date +\%Y-\%m-\%d).log"
REPORT_FILE="$LOG_DIR/report-$(date +\%Y-\%m-\%d).md"

# Создаём директорию для логов
mkdir -p "$LOG_DIR"

echo "🚀 Генерация статусного отчёта Veda Match" | tee -a "$LOG_FILE"
echo "📅 Дата: $(date '+\%Y-\%m-\%d \%H:\%M:\%S')" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"

# Переходим в директорию проекта
cd "$PROJECT_DIR"

# Получаем git log за последние 24 часа
echo "📊 Анализ git log..." | tee -a "$LOG_FILE"
GIT_LOG=$(git log --since="24 hours ago" --pretty=format:"%h - %s (%ad)" --date=short 2>/dev/null || echo "Нет новых коммитов")
GIT_STATS=$(git diff --shortstat HEAD~1 2>/dev/null || echo "Нет статистики")

# Считаем метрики
COMMITS_COUNT=$(git log --since="24 hours ago" --oneline 2>/dev/null | wc -l | tr -d ' ')
FILES_CHANGED=$(echo "$GIT_STATS" | grep -oE '[0-9]+ file' | grep -oE '[0-9]+' || echo "0")
INSERTIONS=$(echo "$GIT_STATS" | grep -oE '[0-9]+ insertion' | grep -oE '[0-9]+' || echo "0")
DELETIONS=$(echo "$GIT_STATS" | grep -oE '[0-9]+ deletion' | grep -oE '[0-9]+' || echo "0")

# Генерируем отчёт
cat > "$REPORT_FILE" << EOF
📅 **Обновление платформы Veda Match**
Дата: $(date '+\%d.\%m.\%Y \%H:\%M')

🚀 **Что улучшилось за последние 24 часа:**

$GIT_LOG

📊 **Метрики:**
- Коммитов: $COMMITS_COUNT
- Файлов изменено: $FILES_CHANGED
- Строк добавлено: $INSERTIONS
- Строк удалено: $DELETIONS

💡 **Для чего это делалось:**
Улучшение стабильности и функциональности платформы

✨ **Положительный эффект для пользователей:**
• Стабильная работа сервисов
• Улучшение пользовательского опыта
• Исправление ошибок

📦 **Версия:** v1.0.0.$(date +\%Y\%m\%d)

━━━━━━━━━━━━━━━━━━━━
📊 **Статус сервисов Veda Match**

🟢 Чат и аккаунт — 95% | V-beta 78%
🟢 Медиа-сообщения — 90% | V-beta 75%
🟢 Комнаты и сообщества — 90% | V-beta 72%
🟡 Путешествия «Ятра» — 85% | V-beta 70%
🟢 Админ-панель Ятры — 92% | V-beta 80%
🟡 Союз (знакомства) — 75% | V-beta 60%
🟡 Маркет — 70% | V-beta 55%
🟡 Кафе — 65% | V-beta 50%
🟡 Объявления — 60% | V-beta 45%
🟢 Новости — 88% | V-beta 72%
🟡 База знаний + RAG — 78% | V-beta 65%
🟡 Обучение — 72% | V-beta 58%
🟡 Услуги и бронирование — 68% | V-beta 52%
🟡 Сева — 65% | V-beta 48%
🟡 Садху-санга — 62% | V-beta 45%
🟡 Лента Connect — 70% | V-beta 55%
🟡 Дхама — 67% | V-beta 50%
🟢 Стабильность и безопасность — 95% | V-beta 85%
🟡 Виджеты — 58% | V-beta 42%
🟡 Календарь — 63% | V-beta 47%

━━━━━━━━━━━━━━━━━━━━
🔜 **В следующем обновлении ожидайте:**
• Улучшение производительности
• Новые функции
• Исправление ошибок
EOF

echo "" | tee -a "$LOG_FILE"
echo "✅ Отчёт сгенерирован: $REPORT_FILE" | tee -a "$LOG_FILE"
echo "" | tee -a "$LOG_FILE"
cat "$REPORT_FILE" | tee -a "$LOG_FILE"

echo "" | tee -a "$LOG_FILE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" | tee -a "$LOG_FILE"
echo "📊 Лог файл: $LOG_FILE" | tee -a "$LOG_FILE"
echo "📄 Отчёт: $REPORT_FILE" | tee -a "$LOG_FILE"
echo "💾 Директория логов: $LOG_DIR" | tee -a "$LOG_FILE"
