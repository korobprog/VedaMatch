# Push Notifications Runbook

Date: 2026-02-14

## 1. Key configuration
- Primary source: system setting `FCM_SERVER_KEY` (Admin -> Settings).
- Fallback source: environment variable `FCM_SERVER_KEY`.
- Runtime check: `GET /api/admin/push/health` returns `fcmConfigured` and `fcmKeySource`.

## 2. Token registration model
- New table: `user_device_tokens`.
- Legacy compatibility: `users.push_token` is still written and read as fallback.
- Registration endpoint: `POST /api/push-tokens/register`.
- Unregistration endpoint: `POST /api/push-tokens/unregister`.
- Legacy endpoint: `PUT /api/update-push-token` (dual-write active).

## 3. Manual test push
- Endpoint: `POST /api/admin/push/test`.
- Auth: admin JWT.

Example by user id:
```bash
curl -X POST "$API_URL/api/admin/push/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":123,"title":"Test","body":"Test delivery"}'
```

Example by raw token:
```bash
curl -X POST "$API_URL/api/admin/push/test" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"token":"<push-token>","title":"Test","body":"Token delivery check"}'
```

## 4. Delivery health diagnostics
- Endpoint: `GET /api/admin/push/health?window_hours=24`.
- Main metrics:
  - `delivery_success_rate`
  - `invalid_token_rate`
  - `retry_rate`
  - `latency_p95`

Interpretation:
- Rising `invalid_token_rate`: tokens are stale; check app reinstall churn and token refresh flow.
- Rising `retry_rate`: provider/network instability; monitor infra and outbound connectivity.
- Low `delivery_success_rate`: inspect provider key validity and endpoint responses.

## 5. Incident checklist: "push not delivered"
1. Verify `fcmConfigured=true` and `fcmKeySource` expected.
2. Verify target user has active row(s) in `user_device_tokens` (`invalidated_at IS NULL`).
3. Run `/api/admin/push/test` for the same user/token.
4. Inspect `push_delivery_events` for status (`success|retry|invalid|failed`).
5. If token invalidated, require app relaunch/login to re-register token.

## 6. Rollout safety notes
- Keep dual-write/dual-read enabled during mobile rollout.
- Enable retry/invalid cleanup gradually and monitor `invalid_token_rate`.
- Promote to 100% only after stable booking/news/wallet smoke tests.
