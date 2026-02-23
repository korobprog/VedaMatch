# k6 Hot Endpoints Profiles

Файл: `scripts/k6/hot_endpoints.js`

Покрывает горячие маршруты плана оптимизации:
- `GET /api/news`
- `GET /api/services`
- `GET /api/feed`
- `GET /api/contacts`
- `POST /api/heartbeat`

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
AUTH_TOKEN="<jwt_token>" \
AUTH_VUS=20 \
k6 run scripts/k6/hot_endpoints.js
```

## Важные замечания

- Для auth-сценария нужен валидный `AUTH_TOKEN`.
- `429 Too Many Requests` считается допустимым ответом (лимитер работает ожидаемо).
- Сравнивайте p95 до/после изменений по одинаковым параметрам `RPS/VUS/DURATION`.
