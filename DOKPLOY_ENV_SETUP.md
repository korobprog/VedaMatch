# 🔐 ENV конфигурация для Dokploy (CoTurn/TURN)

## 📍 Где хранятся ENV переменные

**Путь на сервере:** `/etc/dokploy/applications/vedamatch-server-dnkxc8/code/.env`

Этот файл используется `docker-compose.prod.yml` для развёртывания всех сервисов включая **CoTurn**.

---

## ✅ Созданный .env файл

Файл уже создан и содержит все необходимые переменные:

```bash
# Database
DB_PASSWORD=krishna1284radha
DB_USER=raguser
DB_NAME=ragdb
DB_HOST=vedamatch-ragdatabase-cog4dx
DB_PORT=5432

# Redis
REDIS_PASSWORD=hXcEGvm8Ef9B
REDIS_HOST=vedamatch-redis-hptqei
REDIS_PORT=6379
REDIS_DB=0

# TURN/CoTurn ← ЭТИ ПЕРЕМЕННЫЕ ВАЖНЫ ДЛЯ ЗВОНКОВ
TURN_SECRET=krishna1284radharamat145698uhgg
TURN_USER=admin
TURN_PASSWORD=krishna1284radha
TURN_EXTERNAL_IP=45.150.9.229
TURN_REALM=vedamatch.ru

# Server
API_OPEN_AI=rvf_fulldf75dd38b82e81ef57577253502340120cccb59209a57f7ebcaaba5056b3859ffe3
JWT_SECRET=8f395d3c7a2b0e61f1a5c9d4b0e8a7f23c6b1d9e5a4f7c0b8d2e1a3c5b7f9a1e
SUPERADMIN_EMAIL=korobprog@gmail.com
SUPERADMIN_PASSWORD=krishna1284radha
PORT=8000
APP_ENV=production

# Gemini
GEMINI_API_KEY=AIzaSyCUOR6V5jiS9119B4K2xmgqSaBt1uVl7Xc
GEMINI_BASE_URL=https://mute-waterfall-ef1e.makstreid.workers.dev
GEMINI_CORPUS_ID=proxy-test-store-jazaend8hrp2

# LiveKit
LIVEKIT_API_KEY=aLO2YvwP9dX7Mzo6Fh4azLh+ZmhVNy8Qi4cLOVyi8I38ZfEtZX4UDqmcVLHxczDb
LIVEKIT_API_SECRET=Y+vFoW1LQDH4PYiiR/rpBC2bcdi6Bx3Eeu39mBN/SKc/k7tD3n9Zu6oAzJzZyBRU
LIVEKIT_WS_URL=wss://livekit.vedamatch.ru

# S3
S3_ENDPOINT=https://s3.firstvds.ru
S3_REGION=default
S3_ACCESS_KEY=4OI4XOTESV57KD5OIUJZ
S3_SECRET_KEY=wWHCHKw6Ud1Xre2ikYbvM5CvKxZzOSncpu3y7qSD
S3_BUCKET_NAME=05859cbd-c4799b8f-c25d-417d-b8a3-7c54ac14c436
S3_PUBLIC_URL=https://cdn.vedamatch.ru

# Frontend URLs
NEXT_PUBLIC_API_URL=https://api.vedamatch.ru/api
```

---

## 🔄 Как обновить ENV переменные

### Вариант 1: Через SSH (быстро)

```bash
# SSH на сервер
ssh root@45.150.9.229

# Редактировать .env файл
nano /etc/dokploy/applications/vedamatch-server-dnkxc8/code/.env

# После изменений — перезапустить сервисы
cd /etc/dokploy/applications/vedamatch-server-dnkxc8/code
docker compose -f docker-compose.prod.yml up -d
```

### Вариант 2: Через Dokploy UI (рекомендуется)

1. Открыть панель Dokploy: `http://45.150.9.229:3000`
2. Выбрать приложение `vedamatch-server-dnkxc8`
3. Перейти в раздел **Environment Variables**
4. Добавить/обновить переменные
5. Нажать **Deploy** для применения изменений

---

## 🎯 Критические переменные для TURN/CoTurn

Для работы звонков **обязательно** должны быть установлены:

| Переменная | Значение | Описание |
|------------|----------|----------|
| `TURN_SECRET` | `krishna1284radharamat145698uhgg` | Секрет для генерации credentials |
| `TURN_USER` | `admin` | Статический пользователь (fallback) |
| `TURN_PASSWORD` | `krishna1284radha` | Статический пароль (fallback) |
| `TURN_EXTERNAL_IP` | `45.150.9.229` | Публичный IP сервера |
| `TURN_REALM` | `vedamatch.ru` | Realm для TURN аутентификации |

---

## 📊 Как CoTurn использует ENV

**docker-compose.prod.yml:**
```yaml
coturn:
  image: coturn/coturn
  container_name: rag-agent-turn
  environment:
    - USERS=${TURN_USER}:${TURN_PASSWORD}
    - REALM=${TURN_REALM:-vedamatch.ru}
    - EXTERNAL_IP=${TURN_EXTERNAL_IP:-45.150.9.229}
    - STATIC_AUTH_SECRET=${TURN_SECRET}
```

**Процесс аутентификации:**
1. Сервер генерирует credentials через API `/api/turn-credentials`
2. Username: `{timestamp}:{userID}`
3. Credential: `HMAC-SHA1(username, TURN_SECRET)`
4. CoTurn проверяет credential через `STATIC_AUTH_SECRET`
5. При совпадении — разрешает TURN сессию

---

## ✅ Проверка после изменений

```bash
# 1. Проверить .env файл
cat /etc/dokploy/applications/vedamatch-server-dnkxc8/code/.env | grep TURN

# 2. Проверить запущенные контейнеры
docker ps --filter name=rag-agent-turn

# 3. Проверить логи CoTurn
docker logs rag-agent-turn 2>&1 | grep -iE 'error|auth'

# 4. Проверить API
curl -s https://api.vedamatch.ru/api/turn-credentials \
  -H 'Authorization: Bearer {JWT_TOKEN}'
```

**Ожидаемый результат:**
- ✅ `.env` содержит TURN переменные
- ✅ `rag-agent-turn` в статусе `Up`
- ✅ Нет ошибок `check_stun_auth: Cannot find credentials`
- ✅ API возвращает `iceServers` с TURN конфигурацией

---

## 🔧 Если CoTurn не запускается

**Проблема:** Контейнер уже существует
```bash
# Удалить старый контейнер
docker rm -f rag-agent-turn

# Запустить заново
cd /etc/dokploy/applications/vedamatch-server-dnkxc8/code
docker compose -f docker-compose.prod.yml up -d coturn
```

**Проблема:** Ошибки аутентификации
```bash
# Проверить что TURN_SECRET совпадает в .env и у сервера
docker inspect vedamatch-server-dnkxc8.1.* --format '{{range .Config.Env}}{{println .}}{{end}}' | grep TURN_SECRET
cat /etc/dokploy/applications/vedamatch-server-dnkxc8/code/.env | grep TURN_SECRET
```

---

## 📝 История изменений

| Дата | Событие | Статус |
|------|---------|--------|
| 13.03.2026 12:20 | CoTurn запущен вручную с ENV | ✅ |
| 13.03.2026 15:53 | Создан `.env` файл для Dokploy | ✅ |
| 13.03.2026 16:00 | CoTurn работает с правильными ENV | ✅ |

---

*Документ создан: 13 марта 2026, 16:00 MSK*
*Сервер: 45.150.9.229*
*Статус: ✅ ENV настроены*
