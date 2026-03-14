# 🔧 Исправление проблемы со звонками (Март 2026)

## 🚨 Проблема

Пользователи не могут совершать звонки — сбои WebRTC/TURN.

## 🔍 Диагностика

### Найденные проблемы:

1. **❌ PostgreSQL остановлен** 5 недель назад
   ```
   rag-agent-postgres   Exited (255) 5 weeks ago
   ```

2. **❌ Go сервер остановлен** 5 недель назад
   ```
   rag-agent-server     Exited (2) 5 weeks ago
   ```

3. **❌ TURN_SECRET не передан в CoTurn**
   - В контейнере: `STATIC_AUTH_SECRET=p2psecretkey123` (dev значение)
   - Ожидается: `TURN_SECRET=krishna1284radharamat145698uhgg`
   - Ошибка в логах: `ERROR: Wrong user account: :`

4. **❌ API `/turn-credentials` недоступно**
   - Сервер не работает, мобильное приложение не может получить ICE servers

## 📋 Решение

### Шаг 1: Проверка .env файла на сервере

```bash
# SSH на сервер
ssh user@45.150.9.229

# Перейти в директорию проекта
cd /path/to/vedicai

# Проверить текущие TURN переменные
cat .env | grep -i turn
```

### Шаг 2: Добавить缺失 переменные в .env

Создайте или дополните `.env` файл:

```env
# TURN/CoTurn Configuration
TURN_SECRET=krishna1284radharamat145698uhgg
TURN_USER=admin
TURN_PASSWORD=krishna1284radha
TURN_EXTERNAL_IP=45.150.9.229
TURN_REALM=vedamatch.ru

# Database
DB_PASSWORD=ragpassword
DB_USER=raguser
DB_NAME=ragdb

# Redis
REDIS_PASSWORD=

# Server
JWT_SECRET=your_jwt_secret_here
API_OPEN_AI=your_rvlautoai_key_here

# S3 Storage
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=default
S3_ACCESS_KEY=your_access_key
S3_SECRET_KEY=your_secret_key
S3_BUCKET_NAME=vedamatch-media
S3_PUBLIC_URL=https://cdn.vedamatch.ru

# Gemini API
GEMINI_BASE_URL=https://mute-waterfall-ef1e.makstreid.workers.dev
GEMINI_API_KEY=your_gemini_key

# Superadmin
SUPERADMIN_EMAIL=admin@example.com
SUPERADMIN_PASSWORD=change_this_password_immediately
```

### Шаг 3: Перезапуск сервисов

```bash
# Остановить все сервисы
docker-compose -f docker-compose.prod.yml down

# Запустить заново
docker-compose -f docker-compose.prod.yml up -d

# Проверить статус
docker-compose -f docker-compose.prod.yml ps
```

**Ожидаемый результат:**
```
NAME                 STATUS
rag-agent-postgres   Up
rag-agent-redis      Up
rag-agent-server     Up
rag-agent-turn       Up
rag-agent-lkm        Up
```

### Шаг 4: Проверка логов

```bash
# Логи TURN (исключить ошибки)
docker logs -f rag-agent-turn 2>&1 | grep -iE "error|fail|auth"

# Логи сервера
docker logs -f rag-agent-server 2>&1 | tail -50

# Проверка API turn-credentials
curl -s http://localhost:8083/api/turn-credentials | jq
```

**Ожидаемый ответ API:**
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

### Шаг 5: Проверка звонков

1. Открыть мобильное приложение
2. Начать видеозвонок
3. Проверить логи подключения WebRTC

## 🔬 Технические детали

### Как работает TURN аутентификация

CoTurn поддерживает два режима:

#### 1. Auth-Secret (долгосрочные credentials)
- Сервер генерирует username с timestamp
- Credential = HMAC-SHA1(username, secret)
- Срок действия: 24 часа

```go
// server/internal/handlers/turn_handler.go
username := fmt.Sprintf("%d:%s", timestamp, userID)
mac := hmac.New(sha1.New, []byte(secret))
mac.Write([]byte(username))
credential := base64.StdEncoding.EncodeToString(mac.Sum(nil))
```

#### 2. Static Credentials (короткосрочные)
- Фиксированные username/password
- Менее безопасно, но проще

### Конфигурация CoTurn

**Production (docker-compose.prod.yml):**
```yaml
coturn:
  environment:
    - STATIC_AUTH_SECRET=${TURN_SECRET}
    - USERS=${TURN_USER}:${TURN_PASSWORD}
    - REALM=${TURN_REALM:-vedamatch.ru}
```

**Важно:** `STATIC_AUTH_SECRET` используется для REST API аутентификации, 
а не для генерации credentials через CLI.

### Почему возникала ошибка

В логах CoTurn:
```
ERROR: Wrong user account: :
ERROR: CONFIG: Unknown argument:
```

Это происходило потому что:
1. Переменная `TURN_SECRET` не была установлена
2. CoTurn пытался распарсить пустые значения из CLI аргументов
3. Аутентификация через auth-secret не работала

## ✅ Проверка успешного исправления

1. ✅ Все контейнеры в статусе `Up`
2. ✅ API `/turn-credentials` возвращает ICE servers
3. ✅ В логах TURN нет ошибок `ERROR: Wrong user account`
4. ✅ Мобильное приложение успешно подключается к TURN
5. ✅ Видеозвонки работают без сбоев

## 📞 Контакты для экстренной помощи

Если проблема не решена после выполнения шагов:
- Проверить firewall: порт 3478 (TCP/UDP), 49152-49162 (UDP)
- Проверить SSL сертификаты для TURN TLS (опционально)
- Проверить логи LiveKit: `docker logs rag-agent-livekit`

---

*Документ создан: 13 марта 2026*
*Проблема: Сбои звонков пользователей*
*Статус: Требуется выполнение на сервере*
