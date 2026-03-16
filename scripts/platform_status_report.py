#!/usr/bin/env python3
"""
VedaMatch Platform Status Report
Собирает git-статистику, статусы сервисов и формирует отчет для Telegram
"""

import subprocess
import os
import json
import re
from datetime import datetime, timedelta
from pathlib import Path
from collections import defaultdict

# Telegram конфигурация
ENV_FILE_PATHS = [
    "/etc/vedamatch/daily_report.env",
    os.path.join(os.path.dirname(__file__), ".env"),
    ".env"
]

for env_path in ENV_FILE_PATHS:
    if os.path.exists(env_path):
        with open(env_path, "r") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, value = line.split("=", 1)
                    os.environ[key.strip()] = value.strip()
        break

TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID", "")

# Путь к репозиторию (может быть несколько)
REPO_PATHS = [
    "/root/vedicai",
    "/home/vedamatch/vedicai",
    "/opt/vedicai",
    "/etc/dokploy/applications/vedamatch-server-dnkxc8/code",
    "/etc/dokploy/applications/vedamatch-admin-gompiy/code",
    "/etc/dokploy/applications/vedamatch-lkm-oye85b/code",
]

# Выберем первый существующий
REPO_PATH = None
for path in REPO_PATHS:
    if os.path.exists(path) and os.path.exists(os.path.join(path, ".git")):
        REPO_PATH = path
        break

if REPO_PATH is None:
    # Fallback к первому существующему .git
    for path in REPO_PATHS:
        if os.path.exists(path):
            REPO_PATH = path
            break

# Статусы сервисов (обновляются вручную или из конфига)
SERVICES_STATUS = {
    "Чат и аккаунт": {"status": "🟢", "percent": 95},
    "Медиа-сообщения": {"status": "🟢", "percent": 90},
    "Комнаты и сообщества": {"status": "🟢", "percent": 85},
    "Путешествия «Ятра»": {"status": "🟡", "percent": 65},
    "Админ-панель Ятры": {"status": "🟢", "percent": 80},
    "Союз (знакомства)": {"status": "🟠", "percent": 45},
    "Маркет": {"status": "🟡", "percent": 55},
    "Кафе": {"status": "🟠", "percent": 30},
    "Объявления": {"status": "🟠", "percent": 25},
    "Новости": {"status": "🟢", "percent": 75},
    "База знаний + RAG": {"status": "🟡", "percent": 60},
    "Обучение": {"status": "🟠", "percent": 35},
    "Услуги и бронирование": {"status": "🟠", "percent": 40},
    "Сева": {"status": "🟡", "percent": 50},
    "Садху-санга": {"status": "🟠", "percent": 20},
    "Лента": {"status": "🟢", "percent": 70},
    "Connect": {"status": "🟢", "percent": 85},
    "Дхама": {"status": "🟠", "percent": 15},
    "Стабильность и безопасность платформы": {"status": "🟢", "percent": 90},
    "Виджеты": {"status": "🟡", "percent": 55},
    "Календарь": {"status": "🟢", "percent": 80},
}


