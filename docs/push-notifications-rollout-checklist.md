# Push Notifications Rollout Checklist

Date: 2026-02-14
Scope: Wave 1 stabilization (`FCM legacy`, multi-device tokens, admin compatibility, delivery observability)

## 0. Pre-deploy gates
- Ensure release branch includes:
  - `POST /api/admin/push/test`
  - `GET /api/admin/push/health`
  - `POST /api/push-tokens/register`
  - `POST /api/push-tokens/unregister`
  - legacy `PUT /api/update-push-token` dual-write behavior
- Confirm DB migration target includes:
  - `user_device_tokens`
  - `push_delivery_events`
- Confirm baseline scenarios documented and reproducible:
  - booking push
  - important news push
  - wallet bonus push

## 1. Deploy sequence (no downtime)
1. Deploy backend with Stage 1 + Stage 2 features enabled by default (dual-read/dual-write fallback).
2. Verify admin settings and key source:
   - Open admin settings and set `FCM_SERVER_KEY`.
   - Call `GET /api/admin/push/health` and confirm `fcmConfigured=true` and expected `fcmKeySource`.
3. Deploy admin web update:
   - verify notifications page works with `admin_data.token`.
   - verify bell/notifications read state for both `read/isRead`, `linkTo/link`.
4. Deploy mobile build with `onTokenRefresh` and background message handler.
5. After mobile adoption starts, monitor token growth in `user_device_tokens` and fallback usage decrease.
6. Enable stricter invalid-token cleanup + retry behavior (already active in code path) and monitor metrics.

## 2. Staging validation (must pass before canary)

### A. Admin diagnostics
- `POST /api/admin/push/test` by `userId` returns `{ok:true}`.
- `POST /api/admin/push/test` by raw `token` returns `{ok:true}`.
- `GET /api/admin/push/health?window_hours=24` returns non-error payload with rates.

### B. Token lifecycle
- Login/register device -> `POST /api/push-tokens/register` stores one active row.
- Re-register same token -> no duplicate rows (`UNIQUE(user_id, token)` preserved).
- Unregister by token/deviceId -> `invalidated_at` set and legacy `users.push_token` cleared if matching.

### C. Business smoke
- Booking created -> provider receives push + expected navigation.
- Important news published -> subscriber receives push + expected navigation.
- Wallet bonus -> user receives push + expected navigation.

## 3. Canary rollout (production)
- Recommended schedule:
  1. Canary 10% traffic for 2-4 hours.
  2. Canary 50% traffic for 4-8 hours.
  3. 100% rollout after stable metrics.
- Monitor continuously:
  - `delivery_success_rate`
  - `invalid_token_rate`
  - `retry_rate`
  - `latency_p95`
- Acceptance threshold for promotion:
  - no sustained drop of success rate below baseline trend
  - no abnormal spike in invalid/retry rate
  - no functional regressions in 3 core scenarios

## 4. Rollback strategy
- If severe degradation:
  1. Keep backend deployed (schema safe, backward-compatible), but stop rollout of new mobile build.
  2. Continue using legacy endpoint (`PUT /api/update-push-token`) from existing clients.
  3. Revert to prior app build if mobile regression is root cause.
- Do not drop new tables during incident response.

## 5. Operational SQL spot checks

### Active tokens per user
```sql
SELECT user_id, COUNT(*) AS active_tokens
FROM user_device_tokens
WHERE invalidated_at IS NULL
GROUP BY user_id
ORDER BY active_tokens DESC
LIMIT 20;
```

### Recent invalidated tokens
```sql
SELECT user_id, provider, platform, updated_at
FROM user_device_tokens
WHERE invalidated_at IS NOT NULL
ORDER BY updated_at DESC
LIMIT 50;
```

### Delivery outcome trend (last 24h)
```sql
SELECT status, COUNT(*) AS cnt
FROM push_delivery_events
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status
ORDER BY cnt DESC;
```

## 6. Post-rollout done criteria
- Admin can run push diagnostics without code access.
- Multi-device delivery confirmed for at least one user with 2+ devices.
- Core smoke scenarios stable on staging and canary-prod.
- Metrics dashboard reflects measurable success/invalid/retry/latency.
