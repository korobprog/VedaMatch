#!/usr/bin/env python3
"""
VedaMatch Daily Report Agent
Собирает метрики, логи и ошибки с сервера, отправляет отчет в Telegram
Запуск: python3 daily_report.py
"""

import subprocess
import os
import json
from datetime import datetime, timedelta
from pathlib import Path

# Telegram конфигурация
# Загружаем из .env файла или переменных окружения
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


def run_command(cmd: str, timeout: int = 30) -> tuple[str, str, int]:
    """Выполнить shell команду и вернуть (stdout, stderr, return_code)"""
    try:
        result = subprocess.run(
            cmd,
            shell=True,
            capture_output=True,
            text=True,
            timeout=timeout
        )
        return result.stdout, result.stderr, result.returncode
    except subprocess.TimeoutExpired:
        return "", "Command timeout", -1
    except Exception as e:
        return "", str(e), -1


def get_system_snapshot() -> dict:
    """Получить снимок состояния системы"""
    snapshot = {
        "uptime": "",
        "cpu_load": "",
        "memory": {},
        "disk": {},
        "ports": []
    }
    
    # Uptime и load average
    stdout, _, _ = run_command("uptime -p")
    snapshot["uptime"] = stdout.strip() if stdout else "N/A"
    
    stdout, _, _ = run_command("uptime | awk -F'load average:' '{print $2}' | cut -d',' -f1-3")
    snapshot["cpu_load"] = stdout.strip() if stdout else "N/A"
    
    # Memory
    stdout, _, _ = run_command("free -m | grep Mem")
    if stdout:
        parts = stdout.split()
        snapshot["memory"] = {
            "total": int(parts[1]),
            "used": int(parts[2]),
            "free": int(parts[3]),
            "available": int(parts[6]) if len(parts) > 6 else 0
        }
    
    # Disk
    stdout, _, _ = run_command("df -h / | tail -1")
    if stdout:
        parts = stdout.split()
        snapshot["disk"] = {
            "total": parts[1],
            "used": parts[2],
            "available": parts[3],
            "percent": parts[4]
        }
    
    return snapshot


def get_docker_containers() -> list[dict]:
    """Получить статус Docker контейнеров"""
    stdout, _, _ = run_command(
        "docker ps --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' --no-trunc"
    )
    
    containers = []
    for line in stdout.strip().split("\n"):
        if line:
            parts = line.split("\t")
            containers.append({
                "name": parts[0] if len(parts) > 0 else "unknown",
                "status": parts[1] if len(parts) > 1 else "unknown",
                "ports": parts[2] if len(parts) > 2 else ""
            })
    
    return containers


def get_journal_errors(hours: int = 24) -> list[str]:
    """Получить ошибки из systemd journal за последние N часов"""
    stdout, _, _ = run_command(
        f"journalctl --since '{hours} hours ago' --no-pager -p err --no-hostname"
    )
    
    errors = []
    for line in stdout.strip().split("\n"):
        if line.strip() and "-- No entries --" not in line:
            errors.append(line.strip())
    
    return errors[:50]  # Ограничим 50 ошибками


def get_docker_logs_errors(container: str, hours: int = 24) -> list[str]:
    """Получить ошибки из логов Docker контейнера"""
    stdout, _, _ = run_command(
        f"docker logs --since {hours}h {container} 2>&1 | grep -iE '(error|exception|fatal|critical)' | tail -20"
    )
    
    errors = []
    for line in stdout.strip().split("\n"):
        if line.strip():
            errors.append(line.strip())
    
    return errors


def get_prometheus_metrics() -> dict:
    """Получить метрики из Prometheus (если доступен)"""
    metrics = {"targets_up": 0, "targets_down": 0}
    
    # Попробуем получить статус targets
    stdout, _, _ = run_command(
        "curl -s http://127.0.0.1:19090/api/v1/targets 2>/dev/null | python3 -c "
        "'import sys,json; d=json.load(sys.stdin); print(d.get(\"data\",{}).get(\"activeTargets\",[]))' 2>/dev/null"
    )
    
    return metrics


def analyze_container_status(containers: list[dict]) -> dict:
    """Анализировать статус контейнеров"""
    analysis = {
        "total": len(containers),
        "running": 0,
        "unhealthy": 0,
        "restarting": 0,
        "stopped": 0,
        "services": {}
    }
    
    for c in containers:
        status = c["status"].lower()
        name = c["name"]
        
        if "up" in status:
            analysis["running"] += 1
            if "unhealthy" in status:
                analysis["unhealthy"] += 1
        elif "restarting" in status:
            analysis["restarting"] += 1
        else:
            analysis["stopped"] += 1
        
        # Краткий статус для отчета
        if "vedamatch-server" in name:
            analysis["services"]["server"] = "✅ UP" if "up" in status else "❌ DOWN"
        elif "vedamatch-admin" in name:
            analysis["services"]["admin"] = "✅ UP" if "up" in status else "❌ DOWN"
        elif "vedamatch-lkm" in name:
            analysis["services"]["lkm"] = "✅ UP" if "up" in status else "❌ DOWN"
        elif "postgres" in name and "vedamatch" in name:
            analysis["services"]["postgres"] = "✅ UP" if "up" in status else "❌ DOWN"
        elif "redis" in name and "vedamatch" in name:
            analysis["services"]["redis"] = "✅ UP" if "up" in status else "❌ DOWN"
    
    return analysis


