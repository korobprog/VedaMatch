# k6 Hot Endpoints Profiles

Файл: `scripts/k6/hot_endpoints.js`

Покрывает горячие маршруты плана оптимизации:
- `GET /api/news`
- `GET /api/services`
- `GET /api/feed`
- `GET /api/contacts`
- `POST /api/heartbeat`
- Conditional cache revalidation (`If-None-Match` -> `304`)

## 1) Public-only smoke

```bash
BASE_URL="https://api.your-domain.com" \
DURATION="1m" \
PUBLIC_RPS=10 \
ENABLE_AUTH=0 \
k6 run scripts/k6/hot_endpoints.js
```

## 2) Mixed profile (public + auth)

```bash
BASE_URL="https://api.your-domain.com" \
DURATION="3m" \
PUBLIC_RPS=25 \
ENABLE_AUTH=1 \
ENABLE_CONDITIONAL_CACHE=1 \
AUTH_TOKEN="<jwt_token>" \
AUTH_VUS=8 \
k6 run scripts/k6/hot_endpoints.js
```

## 3) Stress profile

```bash
BASE_URL="https://api.your-domain.com" \
DURATION="5m" \
PUBLIC_RPS=60 \
PUBLIC_PREALLOCATED_VUS=60 \
PUBLIC_MAX_VUS=250 \
ENABLE_AUTH=1 \
ENABLE_CONDITIONAL_CACHE=1 \
CACHE_VUS=8 \
AUTH_TOKEN="<jwt_token>" \
AUTH_VUS=20 \
k6 run scripts/k6/hot_endpoints.js
```

## 4) Cache-only probe (ETag/304)

```bash
BASE_URL="https://api.your-domain.com" \
DURATION="2m" \
PUBLIC_RPS=0 \
ENABLE_AUTH=0 \
ENABLE_CONDITIONAL_CACHE=1 \
CACHE_VUS=6 \
k6 run scripts/k6/hot_endpoints.js
```

## 5) Запуск без локального k6 (через Docker)

```bash
docker run --rm -i \
  -e BASE_URL="https://api.your-domain.com" \
  -e DURATION="3m" \
  -e PUBLIC_RPS=25 \
  -e ENABLE_AUTH=1 \
  -e AUTH_TOKEN="<jwt_token>" \
  -e ENABLE_CONDITIONAL_CACHE=1 \
  -v "$(pwd):/work" \
  grafana/k6 run /work/scripts/k6/hot_endpoints.js
```

## 6) Быстрый запуск профилей (wrapper script)

```bash
# baseline | mixed | stress | cache
BASE_URL="https://api.your-domain.com" \
AUTH_TOKEN="<jwt_token>" \
./server/scripts/k6/run_profile.sh mixed
```

Результат сохраняется в `server/scripts/k6/results/*.summary.json`.
Профильные дефолты применяются автоматически (`baseline` отключает auth/conditional-cache и снижает RPS, `stress` повышает нагрузку).
По умолчанию `ALLOW_THRESHOLD_FAILURE=1`: если threshold пересечен, script не падает, а сохраняет summary для анализа.

## 7) Preflight публичных endpoint

```bash
BASE_URL="https://api.your-domain.com" \
./server/scripts/k6/preflight_public_endpoints.sh
```

## Важные замечания

- Для auth-сценария нужен валидный `AUTH_TOKEN`.
- `429 Too Many Requests` считается допустимым ответом (лимитер работает ожидаемо).
- Сравнивайте p95 до/после изменений по одинаковым параметрам `RPS/VUS/DURATION`.
- Для ETag проверяйте метрику `status_304_total`: после включения conditional cache она должна расти.
- Для сетевых проблем анализируйте `transport_errors_total` (timeouts/EOF и т.п. с `status=0`).
- Для ответов портала проверяйте `unexpected_status_total`, `status_5xx_total`, `status_4xx_other_total`.
- Для быстрой диагностики 4xx доступны отдельные счетчики: `status_401_total`, `status_403_total`, `status_404_total`.
