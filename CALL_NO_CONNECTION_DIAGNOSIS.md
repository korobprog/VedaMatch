# 🔍 Проблема: Звонок идёт, но соединения нет

## 📊 Диагностика (13 марта 2026, 13:17)

### Что работает:
```
✅ WebRTC сигнализация (offer/answer/candidate)
✅ TURN credentials API (/api/turn-credentials)
✅ CoTurn сервер (STATIC_AUTH_SECRET настроен)
✅ WebSocket подключение обоих пользователей
```

### Что НЕ работает:
```
❌ ICE connectivity check fails
❌ P2P соединение не устанавливается
❌ TURN аллокации не создаются
```

---

## 🔍 Логи

### Сервер (13:17:19 - 13:17:25):
```
13:17:19 | 200 | /api/turn-credentials | -  ← Credentials получены
13:17:20 [WS] User 87 → offer → User 4
13:17:20 [Hub] Forwarded candidate to User 4 (много кандидатов)
13:17:25 [WS] User 4 → answer → User 87
13:17:25 [Hub] Forwarded candidate to User 87 (много кандидатов)
```

### CoTurn:
```
❌ Нет сессий (allocate)
❌ Нет auth success
✅ Только INFO логи при старте
```

---

## 🎯 Причина

**Приложение получает TURN credentials, но НЕ использует их!**

Возможные причины:
1. **Приложение игнорирует TURN** — использует только STUN
2. **Файрвол блокирует** UDP порты 3478, 49152-49162
3. **ICE aggregation failed** — кандидаты не прошли connectivity check

---

## 🔧 Решение

### 1. Проверить что приложение использует TURN

**В логах приложения (React Native Metro):**
```
[WebRTC] Fetched X ICE Servers from API
Creating RTCPeerConnection with config: {...}
```

**Должно быть:**
```json
{
  "iceServers": [
    {"urls": "stun:stun.l.google.com:19302"},
    {"urls": "turn:45.150.9.229:3478", "username": "...", "credential": "..."}
  ]
}
```

### 2. Проверить порты на сервере

```bash
# Проверить что порты открыты
ssh root@45.150.9.229 "netstat -tlnp | grep -E '3478|49152'"

# Ожидаемый результат:
# udp  0  0 0.0.0.0:3478  0.0.0.0:*  LISTEN
# udp  0  0 0.0.0.0:49152 0.0.0.0:*  LISTEN
```

### 3. Проверить firewall

```bash
# На сервере
ssh root@45.150.9.229 "iptables -L -n | grep -E '3478|49152'"

# Должно быть разрешено:
# ACCEPT udp -- 0.0.0.0/0 0.0.0.0/0 udp dpt:3478
# ACCEPT udp -- 0.0.0.0/0 0.0.0.0/0 udp dpt:49152:49162
```

### 4. Тест TURN подключения

```bash
# С локальной машины
turnutils_uclient -u user -p password -T 45.150.9.229 3478

# Ожидаемый результат:
# TCP connection to 45.150.9.229:3478 succeeded
# Auth success
```

---

## 📱 Для пользователей

**Если звонки не работают:**

1. **Проверить интернет** — WiFi/4G должны работать
2. **Перезайти в приложение** — обновить токен
3. **Попробовать в другой сети** — некоторые файрволы блокируют WebRTC

---

## 🆕 Следующие шаги

1. **Включить детальное логирование** в приложении
2. **Проверить ICE state** в Chrome DevTools (remote debugging)
3. **Добавить TURN TCP** (сейчас только UDP)

---

*Документ создан: 13 марта 2026, 13:20 MSK*
*Статус: 🔴 Требуется диагностика на устройстве*
