#!/bin/bash

# Automatic Telegram Notification Script for VedaMatch Monitoring
# Sends system status and alerts to @vedamatchmonitoring_bot

set -e

# Configuration
TELEGRAM_BOT_TOKEN="${TELEGRAM_BOT_TOKEN:-8333505498:AAGqOM-8WOcYl7BBmmiEz5eOeQpmuE2cJn4}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:--5194955140}"
SERVER_NAME="${SERVER_NAME:-VedaMatch Production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Send message to Telegram
send_telegram_message() {
    local message="$1"
    local parse_mode="${2:-HTML}"
    
    if [ -z "$TELEGRAM_BOT_TOKEN" ] || [ -z "$TELEGRAM_CHAT_ID" ]; then
        log_error "TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set"
        return 1
    fi
    
    local response=$(curl -s -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
        -d "chat_id=${TELEGRAM_CHAT_ID}" \
        -d "text=${message}" \
        -d "parse_mode=${parse_mode}")
    
    local ok=$(echo "$response" | jq -r '.ok')
    
    if [ "$ok" = "true" ]; then
        log_info "Message sent successfully"
        return 0
    else
        local error_msg=$(echo "$response" | jq -r '.description')
        log_error "Failed to send message: $error_msg"
        return 1
    fi
}

# Get system status
get_system_status() {
    local uptime_str=$(uptime -p 2>/dev/null || uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')
    local load_avg=$(cat /proc/loadavg | awk '{print $1, $2, $3}')
    local memory_info=$(free -m | awk 'NR==2{printf "Total: %sMB, Used: %sMB, Free: %sMB (%.1f%%)", $2, $3, $4, $3*100/$2}')
    local disk_info=$(df -h / | awk 'NR==2{printf "Total: %s, Used: %s, Free: %s (%s)", $2, $3, $4, $5}')
    
    # Docker containers status
    local docker_running=$(docker ps --format '{{.Names}}' 2>/dev/null | wc -l)
    local docker_total=$(docker ps -a --format '{{.Names}}' 2>/dev/null | wc -l)
    
    # Recent errors from journal
    local recent_errors=$(journalctl --since "1 hour ago" -p err --no-pager -q 2>/dev/null | wc -l)
    
    cat << EOF
🔍 <b>System Status Report</b>
📍 Server: ${SERVER_NAME}
⏰ Time: $(date '+%Y-%m-%d %H:%M:%S %Z')

<b>📊 System Metrics:</b>
├─ Uptime: ${uptime_str}
├─ Load Avg: ${load_avg}
├─ Memory: ${memory_info}
└─ Disk: ${disk_info}

<b>🐳 Docker Status:</b>
├─ Running: ${docker_running}/${docker_total}
└─ Recent Errors: ${recent_errors} (last hour)

<b>🔔 Monitoring:</b>
├─ Grafana: $(curl -sf http://localhost:13000/api/health > /dev/null && echo "✅ Online" || echo "❌ Offline")
├─ Prometheus: $(curl -sf http://localhost:19090/-/healthy > /dev/null && echo "✅ Online" || echo "❌ Offline")
└─ Loki: $(docker ps --filter "name=vedamatch-loki" --format '{{.Status}}' 2>/dev/null | grep -q "Up" && echo "✅ Online" || echo "❌ Offline")

<i>Generated automatically by VedaMatch Monitor</i>
EOF
}

# Send daily report
send_daily_report() {
    log_info "Generating daily report..."
    
    local report=$(get_system_status)
    send_telegram_message "$report"
}

# Send alert
send_alert() {
    local alert_name="$1"
    local alert_status="$2"
    local alert_description="$3"
    
    local emoji="🔴"
    if [ "$alert_status" = "resolved" ]; then
        emoji="🟢"
    elif [ "$alert_status" = "warning" ]; then
        emoji="🟡"
    fi
    
    local message="${emoji} <b>Alert: ${alert_name}</b>

<b>Status:</b> ${alert_status}
<b>Description:</b> ${alert_description}
<b>Time:</b> $(date '+%Y-%m-%d %H:%M:%S %Z')
<b>Server:</b> ${SERVER_NAME}

<i>VedaMatch Monitoring System</i>"
    
    send_telegram_message "$message"
}

# Send test message
send_test() {
    log_info "Sending test message..."
    
    local message="✅ <b>Test Message</b>

VedaMatch monitoring bot is working correctly!

Server: ${SERVER_NAME}
Time: $(date '+%Y-%m-%d %H:%M:%S %Z')

If you received this message, the Telegram integration is configured properly."
    
    send_telegram_message "$message"
}

# Show usage
usage() {
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  status      Send current system status"
    echo "  daily       Send daily report"
    echo "  alert       Send alert (requires ALERT_NAME, ALERT_STATUS, ALERT_DESC)"
    echo "  test        Send test message"
    echo "  help        Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  TELEGRAM_BOT_TOKEN   Telegram bot token (default: monitoring bot)"
    echo "  TELEGRAM_CHAT_ID     Telegram chat ID (default: -5194955140)"
    echo "  SERVER_NAME          Server name for reports (default: VedaMatch Production)"
}

# Main
case "${1:-status}" in
    status)
        send_telegram_message "$(get_system_status)"
        ;;
    daily)
        send_daily_report
        ;;
    alert)
        send_alert "${ALERT_NAME:-Unknown Alert}" "${ALERT_STATUS:-firing}" "${ALERT_DESCRIPTION:-No description}"
        ;;
    test)
        send_test
        ;;
    help|--help|-h)
        usage
        ;;
    *)
        log_error "Unknown command: $1"
        usage
        exit 1
        ;;
esac