def run_command(cmd: str, cwd: str = None, timeout: int = 60) -> tuple[str, str, int]:
    """Выполнить shell команду"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout,
            cwd=cwd
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Command timeout", -1
    except Exception as e:
        return "", str(e), -1


def get_last_run_time() -> datetime:
    """Получить время последнего запуска из файла"""
    last_run_file = Path("/var/log/vedamatch_platform_status_last_run")
    if last_run_file.exists():
        try:
            last_run = datetime.fromisoformat(last_run_file.read_text().strip())
            return last_run
        except:
            pass
    # По умолчанию - 24 часа назад
    return datetime.now() - timedelta(days=1)


def save_last_run_time():
    """Сохранить время текущего запуска"""
    last_run_file = Path("/var/log/vedamatch_platform_status_last_run")
    last_run_file.write_text(datetime.now().isoformat())


def get_git_changes(since: datetime) -> dict:
    """Получить изменения из git с последнего запуска"""
    since_str = since.strftime("%Y-%m-%d %H:%M:%S")
    
    # Git log с статистикой
    stdout, _, _ = run_command(
        f'git log --since="{since_str}" --pretty=format:"%H|%ad|%s" --date=format:"%Y-%m-%d %H:%M"',
        cwd=REPO_PATH
    )
    
    commits = []
    for line in stdout.strip().split("\n"):
        if line:
            parts = line.split("|", 2)
            if len(parts) >= 3:
                commits.append({
                    "hash": parts[0][:8],
                    "date": parts[1],
                    "message": parts[2]
                })
    
    # Статистика по коммитам
    total_commits = len(commits)
    
    # Получаем детальную статистику
    stdout, _, _ = run_command(
        f'git log --since="{since_str}" --numstat --pretty=format:"COMMIT:%H|%ad|%s" --date=format:"%Y-%m-%d %H:%M"',
        cwd=REPO_PATH
    )
    
    files_changed = 0
    insertions = 0
    deletions = 0
    
    for line in stdout.strip().split("\n"):
        if line and not line.startswith("COMMIT:"):
            parts = line.split("\t")
            if len(parts) >= 3:
                files_changed += 1
                try:
                    ins = int(parts[0]) if parts[0] != "-" else 0
                    dels = int(parts[1]) if parts[1] != "-" else 0
                    insertions += ins
                    deletions += dels
                except:
                    pass
    
    # Группировка по версиям (ищем теги или версии в сообщениях)
    versions = defaultdict(list)
    for commit in commits:
        # Ищем версию в сообщении (например v1.0.0.6)
        match = re.search(r'v?\d+\.\d+\.\d+(\.\d+)?', commit["message"], re.IGNORECASE)
        if match:
            version = match.group(0)
            if not version.startswith("v"):
                version = "v" + version
            versions[version].append(commit)
        else:
            versions["other"].append(commit)
    
    # Агрегируем темы изменений
    themes = defaultdict(list)
    theme_keywords = {
        "Исправления": ["fix", "исправ", "bug", "error", "repair"],
        "Улучшения": ["improve", "улучш", "enhance", "optim"],
        "Функции": ["feature", "функц", "add", "new", "добав"],
        "Безопасность": ["security", "безопасн", "auth", "login"],
        "Производительность": ["performance", "производит", "speed", "fast"],
        "UI/UX": ["ui", "ux", "interface", "дизайн", "visual"],
    }
    
    for commit in commits:
        msg_lower = commit["message"].lower()
        found_theme = False
        for theme, keywords in theme_keywords.items():
            if any(kw in msg_lower for kw in keywords):
                themes[theme].append(commit)
                found_theme = True
                break
        if not found_theme:
            themes["Другое"].append(commit)
    
    return {
        "commits": commits,
        "total_commits": total_commits,
        "files_changed": files_changed,
        "insertions": insertions,
        "deletions": deletions,
        "net_change": insertions - deletions,
        "versions": dict(versions),
        "themes": dict(themes)
    }


def calculate_mvp_percent() -> tuple[int, int]:
    """Рассчитать общий % MVP и V-beta"""
    total_percent = sum(s["percent"] for s in SERVICES_STATUS.values())
    total_services = len(SERVICES_STATUS)
    
    # MVP = среднее по всем сервисам
    mvp_percent = round(total_percent / total_services)
    
    # V-beta = процент сервисов со статусом 🟢 (готово)
    ready_count = sum(1 for s in SERVICES_STATUS.values() if s["status"] == "🟢")
    v_beta_percent = round(ready_count / total_services * 100)
    
    return mvp_percent, v_beta_percent


def format_platform_report() -> str:
    """Сформировать отчет о платформе"""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    last_run = get_last_run_time()
    
    # Получаем git изменения
    git_changes = get_git_changes(last_run)
    
    # Рассчитываем метрики
    mvp_percent, v_beta_percent = calculate_mvp_percent()
    
    # Формируем отчет
    report = []
    report.append(f"🚀 <b>Veda Match Platform Update</b>")
    report.append(f"<i>Обновление: {now}</i>")
    report.append("")
    
    # Блок изменений
    report.append(f"<b>📊 Что изменилось с прошлого раза</b>")
    report.append(f"├─ Коммитов: {git_changes['total_commits']}")
    report.append(f"├─ Файлов изменено: {git_changes['files_changed']}")
    report.append(f"├─ Строк добавлено: {git_changes['insertions']}")
    report.append(f"├─ Строк удалено: {git_changes['deletions']}")
    report.append(f"└─ Изменений в коде: +{git_changes['net_change']}")
    report.append("")
    
    # Темы изменений
    if git_changes["themes"]:
        report.append(f"<b>🎯 Основные направления работ</b>")
        for theme, commits in sorted(git_changes["themes"].items(), key=lambda x: -len(x[1])):
            if len(commits) > 0:
                report.append(f"├─ {theme}: {len(commits)} улучшений")
        report.append("")
    
    # Версии
    if git_changes["versions"]:
        report.append(f"<b>📦 Обновления по версиям</b>")
        for version, commits in sorted(git_changes["versions"].items()):
            if version != "other" and len(commits) > 0:
                report.append(f"├─ {version}: {len(commits)} коммитов")
        report.append("")
    
    # Пользовательские улучшения
    report.append(f"<b>✨ Что это дает пользователям</b>")
    
    improvements = []
    if git_changes["themes"].get("Исправления"):
        improvements.append("• Стабильная работа без ошибок")
    if git_changes["themes"].get("Улучшения"):
        improvements.append("• Улучшенный пользовательский опыт")
    if git_changes["themes"].get("Производительность"):
        improvements.append("• Быстрая загрузка и отклик")
    if git_changes["themes"].get("Безопасность"):
        improvements.append("• Защищенные данные и аккаунты")
    if git_changes["themes"].get("UI/UX"):
        improvements.append("• Красивый и удобный интерфейс")
    if git_changes["themes"].get("Функции"):
        improvements.append("• Новые возможности для сообщества")
    
    if improvements:
        for imp in improvements:
            report.append(imp)
    else:
        report.append("• Продолжается активная разработка")
    report.append("")
    
    # Статус сервисов
    report.append(f"<b>📈 Статус сервисов Veda Match</b>")
    report.append(f"MVP: <b>{mvp_percent}%</b> | V-beta: <b>{v_beta_percent}%</b>")
    report.append("")
    
    # Легенда
    report.append(f"<i>🟢 Готово | 🟡 В разработке | 🟠 Бета/доработка</i>")
    report.append("")
    
    # Сервисы группами
    groups = {
        "🔐 Основное": ["Чат и аккаунт", "Медиа-сообщения", "Комнаты и сообщества", "Лента", "Connect"],
        "🎯 Сервисы": ["Союз (знакомства)", "Маркет", "Кафе", "Объявления", "Услуги и бронирование"],
        "📚 Контент": ["Новости", "База знаний + RAG", "Обучение", "Календарь", "Виджеты"],
        "🕉 Сообщество": ["Сева", "Садху-санга", "Дхама", "Путешествия «Ятра»"],
        "🛠 Платформа": ["Админ-панель Ятры", "Стабильность и безопасность платформы"],
    }
    
    for group_name, services in groups.items():
        report.append(f"<b>{group_name}</b>")
        for service in services:
            if service in SERVICES_STATUS:
                svc = SERVICES_STATUS[service]
                status_icon = svc["status"]
                percent = svc["percent"]
                
                # Цветной кружок для процента
                if percent >= 80:
                    percent_color = "✅"
                elif percent >= 50:
                    percent_color = "⚡"
                else:
                    percent_color = "⏳"
                
                report.append(f"  {status_icon} {service}: {percent}% {percent_color}")
        report.append("")
    
    # Итог
    ready_count = sum(1 for s in SERVICES_STATUS.values() if s["status"] == "🟢")
    in_progress_count = sum(1 for s in SERVICES_STATUS.values() if s["status"] == "🟡")
    beta_count = sum(1 for s in SERVICES_STATUS.values() if s["status"] == "🟠")
    
    report.append(f"<b>📊 Итого</b>")
    report.append(f"├─ Готово: {ready_count} сервисов")
    report.append(f"├─ В разработке: {in_progress_count} сервисов")
    report.append(f"└─ Бета/доработка: {beta_count} сервисов")
    report.append("")
    report.append(f"<i>🤖 VedaMatch Platform Monitor</i>")
    
    return "\n".join(report)


def send_to_telegram(message: str) -> bool:
    """Отправить сообщение в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"❌ Telegram не настроен")
        return False
    
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    data = {
        "chat_id": TELEGRAM_CHAT_ID,
        "text": message,
        "parse_mode": "HTML"
    }
    
    import urllib.request
    import urllib.error
    
    try:
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode("utf-8"),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            result = json.loads(response.read().decode("utf-8"))
            if result.get("ok"):
                print("✅ Отчет отправлен в Telegram")
                return True
            else:
                print(f"❌ Telegram API error: {result}")
                return False
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")
        return False


