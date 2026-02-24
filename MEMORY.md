# MEMORY

## Collaboration Rules
- Обрабатывать задачи без фоновых процессов и без нескольких агентов.
- Работать с файлами по одному и отчитываться после каждого шага.

## Documentation Discipline
- Каждый запрос пользователя фиксировать в `PROMPT_LOG.md` с датой и временем.
- При изменениях, затрагивающих другие платформы, писать запись в `Docs/IOS_CHANGES_FOR_MIGRATION.md`:
  дата, измененные файлы, суть правки (старое -> новое), сниппеты.

## Versioning Notes
- Версии Android вести через `versionName` и `versionCode` в `frontend/android/app/build.gradle`.

## Calls Architecture (Contacts + Rooms)
- Контакты: `frontend/services/contactService.ts` не реализует signaling/RTC; звонок стартует из `frontend/screens/portal/contacts/ContactsScreen.tsx` переходом в `CallScreen`.
- 1:1 звонок: `frontend/screens/calls/CallScreen.tsx` + `frontend/services/webRTCService.ts` (P2P WebRTC, WS-типы `offer/answer/candidate/hangup`, TURN creds из `/turn-credentials`).
- Комнаты (совместные звонки): `RoomChatScreen` включает `RoomVideoBar`, который берет SFU config/token через `frontend/services/roomCallService.ts` (`/rooms/:id/sfu/config`, `/rooms/:id/sfu/token`) и подключается через `RoomSfuClient` к LiveKit.
- Сервер SFU: `server/internal/handlers/room_sfu_handler.go`, `server/internal/services/sfu/livekit_service.go`, роуты в `server/cmd/api/main.go`.
- Доступ к комнатному SFU: проверка `ensureRoomAccess` + флаг `RequireMembership` (`server/internal/handlers/room_access.go`, `server/internal/config/sfu_config.go`).
- В проекте также есть legacy room-signaling путь в `webRTCService.startRoomCall` и WS-типы `room_offer/room_answer/room_candidate/room_hangup`, но текущий UI комнатных звонков идет через SFU/LiveKit.

## Calls Risks / Tech Debt
- Hardcoded TURN fallback credentials удалены из `frontend/services/webRTCService.ts`; при недоступности `/turn-credentials` используется STUN-only fallback.
- В `server/internal/handlers/turn_handler.go` TURN-креды выдаются только при наличии `TURN_SECRET` и `TURN_EXTERNAL_IP/TURN_HOST`; иначе API возвращает STUN-only.
- В `GetContacts` есть legacy-режим возврата полного списка при отсутствии query-параметров (`ContactsLegacyModeEnabled`), что может быть тяжелым по перформансу на росте базы.

## Contacts API
- `FF_CONTACTS_LEGACY_MODE` переведен в default `false` (`server/internal/config/feature_flags.go`), чтобы `/contacts` без query не возвращал полный список по умолчанию.
- Для временного rollback legacy-поведение можно явно включить env-переменной `FF_CONTACTS_LEGACY_MODE=true`.
