# Video Circles QA Checklist

Дата: 2026-02-09  
Окружение: `staging` или локальный `http://localhost:8080`

## Быстрый API smoke (авто)

Скрипт:

- `/Users/mamu/Documents/vedicai/script/video_circles_smoke.sh`

Пример запуска:

```bash
API_BASE="http://localhost:8080/api" \
USER_TOKEN="<user_jwt>" \
ADMIN_TOKEN="<admin_jwt>" \
bash /Users/mamu/Documents/vedicai/script/video_circles_smoke.sh
```

## Preconditions

- Есть 3 пользователя:
- `user_a` (обычный пользователь, `madh=gaudiya`)
- `user_b` (обычный пользователь, `madh=iskcon`)
- `admin` (`role=admin` или `superadmin`)
- Для одного пользователя включен `godModeEnabled=true`.
- В БД есть активные тарифы:
- `lkm_boost`, `city_boost`, `premium_boost`.

## API smoke

1. `GET /api/video-tariffs` без токена.
- Ожидаемо: `200`, массив `tariffs`.

2. `POST /api/video-circles/upload` (token `user_a`, `video` <= 250MB).
- Ожидаемо: `201`, `status=active`, `durationSec=60`.

3. `GET /api/video-circles?status=active` (token `user_a`).
- Ожидаемо: `200`, новый кружок виден.

4. `POST /api/video-circles/:id/interactions` body `{type:like,action:toggle}`.
- Ожидаемо: `200`, `likeCount` +1, `likedByUser=true`.

5. Повторный like toggle.
- Ожидаемо: `200`, `likeCount` -1, `likedByUser=false`.

6. `POST /api/video-circles/:id/interactions` body `{type:comment,action:add}`.
- Ожидаемо: `200`, `commentCount` +1.

7. `POST /api/interactions` (legacy) body `{circleId,type:chat,action:add}`.
- Ожидаемо: `200`, `chatCount` +1.

8. `POST /api/video-circles/:id/boost` body `{boostType:premium}` при достаточном LKM.
- Ожидаемо: `200`, `chargedLkm>0`, `expiresAt` увеличен, `premiumBoostActive=true`.

9. `POST /api/video-circles/:id/boost` при недостатке LKM.
- Ожидаемо: `402`, `code=INSUFFICIENT_LKM`.

10. `PATCH /api/video-circles/:id` владельцем.
- Ожидаемо: `200`, поля (`city/matha/category`) обновлены.

11. `DELETE /api/video-circles/:id` владельцем.
- Ожидаемо: `200`, `{success:true}`.

12. Попытка `PATCH/DELETE` чужого кружка обычным пользователем.
- Ожидаемо: `403`.

## God mode / matha visibility

1. `user_a` (без god mode) запрашивает `GET /api/video-circles`.
- Ожидаемо: видит только `matha=user_a.madh`.

2. `user_b` (без god mode) запрашивает `GET /api/video-circles`.
- Ожидаемо: не видит `user_a` кружки из другой matha.

3. Пользователь с `godModeEnabled=true` запрашивает `GET /api/video-circles`.
- Ожидаемо: видит кружки разных matha.

4. Проверка alias:
- `?matha=...`, `?madh=...`, `?math=...`.
- Ожидаемо: приоритет `matha > madh > math`.

## Expiry / scheduler

1. Создать кружок с близким `expiresAt` в прошлом/близко к now.
- Ожидаемо: после scheduler-run статус становится `expired`.

2. Запрос interactions/boost на expired кружок.
- Ожидаемо: `409`, `code=CIRCLE_EXPIRED`.

3. `GET /api/video-circles?status=active`.
- Ожидаемо: expired кружок в выдаче отсутствует.

## Tariffs admin

1. `POST /api/admin/video-tariffs` (admin token).
- Ожидаемо: `201`.

2. `PUT /api/admin/video-tariffs/:id` изменить `priceLkm`/`durationMinutes`.
- Ожидаемо: `200`, новые значения возвращаются.

3. `GET /api/video-tariffs`.
- Ожидаемо: отражает обновленные значения.

4. Повторить boost после изменения тарифа.
- Ожидаемо: `chargedLkm` соответствует новому тарифу.

## RN UI smoke

1. `VideoCirclesScreen`:
- таймер уменьшается каждую секунду.
- кнопки like/comment/chat обновляют счетчики.
- фильтры `city/matha/category/status` работают.

2. `MyVideoCirclesScreen`:
- отображает кружки пользователя.
- edit modal сохраняет изменения.
- republish продлевает expiry.
- delete удаляет из списка.

3. `VideoTariffsAdminScreen` (admin/superadmin):
- список тарифов загружается.
- create/edit работает и отображает актуальные значения.
