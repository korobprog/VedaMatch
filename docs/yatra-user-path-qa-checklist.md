# Yatra QA Checklist (User Path E2E)

Окружение: `staging` (предпочтительно) или локальный `http://localhost:8081/api`.

## 1) Automated API smoke

Сценарий покрывает путь `publish -> join -> approve/reject -> chat -> broadcast -> remove`.

Скрипт:
- `/Users/mamu/Documents/vedicai/script/yatra_user_path_smoke.sh`

Пример запуска:

```bash
API_BASE="https://staging-api.example.com/api" \
ORGANIZER_TOKEN="..." \
PILGRIM_TOKEN="..." \
SECOND_PILGRIM_TOKEN="..." \
ADMIN_TOKEN="..." \
/Users/mamu/Documents/vedicai/script/yatra_user_path_smoke.sh
```

Критерий PASS:
- В конце `FAIL=0`.

## 2) Manual mobile smoke

Проверить на iOS и Android:

1. Organizer публикует draft Yatra.
2. Pilgrim отправляет join request и видит `pending`.
3. Organizer одобряет заявку.
4. Pilgrim видит `approved` и кнопку входа в чат.
5. Открытие чата работает (нет ошибок доступа).
6. Organizer отправляет broadcast участникам.
7. Pilgrim получает push и корректный deep-link.
8. Organizer удаляет participant.
9. Удаленный participant теряет доступ к чату.
10. (Опционально) второй Pilgrim проходит reject path и получает соответствующий статус/push.

## 3) Portal UX check (icon visibility)

Для `seeker` с неполным профилем:

1. В портале travel/yatra зона не активна.
2. Есть явное объяснение: модуль откроется после завершения профиля.
3. Пользовательский текст не выглядит как техническая ошибка.

## 4) Admin observability checks

Проверить endpoint:

- `GET /api/admin/push/health/yatra?window_hours=24`

Ожидания:

1. Ответ `200`.
2. `event_prefix = "yatra_"`.
3. Присутствуют поля:
   - `delivery_success_rate`
   - `retry_rate`
   - `invalid_token_rate`
   - `failed_events`
   - `alerts`
   - `status`
4. Нет массовых high-alerts при нормальной нагрузке.

## 5) Acceptance minimum

1. Все P0 шаги по пути проходят без ручных обходов.
2. Нет P0/P1 багов в связке `publish/join/approve-reject/chat/push`.
3. Push health по `yatra_*` не в критическом состоянии в окне запуска.
