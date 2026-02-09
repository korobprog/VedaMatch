# Video Circles API

Дата обновления: 2026-02-09

Этот документ описывает текущий контракт `Video Circles` в backend (`/api/*`), включая god mode, interactions, boosts, lifecycle и тарифы.

QA checklist для ручной проверки:

- `/Users/mamu/Documents/vedicai/docs/video-circles-qa-checklist.md`

## Base URL

- `http://<host>:8080/api`

## Авторизация и роли

- Все endpoint'ы `video-circles`, кроме `GET /api/video-tariffs`, требуют JWT (`Authorization: Bearer <token>`).
- Админ-тарифы:
- `POST /api/admin/video-tariffs`
- `PUT /api/admin/video-tariffs/:id`
- Доступ только для `admin` и `superadmin` (через `AdminProtected` middleware).

## Основные сущности

- `VideoCircle.status`: `active | expired | deleted`
- `VideoInteraction.type`: `like | comment | chat`
- `VideoBoostType`: `lkm | city | premium`
- `VideoTariff.code`: `lkm_boost | city_boost | premium_boost`

## Лента кружков

### GET `/api/video-circles`

Возвращает список кружков с pagination.

Query params:

- `city` (optional)
- `matha` (optional, canonical)
- `madh` (optional, alias fallback)
- `math` (optional, alias fallback)
- `category` (optional)
- `status` (optional, default filter active+not expired)
- `sort` (optional): `newest | oldest | expires_soon`
- `page` (optional, default `1`)
- `limit` (optional, default `20`, max `100`)

Правила видимости по matha:

- Обычный пользователь: сервер принудительно применяет `user.madh`, даже если в query передан другой `matha`.
- `godModeEnabled=true` или `role=superadmin`: ограничение по профилю выключается; можно видеть все matha.
- При передаче нескольких alias используется приоритет: `matha > madh > math`.

Response 200:

```json
{
  "circles": [
    {
      "id": 101,
      "authorId": 12,
      "mediaUrl": "https://cdn.example.com/video-circles/video/..mp4",
      "thumbnailUrl": "https://cdn.example.com/video-circles/thumbnail/..jpg",
      "city": "Moscow",
      "matha": "gaudiya",
      "category": "kirtan",
      "status": "active",
      "durationSec": 60,
      "expiresAt": "2026-02-09T15:04:05Z",
      "remainingSec": 1740,
      "premiumBoostActive": false,
      "likeCount": 3,
      "commentCount": 1,
      "chatCount": 0,
      "createdAt": "2026-02-09T14:34:05Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 20,
  "totalPages": 1
}
```

## Создание кружка

### POST `/api/video-circles`

JSON-body:

```json
{
  "mediaUrl": "https://cdn.example.com/video.mp4",
  "thumbnailUrl": "https://cdn.example.com/thumb.jpg",
  "city": "Moscow",
  "matha": "gaudiya",
  "category": "kirtan",
  "durationSec": 60,
  "expiresAt": "2026-02-09T16:00:00Z"
}
```

Notes:

- `durationSec` ограничивается до `60` на backend.
- Если `expiresAt` не передан, используется значение по умолчанию (сервисный TTL).
- Для обычного пользователя `matha` нормализуется в `user.madh`.

Response 201: `VideoCircleResponse`.

### POST `/api/video-circles/upload`

Multipart upload endpoint.

Form-data поля:

- `video` (required, `video/*`, max 250MB)
- `thumbnail` (optional, `image/*`)
- `city` (optional)
- `matha` (optional)
- `category` (optional)
- `durationSec` (optional)
- `expiresAt` (optional RFC3339)

Notes:

- При наличии S3: загрузка в S3, при ошибке fallback на локальный `./uploads/video-circles/...`.
- Если `thumbnail` не передан, backend best-effort пытается сгенерировать превью для локального видео.

Response 201: `VideoCircleResponse`.

## Мои кружки и lifecycle

### GET `/api/video-circles/my`

Query:

- `page` (default `1`)
- `limit` (default `20`)

Response 200: `VideoCircleListResponse`.

### PATCH `/api/video-circles/:id`

Редактирование метаданных кружка.

Body (все поля optional):

```json
{
  "city": "Saint-Petersburg",
  "matha": "iskcon",
  "category": "lecture",
  "thumbnailUrl": "https://cdn.example.com/new-thumb.jpg"
}
```

Право: владелец или `admin/superadmin`.

Response 200: `VideoCircleResponse`.

