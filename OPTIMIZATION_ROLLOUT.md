# Optimization Rollout Runbook (Vedamatch)

## Target flags

Server (Dokploy / backend env):
- `FF_REDIS_RATE_LIMIT`
- `FF_HTTP_CONDITIONAL_CACHE`
- `FF_CONTACTS_LEGACY_MODE`

Frontend (RN env):
- `FF_QUERY_LAYER`
- `FF_FLASHLIST_NEWS`
- `FF_FLASHLIST_SERVICES`

## Stage 0: Baseline

1. Keep flags in safe defaults:
   - `FF_REDIS_RATE_LIMIT=off`
   - `FF_HTTP_CONDITIONAL_CACHE=off`
   - `FF_CONTACTS_LEGACY_MODE=on`
2. Run load profile and save baseline summary:
   ```bash
   BASE_URL="https://api.vedamatch.ru" \
   ./server/scripts/k6/run_profile.sh baseline
   ```
3. Preflight check for public routes (must not return `401`):
   ```bash
   BASE_URL="https://api.vedamatch.ru" \
   ./server/scripts/k6/preflight_public_endpoints.sh
   ```
4. Optional authenticated baseline (`mixed`) for private paths:
   ```bash
   BASE_URL="https://api.vedamatch.ru" \
   AUTH_TOKEN="<jwt_token>" \
   ./server/scripts/k6/run_profile.sh mixed
   ```
5. Save p95 and error rates from:
   - `server/scripts/k6/results/*.summary.json`
6. If preflight returns `401` on public endpoints (`/api/services`, `/api/news/:id`, etc), verify route order:
   - public conflict routes must be registered **before** `protected := api.Group("/", middleware.Protected())`.

## Stage 1: 20% rollout

1. Enable backend flags on 20% traffic slice:
   - `FF_REDIS_RATE_LIMIT=on`
   - `FF_HTTP_CONDITIONAL_CACHE=on`
   - `FF_CONTACTS_LEGACY_MODE=on`
2. Keep frontend flags enabled:
   - `FF_QUERY_LAYER=true`
   - `FF_FLASHLIST_NEWS=true`
   - `FF_FLASHLIST_SERVICES=true`
3. Monitor for 30-60 minutes:
   - p95 `/api/news`, `/api/services`, `/api/feed`
   - 5xx rate
   - 429 rate
   - DB CPU + slow queries

## Stage 2: 50% rollout

1. Increase to 50% only if Stage 1 is stable.
2. Run stress profile:
   ```bash
   BASE_URL="https://api.vedamatch.ru" \
   AUTH_TOKEN="<jwt_token>" \
   ./server/scripts/k6/run_profile.sh stress
   ```
3. Validate `status_304_total` growth (ETag effectiveness).

## Stage 3: 100% rollout

1. Move to 100% traffic.
2. Keep `FF_CONTACTS_LEGACY_MODE=on` for transition window (2-4 weeks).
3. After migration window:
   - Set `FF_CONTACTS_LEGACY_MODE=off`
   - Run `mixed` profile again and compare to baseline.

## Rollback

Immediate rollback switches:
- `FF_REDIS_RATE_LIMIT=off`
- `FF_HTTP_CONDITIONAL_CACHE=off`
- `FF_CONTACTS_LEGACY_MODE=on`

Frontend rollback:
- `FF_FLASHLIST_NEWS=false`
- `FF_FLASHLIST_SERVICES=false`

## Acceptance checklist

- Client request count reduced >= 35%.
- p95 reduced >= 25% on hot endpoints.
- Heartbeat DB writes reduced >= 70%.
- No restart loops / OOM after limits.
