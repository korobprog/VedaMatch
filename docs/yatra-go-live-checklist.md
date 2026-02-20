# Yatra Go-Live Checklist

Цель: безопасный релиз пути `publish -> join -> approve/reject -> chat -> push`.

## A. Pre-release

- [ ] Backend tests:
  - [ ] `go test ./internal/services -run Yatra -count=1`
  - [ ] `go test ./internal/handlers -run Yatra -count=1`
- [ ] Smoke script готов к запуску:
  - [ ] `/Users/mamu/Documents/vedicai/script/yatra_user_path_smoke.sh`
- [ ] Миграции/схема актуальны в staging.

## B. Staging validation

- [ ] Запустить automated smoke:
  - [ ] `FAIL=0`
- [ ] Пройти manual mobile smoke по `/Users/mamu/Documents/vedicai/docs/yatra-user-path-qa-checklist.md`
- [ ] Проверить admin push-health:
  - [ ] `GET /api/admin/push/health/yatra?window_hours=24`
  - [ ] `status != critical`
  - [ ] Нет аномальных `failed_events`/`retry_rate`

## C. Release gate

- [ ] Нет открытых P0/P1 дефектов по Yatra path.
- [ ] Подтверждена корректная видимость/блокировка иконки travel в портале.
- [ ] Deep-link из yatra push корректно открывает `YatraDetail`/`RoomChat`.

## D. Post-release (first 24h)

- [ ] Мониторить `GET /api/admin/push/health/yatra?window_hours=24` каждые 2-4 часа.
- [ ] Если `status=critical`:
  - [ ] остановить rollout;
  - [ ] проверить provider credentials и token invalidation;
  - [ ] повторно прогнать smoke и зафиксировать RCA.
- [ ] Зафиксировать итоги запуска и проблемы в release notes.