def save_inbox_item(summary: str):
    """Создать inbox-item с summary"""
    inbox_dir = Path("/var/log/vedamatch_inbox")
    inbox_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    inbox_file = inbox_dir / f"inbox_{timestamp}.txt"
    
    content = f"""VedaMatch Platform Status Update
================================
Время: {datetime.now().strftime('%d.%m.%Y %H:%M')}

Заголовок: 🚀 Veda Match — новые улучшения платформы

Что смотреть пользователю:
{summary}

---
Автоматически создано VedaMatch Platform Monitor
"""
    
    inbox_file.write_text(content)
    print(f"📬 Inbox-item создан: {inbox_file}")


def update_memory(summary: str):
    """Обновить память автоматизации"""
    memory_file = Path("/var/log/vedamatch_platform_memory")
    
    # Читаем существующую память
    history = []
    if memory_file.exists():
        try:
            history = json.loads(memory_file.read_text())
        except:
            history = []
    
    # Добавляем новую запись
    history.append({
        "timestamp": datetime.now().isoformat(),
        "summary": summary
    })
    
    # Храним последние 10 записей
    history = history[-10:]
    
    memory_file.write_text(json.dumps(history, indent=2, ensure_ascii=False))
    print("💾 Память обновлена")


def main():
    print("🚀 VedaMatch Platform Status Report")
    print("=" * 40)
    
    # Проверяем, существует ли репозиторий
    if REPO_PATH:
        print(f"✅ Используем репозиторий: {REPO_PATH}")
    else:
        print("⚠️ Репозиторий не найден, пропускаем git-аналитику")
    
    # Формируем отчет
    report = format_platform_report()
    
    # Вывод в консоль
    print("\n" + report)
    print("\n" + "=" * 40)
    
    # Отправка в Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        success = send_to_telegram(report)
        if success:
            # Краткое summary для inbox и памяти
            mvp_percent, v_beta_percent = calculate_mvp_percent()
            summary = f"Платформа Veda Match: MVP {mvp_percent}%, V-beta {v_beta_percent}%. Обновлены сервисы и функционал. Проверьте Telegram для деталей."
            
            save_inbox_item(summary)
            update_memory(summary)
            
            # Сохраняем время запуска
            save_last_run_time()
        else:
            print("⚠️ Не удалось отправить отчет в Telegram")
            exit(1)
    else:
        print("⚠️ Telegram не настроен")
        output_file = Path("/tmp/vedamatch_platform_report.txt")
        output_file.write_text(report)
        print(f"📄 Отчет сохранен в {output_file}")
    
    print("✅ Готово!")


if __name__ == "__main__":
    main()
