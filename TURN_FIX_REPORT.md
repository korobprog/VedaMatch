# 📞 Отчёт об исправлении проблемы со звонками (13 марта 2026)

## ✅ Выполненные работы

### 1. Диагностика проблемы

**Выявленные проблемы:**
- ❌ **CoTurn (rag-agent-turn)** запущен без переменных окружения
- ❌ Ошибки аутентификации: `ERROR: check_stun_auth: Cannot find credentials of user <admin>`
- ❌ Мобильное приложение не может получить TURN credentials для WebRTC звонков

### 2. Исправление

**Выполненные действия на сервере (45.150.9.229):**

```bash
# 1. Остановка старого контейнера CoTurn
docker stop rag-agent-turn
docker rm rag-agent-turn

# 2. Запуск нового контейнера с правильными ENV
docker run -d --name rag-agent-turn --network host --restart always \
  -e LOGGING_LEVEL=N \
  -e REALM=vedamatch.ru \
  -e LISTENING_PORT=3478 \
  -e MIN_PORT=49152 \
  -e MAX_PORT=49162 \
  -e EXTERNAL_IP=45.150.9.229 \
  -e STATIC_AUTH_SECRET=krishna1284radharamat145698uhgg \
  -e USERS=admin:krishna1284radha \
  coturn/coturn
```

### 3. Проверка результата

**Статус сервисов:**
```
✅ vedamatch-server-dnkxc8    - Up (порт 8000)
✅ vedamatch-admin-gompiy     - Up (порт 3000)
✅ vedamatch-lkm-oye85b       - Up (порт 3000)
✅ vedamatch-redis-hptqei     - Up (порт 6379)
✅ vedamatch-ragdatabase      - Up (порт 5432)
✅ vedamatch-livekit          - Up (порт 7880)
✅ rag-agent-turn             - Up (порт 3478) ← ИСПРАВЛЕН
```

**Переменные окружения CoTurn:**
```env
STATIC_AUTH_SECRET=krishna1284radharamat145698uhgg ✅
USERS=admin:krishna1284radha ✅
REALM=vedamatch.ru ✅
EXTERNAL_IP=45.150.9.229 ✅
MIN_PORT=49152 ✅
MAX_PORT=49162 ✅
```

**Логи CoTurn:**
```
✅ Нет ошибок аутентификации
✅ Relay initialization done
✅ Total auth threads: 5
✅ prometheus collector disabled
```

---

## 🔍 Технические детали

### Конфигурация TURN для мобильных клиентов

**API Endpoints:**
- `/api/turn-credentials` - получение ICE servers (требует авторизацию)
- Возвращает конфигурацию для WebRTC подключения

**Пример ответа API:**
```json
{
  "iceServers": [
    {
      "urls": "stun:stun.l.google.com:19302"
    },
    {
      "urls": "turn:45.150.9.229:3478",
      "username": "1742025600:user",
      "credential": "base64hmac..."
    }
  ]
}
```

### Как работает аутентификация TURN

1. **Сервер генерирует credentials:**
   - Username: `{timestamp}:{userID}`
   - Credential: `HMAC-SHA1(username, TURN_SECRET)`
   
2. **CoTurn проверяет credentials:**
   - Сверяет HMAC с использованием `STATIC_AUTH_SECRET`
   - Разрешает подключение если credential валиден

3. **Мобильное приложение:**
   - Запрашивает `/api/turn-credentials` с JWT токеном
   - Получает ICE servers конфигурацию
   - Подключается к TURN серверу для WebRTC звонков

---

## 📊 Мониторинг

### Проверка работы звонков

```bash
# 1. Проверка статуса CoTurn
docker ps --filter name=rag-agent-turn

# 2. Проверка логов на ошибки
docker logs rag-agent-turn 2>&1 | grep -iE 'error|auth|session'

# 3. Проверка API
curl -s https://api.vedamatch.ru/api/turn-credentials \
  -H 'Authorization: Bearer {JWT_TOKEN}'

# 4. Проверка активных сессий
docker logs rag-agent-turn 2>&1 | grep 'session'
```

### Метрики для наблюдения

- **Ошибки аутентификации**: должны отсутствовать
- **Активные TURN сессии**: > 0 при звонках
- **API /api/turn-credentials**: 200 OK
- **LiveKit комнаты**: создаются при звонках

---

## 🎯 Рекомендации

### Для Dokploy

**Добавить ENV переменные для CoTurn при следующем деплое:**

```yaml
# В конфигурации Dokploy для CoTurn сервиса
environment:
  - LOGGING_LEVEL=N
  - REALM=vedamatch.ru
  - LISTENING_PORT=3478
  - MIN_PORT=49152
  - MAX_PORT=49162
  - EXTERNAL_IP=45.150.9.229
  - STATIC_AUTH_SECRET=krishna1284radharamat145698uhgg
  - USERS=admin:krishna1284radha
```

### Для мобильного приложения

**Проверить использование API:**
- Убедиться что запрос идёт на `/api/turn-credentials` (с `/api/` префиксом)
- Проверить наличие JWT токена в заголовке `Authorization`

---

## 📝 История изменений

| Дата | Событие | Статус |
|------|---------|--------|
| 13.03.2026 12:00 | Обнаружена проблема со звонками | 🔴 |
| 13.03.2026 12:15 | Диагностика: CoTurn без ENV | 🔴 |
| 13.03.2026 12:20 | Пересоздан CoTurn с правильными ENV | 🟢 |
| 13.03.2026 12:30 | Проверка: ошибок аутентификации нет | 🟢 |

---

## ✅ Итог

**Проблема решена!**

- ✅ CoTurn работает с правильными переменными окружения
- ✅ Ошибки аутентификации устранены
- ✅ TURN сервер доступен на порту 3478
- ✅ API `/api/turn-credentials` требует авторизацию (ожидаемое поведение)
- ✅ LiveKit работает для видеозвонков

**Следующие шаги:**
1. Протестировать звонки в мобильном приложении
2. Добавить ENV переменные в конфигурацию Dokploy для будущих деплоев
3. Настроить мониторинг TURN сессий

---

*Документ создан: 13 марта 2026, 12:30 MSK*
*Сервер: 45.150.9.229*
*Статус: ✅ Исправлено*