### POST `/api/video-circles/:id/republish`

Продление/повторная публикация кружка.

Body:

```json
{
  "durationMinutes": 60
}
```

Rules:

- Если `durationMinutes <= 0`, backend использует `60`.
- Новый `expiresAt` считается от `max(now, expiresAt)`.
- `deleted` кружок republish запрещён.

Response 200: `VideoCircleResponse`.

### DELETE `/api/video-circles/:id`

Soft-delete кружка:

- `status` -> `deleted`
- Запускается фоновая cleanup попытка для медиа-файлов

Право: владелец или `admin/superadmin`.

Response 200:

```json
{
  "success": true
}
```

## Interactions

### POST `/api/video-circles/:id/interactions`

Body:

```json
{
  "type": "like",
  "action": "toggle"
}
```

Поддерживаемые комбинации:

- `type=like` -> `action=toggle` (user-level toggle)
- `type=comment` -> `action=add`
- `type=chat` -> `action=add`

Response 200:

```json
{
  "circleId": 101,
  "likeCount": 4,
  "commentCount": 1,
  "chatCount": 0,
  "likedByUser": true
}
```

### POST `/api/interactions` (legacy compatibility)

Body:

```json
{
  "circleId": 101,
  "type": "like",
  "action": "toggle"
}
```

Эндпоинт сохраняет совместимость со старыми клиентами и проксирует логику в `video-circles/:id/interactions`.

## Boost / Billing

### POST `/api/video-circles/:id/boost`

Body:

```json
{
  "boostType": "premium"
}
```

Правила:

- Тариф берётся из активной записи `video_tariffs` по коду:
- `lkm -> lkm_boost`
- `city -> city_boost`
- `premium -> premium_boost`
- Списание LKM делается через wallet service.
- Bypass оплаты: `godModeEnabled` или `superadmin` (`chargedLkm=0`, записывается `bypassReason`).
- Для `premium` включается `premiumBoostActive=true`.

Response 200:

```json
{
  "circleId": 101,
  "boostType": "premium",
  "chargedLkm": 30,
  "bypassReason": "",
  "expiresAt": "2026-02-09T17:04:05Z",
  "remainingSec": 5340,
  "premiumBoostActive": true,
  "balanceBefore": 120,
  "balanceAfter": 90
}
```

## Tariffs

### GET `/api/video-tariffs`

Public endpoint (без JWT).

Response 200:

```json
{
  "tariffs": [
    {
      "id": 1,
      "code": "premium_boost",
      "priceLkm": 30,
      "durationMinutes": 180,
      "isActive": true,
      "updatedAt": "2026-02-09T10:00:00Z"
    }
  ]
}
```

### POST `/api/admin/video-tariffs`

Body:

```json
{
  "code": "premium_boost",
  "priceLkm": 50,
  "durationMinutes": 120,
  "isActive": true
}
```

Response 201: `VideoTariff`.

### PUT `/api/admin/video-tariffs/:id`

Body (partial update):

```json
{
  "priceLkm": 55,
  "durationMinutes": 150,
  "isActive": true
}
```

Response 200: `VideoTariff`.

## Expiry и scheduler

- Expiry scheduler запускается через `GlobalScheduler` (таск `video_circle_expiry`).
- При истечении `expiresAt`:
- `status` переводится в `expired`
- элемент скрывается из active feed
- cleanup S3 выполняется асинхронно
- Cleanup идемпотентен: повторные попытки не должны ломать состояние.

## Коды ошибок

- `401 Unauthorized`:
- нет/некорректен токен на protected endpoint
- `403 Forbidden`:
- попытка редактировать/удалять чужой кружок без admin-прав
- `400 Bad Request`:
- невалидный body, невалидный id, доменные ошибки
- `409 Conflict` + `code=CIRCLE_EXPIRED`:
- interaction или boost на expired/non-active кружок
- `402 Payment Required` + `code=INSUFFICIENT_LKM`:
- недостаточно баланса для boost

## Примеры cURL

```bash
curl -H "Authorization: Bearer $TOKEN" \
  "http://localhost:8080/api/video-circles?status=active&page=1&limit=20"
```

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"like","action":"toggle"}' \
  "http://localhost:8080/api/video-circles/101/interactions"
```

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"boostType":"premium"}' \
  "http://localhost:8080/api/video-circles/101/boost"
```

```bash
curl -X PUT -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"priceLkm":55}' \
  "http://localhost:8080/api/admin/video-tariffs/1"
```
