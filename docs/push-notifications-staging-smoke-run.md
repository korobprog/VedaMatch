# Push Notifications Staging Smoke Run

Date: 2026-02-14

## Быстрый запуск (автоматизированный)

Используйте скрипт:
- `/Users/mamu/Documents/vedicai/script/push_staging_smoke_run.sh`

Обязательные переменные:
- `API_URL` (с суффиксом `/api`)
- `ADMIN_TOKEN`

Рекомендуемые (для реальной доставки на устройства):
- `PROVIDER_PUSH_TOKEN`
- `CLIENT_PUSH_TOKEN`
- `PROVIDER_PLATFORM` (`ios|android|web`, default `android`)
- `CLIENT_PLATFORM` (`ios|android|web`, default `android`)

Пример запуска:
```bash
export API_URL="https://staging-api.example.com/api"
export ADMIN_TOKEN="<admin-jwt>"
export PROVIDER_PUSH_TOKEN="<real-fcm-token-provider-device>"
export CLIENT_PUSH_TOKEN="<real-fcm-token-client-device>"
export PROVIDER_PLATFORM="android"
export CLIENT_PLATFORM="ios"

/Users/mamu/Documents/vedicai/script/push_staging_smoke_run.sh
```

Что делает скрипт:
1. Проверяет health до прогона (`GET /api/admin/push/health`).
2. Создаёт 2 smoke-пользователя (provider/client).
3. Регистрирует push токены через `POST /api/push-tokens/register` (если переданы).
4. Booking flow:
- создаёт сервис,
- создаёт тариф,
- публикует сервис,
- клиент создаёт booking.
5. News flow:
- создаёт source,
- клиент подписывается,
- создаёт important news,
- публикует news.
6. Wallet flow:
- активирует pending balance клиента (`POST /api/admin/wallet/:userId/activate`).
7. Выполняет 2 sanity push через `POST /api/admin/push/test`.
8. Показывает health после прогона.

## Ручной прогон (curl + expected)

### 1) Health check
```bash
curl -sS -X GET "$API_URL/admin/push/health?window_hours=1" \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq
```
Expected:
- HTTP `200`
- JSON содержит поля:
  - `delivery_success_rate`
  - `invalid_token_rate`
  - `retry_rate`
  - `latency_p95`
  - `fcmConfigured`
  - `fcmKeySource`

### 2) Register push token (пример)
```bash
curl -sS -X POST "$API_URL/push-tokens/register" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token":"<real-fcm-token>",
    "provider":"fcm",
    "platform":"android",
    "deviceId":"smoke-device",
    "appVersion":"smoke-1"
  }' | jq
```
Expected:
- HTTP `200`
- JSON: `{ "ok": true, "tokenId": <number>, "isNew": true|false }`

### 3) Booking scenario
Создать service + tariff + publish + book:
- `POST /api/services`
- `POST /api/services/:id/tariffs`
- `POST /api/services/:id/publish`
- `POST /api/services/:id/book`

Expected:
- booking request -> HTTP `201`, JSON с `id` booking
- provider device получает push `type=new_booking`
- открытие push ведёт в `IncomingBookings`

### 4) News important scenario
- `POST /api/admin/news/sources`
- `POST /api/news/sources/:id/subscribe` (user)
- `POST /api/admin/news` с `isImportant=true`
- `POST /api/admin/news/:id/publish`

Expected:
- publish -> HTTP `200`, `{ "message": "News published successfully" }`
- subscriber device получает push `type=news`

### 5) Wallet scenario
- `POST /api/admin/wallet/:userId/activate`

Expected:
- HTTP `200`, `{ "success": true }`
- user device получает push `type=wallet_activated`
- открытие push ведёт в `Wallet`

### 6) Direct sanity push
```bash
curl -sS -X POST "$API_URL/admin/push/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":123,
    "title":"Smoke sanity",
    "body":"Push delivery check",
    "data":{"type":"admin_test_push","screen":"Wallet"}
  }' | jq
```
Expected:
- HTTP `200`
- JSON: `{ "ok": true, "fcmConfigured": true|false, "fcmKeySource": "db|env|none" }`

## Критерий PASS для smoke-run
- API шаги возвращают ожидаемые HTTP коды.
- На устройствах подтверждены 3 бизнес-сценария:
  - booking created -> provider push
  - news important publish -> subscriber push
  - wallet activation -> user push
- `GET /api/admin/push/health` не показывает деградацию относительно baseline.