def format_report() -> str:
    """Сформировать итоговый отчет"""
    now = datetime.now().strftime("%d.%m.%Y %H:%M")
    
    # Сбор данных
    snapshot = get_system_snapshot()
    containers = get_docker_containers()
    container_analysis = analyze_container_status(containers)
    journal_errors = get_journal_errors(hours=24)
    
    # Логи ключевых сервисов
    server_errors = get_docker_logs_errors(
        "vedamatch-server-dnkxc8.1.yeg4rbus9mv56f27838fg649o", hours=24
    )
    admin_errors = get_docker_logs_errors(
        "vedamatch-admin-gompiy.1.y2fo4zoy2b9d4zyzrreoodxio", hours=24
    )
    lkm_errors = get_docker_logs_errors(
        "vedamatch-lkm-oye85b.1.ueo900aymradc6zunpgqfrab2", hours=24
    )
    
    # Форматирование отчета
    report = []
    report.append(f"📊 <b>VedaMatch Daily Report</b>")
    report.append(f"<i>{now}</i>")
    report.append("")
    
    # Статус сервисов
    report.append(f"<b>✅ Статус сервисов</b>")
    services = container_analysis["services"]
    report.append(f"├─ Server: {services.get('server', '❓ Unknown')}")
    report.append(f"├─ Admin: {services.get('admin', '❓ Unknown')}")
    report.append(f"├─ LKM: {services.get('lkm', '❓ Unknown')}")
    report.append(f"├─ PostgreSQL: {services.get('postgres', '❓ Unknown')}")
    report.append(f"└─ Redis: {services.get('redis', '❓ Unknown')}")
    report.append(f"   Всего контейнеров: {container_analysis['running']}/{container_analysis['total']}")
    report.append("")
    
    # Метрики системы
    report.append(f"<b>📈 Метрики системы</b>")
    report.append(f"├─ Uptime: {snapshot['uptime']}")
    report.append(f"├─ CPU Load: {snapshot['cpu_load']}")
    
    mem = snapshot["memory"]
    if mem:
        mem_percent = (mem["used"] / mem["total"] * 100) if mem["total"] > 0 else 0
        report.append(f"├─ RAM: {mem['used']}MB / {mem['total']}MB ({mem_percent:.1f}%)")
    
    disk = snapshot["disk"]
    if disk:
        report.append(f"└─ Disk: {disk['used']} / {disk['total']} ({disk['percent']})")
    report.append("")
    
    # Ошибки
    report.append(f"<b>⚠️ Ошибки за 24 часа</b>")
    
    critical_count = 0
    warning_count = 0
    
    # Подсчет ошибок
    ssh_errors = len([e for e in journal_errors if "sshd" in e.lower()])
    nextjs_errors = len([e for e in server_errors + admin_errors + lkm_errors if "Server Action" in e])
    
    if ssh_errors > 0:
        report.append(f"├─ SSH kex_protocol_error: {ssh_errors}")
        warning_count += ssh_errors
    
    if nextjs_errors > 0:
        report.append(f"├─ Next.js Server Action: {nextjs_errors}")
        warning_count += nextjs_errors
    
    # Ошибки сервера (кроме SSH)
    other_errors = len(journal_errors) - ssh_errors
    if other_errors > 0:
        report.append(f"├─ System errors: {other_errors}")
        critical_count += other_errors
    
    if critical_count == 0 and warning_count == 0:
        report.append("└─ <b>Ошибок не обнаружено</b> ✅")
    else:
        report.append(f"└─ Итого: {critical_count} критических, {warning_count} предупреждений")
    
    report.append("")
    
    # Детали ошибок (если есть)
    if journal_errors and len(journal_errors) > 0:
        report.append(f"<b>🔍 Последние ошибки (journalctl)</b>")
        for err in journal_errors[:5]:
            # Сокращаем длинные строки
            err_short = err[:100] + "..." if len(err) > 100 else err
            report.append(f"  • {err_short}")
        report.append("")
    
    if server_errors and len(server_errors) > 0:
        report.append(f"<b>🔍 Ошибки Server</b>")
        for err in server_errors[:3]:
            err_short = err[:100] + "..." if len(err) > 100 else err
            report.append(f"  • {err_short}")
        report.append("")
    
    # Рекомендации
    if nextjs_errors > 0:
        report.append(f"<b>💡 Рекомендации</b>")
        report.append("  • Перезапустить Admin и LKM для устранения Server Action ошибок")
        report.append("")
    
    report.append(f"<i>🤖 VedaMatch Monitor Agent</i>")
    
    return "\n".join(report)


def send_to_telegram(message: str) -> bool:
    """Отправить сообщение в Telegram"""
    if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
        print(f"❌ Telegram не настроен. Token: {bool(TELEGRAM_BOT_TOKEN)}, Chat ID: {bool(TELEGRAM_CHAT_ID)}")
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
    except urllib.error.HTTPError as e:
        print(f"❌ HTTP Error: {e.code} {e.reason}")
        return False
    except Exception as e:
        print(f"❌ Ошибка отправки: {e}")
        return False


def main():
    print("🚀 VedaMatch Daily Report Agent")
    print("=" * 40)
    
    # Формируем отчет
    report = format_report()
    
    # Вывод в консоль (для отладки)
    print("\n" + report)
    print("\n" + "=" * 40)
    
    # Отправка в Telegram
    if TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID:
        success = send_to_telegram(report)
        if not success:
            print("⚠️ Не удалось отправить отчет в Telegram")
            exit(1)
    else:
        print("⚠️ Telegram не настроен. Заполните TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID")
        
        # Сохраняем отчет в файл
        output_file = Path("/tmp/vedamatch_daily_report.txt")
        output_file.write_text(report)
        print(f"📄 Отчет сохранен в {output_file}")
    
    print("✅ Готово!")


if __name__ == "__main__":
    main()
