# Sadhu Sanga Live Smoke Runbook (Stage B)

Цель: быстро проверить, что live-эфиры, модерация, доступ подписчиков и push-сигналы работают стабильно перед rollout.

## 1. Preconditions

- Backend поднят и доступен по `API_BASE`.
- Включены feature flags:
  - `CHANNELS_V1_ENABLED=true`
  - `SADHU_SANGA_LIVE_ENABLED=true`
- Для rollout-проверки подготовлены настройки (optional):
  - `SADHU_SANGA_LIVE_ROLLOUT_PERCENT`
  - `SADHU_SANGA_LIVE_ROLLOUT_ALLOWLIST`
  - `SADHU_SANGA_LIVE_ROLLOUT_DENYLIST`
- Есть тестовые пользователи:
  - `owner/admin/editor`
  - минимум 3 `subscriber`
  - 1 не-подписчик

## 2. Минимальный API smoke (happy path)

1. Создать live-сессию:
- `POST /api/channels/:id/live`
- Ожидается: `201`, `status=scheduled`.

2. Проверить текущую live-сессию:
- `GET /api/channels/:id/live`
- Ожидается: `liveStatus=scheduled`.

3. Запустить эфир:
- `POST /api/channels/:id/live/:liveId/start`
- Ожидается: `200`, `status=live`, `startedAt != null`.

4. Вход подписчика:
- `POST /api/channels/:id/live/:liveId/join`
- Ожидается: `200`, есть `token`, `wsUrl`, `roomId`.

5. Вход не-подписчика:
- `POST /api/channels/:id/live/:liveId/join`
- Ожидается: `403`.

6. Завершить эфир:
- `POST /api/channels/:id/live/:liveId/end`
- Ожидается: `200`, `status=ended`, `endedAt != null`.

## 3. Runtime moderation smoke

1. Получить список участников:
- `GET /api/channels/:id/live/:liveId/participants`
- Ожидается: `200`, список не пустой после join.

2. Выполнить `mute`:
- `POST /api/channels/:id/live/:liveId/moderation`
- Body: `{"targetUserId": <id>, "action":"mute"}`
- Ожидается: `200`, у участника `isMuted=true`.

3. Выполнить `block`:
- Body: `{"targetUserId": <id>, "action":"block"}`
- Ожидается: `200`, `isBlocked=true`.

4. Повторный `join` для blocked:
- `POST /api/channels/:id/live/:liveId/join`
- Ожидается: `403`.

5. Выполнить `unblock`:
- Body: `{"targetUserId": <id>, "action":"unblock"}`
- Ожидается: `200`, `isBlocked=false`.

6. Выполнить `kick` (на активном участнике):
- Body: `{"targetUserId": <id>, "action":"kick"}`
- Ожидается: `200`, участник уходит в `isActive=false`.

## 4. Push smoke без дублей

Цель: убедиться, что на старте эфира push не дублируются одному пользователю.

1. Подготовить 1000 подписчиков в тестовом контуре (или максимально доступный объем).
2. Запустить live через `start`.
3. Проверить агрегаты доставки в БД по событию live-start:

```sql
SELECT
  (payload::jsonb->'data'->>'liveId') AS live_id,
  user_id,
  COUNT(*) AS deliveries
FROM push_delivery_events
WHERE created_at > NOW() - INTERVAL '30 minutes'
  AND (payload::jsonb->'data'->>'type') = 'channel_live'
GROUP BY 1,2
HAVING COUNT(*) > 1;
```

Ожидается: 0 строк.

Примечание: для unit smoke есть тест `TestUniqueChannelMemberUserIDs_DeduplicatesAndSkipsZero`.

## 5. Метрики и логи (Stage B)

Проверить рост счетчиков после сценария create/start/join/end:

- `sadhu_live_created_total`
- `sadhu_live_started_total`
- `sadhu_live_join_denied_total`
- `sadhu_live_join_success_total`
- `sadhu_live_ended_total`

Через `/api/channels/metrics` (если включен admin-diagnostics) или прямой SQL:

```sql
SELECT key, value
FROM metric_counters
WHERE key IN (
  'sadhu_live_created_total',
  'sadhu_live_started_total',
  'sadhu_live_join_denied_total',
  'sadhu_live_join_success_total',
  'sadhu_live_ended_total'
)
ORDER BY key;
```

Логи для выборки:
- `"[SadhuLive] created ..."`
- `"[SadhuLive] started ..."`
- `"[SadhuLive] join_success ..."`
- `"[SadhuLive] join_denied ..."`
- `"[SadhuLive] moderation ..."`
- `"[SadhuLive] ended ..."`

## 6. Mobile UI smoke (RN)

1. `SadhuSangaHub`:
- виден блок live;
- при `live` отображается CTA `Смотреть эфир`.

2. `ChannelDetails` (`source='sadhu_sanga'`):
- `editor+` видит `Анонс/Старт/Завершить/Отменить`;
- подписчик видит `Войти в эфир`;
- не подписчик видит CTA подписки вместо входа;
- при `live` и `editor+` виден блок участников и меню moderation.

3. `RoomChat`:
- `autoStartCall` автоматически стартует видео;
- при выходе отправляется `leave`.

## 7. Rollout decision gates

1. 10%:
- API/UI smoke PASS
- нет дублей push
- нет 5xx всплеска по live endpoints.

2. 50%:
- стабильные метрики `join_success/denied`
- нет критических инцидентов модерации.

3. 100%:
- минимум 24ч стабильности на 50%
- подтверждено QA и ops.
