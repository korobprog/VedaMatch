# SFU Room Smoke (Staging/Prod)

## 1. Preconditions
- `ROOM_SFU_ENABLED=true`
- `ROOM_SFU_PROVIDER=livekit`
- `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, `LIVEKIT_WS_URL` заполнены
- пользователь является member комнаты

## 2. API smoke
```bash
API_BASE="https://<api-host>/api" \
JWT="<access-token>" \
ROOM_ID="<room-id>" \
./script/sfu_smoke.sh
```

Ожидаемо:
- `GET /rooms/:id/sfu/config` -> `200`, `enabled=true`, `provider=livekit`
- `POST /rooms/:id/sfu/token` -> `200`, есть `token/wsUrl/roomName/participantIdentity`

## 3. Mobile smoke (iOS/Android)
1. Открыть RoomChat и нажать `Подключиться`.
2. Проверить:
- подключение проходит без краша;
- mic/camera по умолчанию выключены;
- включение mic/camera работает с первого нажатия;
- при входе/выходе участников обновляется список;
- reconnect после network switch восстанавливает соединение.

## 4. Scale smoke
- Провести сессии: `2`, `8`, `20`, `50` участников.
- Для `20/50` ограничить одновременный рендер видео тайлов (остальные audio-only/fallback).
- Фиксировать:
  - join latency;
  - reconnect success;
  - publish failures;
  - app crashes/freezes.

## 5. Observability checks
- Логи backend по `RoomSFU`:
  - `token_issued`
  - `token_issue_failed`
- Метрики:
  - `room_sfu_token_issued_total`
  - `room_sfu_token_denied_total`
  - `room_sfu_token_error_total`

## 6. Known local limitation
В офлайн-среде `pod install` может падать на `cdn.cocoapods.org`.
Для полноценной iOS сборки нужен сетевой доступ к CocoaPods CDN.
