# Path Tracker Ops Runbook

## Scope
- Service: `path_tracker`
- API namespace: `/api/path-tracker/*` and `/api/admin/path-tracker/*`
- Key dashboards: Admin `Path Tracker Ops`, `Path Tracker Alerts`, `Path Tracker Trend`

## Runtime configuration
- `PATH_TRACKER_ENABLED`: global on/off.
- `PATH_TRACKER_ROLLOUT_PERCENT`: rollout percentage (`0..100`).
- `PATH_TRACKER_ROLLOUT_ALLOWLIST`: comma-separated user IDs force-enabled.
- `PATH_TRACKER_ROLLOUT_DENYLIST`: comma-separated user IDs force-disabled.
- `PATH_TRACKER_ALERT_WEBHOOK_URL`: webhook target for alert delivery.

## Health checks
- `GET /api/admin/path-tracker/ops`
- `GET /api/admin/path-tracker/analytics?days=14`
- `GET /api/admin/path-tracker/alerts?page=1&pageSize=20`

## Alert thresholds
- Fallback alert: `fallbackRate1h > 20%`
- Generate-step error alert: `generateErrorRate15m > 5%`

## Response playbook
1. Confirm symptom in `Path Tracker Ops`:
   - `recentFailedAlerts1h`
   - `signals.fallbackTriggered`
   - `signals.generateErrorTriggered`
2. Check delivery details in `Path Tracker Alert History`:
   - filter `status=failed`
   - inspect `errorText`
3. If webhook failures dominate:
   - verify `PATH_TRACKER_ALERT_WEBHOOK_URL`
   - run `Retry failed (1h)` from admin
4. If LLM fallback spikes:
   - verify AI provider keys/models
   - temporarily reduce exposure: lower `PATH_TRACKER_ROLLOUT_PERCENT`
5. If generate-step errors spike:
   - inspect API logs around `/path-tracker/generate-step`
   - if needed, rollback rollout to `0%` (except allowlist)

## Controlled rollout procedure
1. Start with `PATH_TRACKER_ROLLOUT_PERCENT=5`
2. Observe for 30-60 minutes:
   - fallback and generate-step error rates
   - step completion trend
3. Increase in stages: `5% -> 15% -> 35% -> 60% -> 100%`
4. At each stage, keep denylist for problematic accounts and use allowlist for QA users.

## Incident communication template
- `time_utc`
- `impact` (users/cohorts affected)
- `symptom` (fallback spike / generate-step errors / webhook failures)
- `mitigation` (rollout reduced, retry run, webhook fixed)
- `next_update_eta`

## Post-incident checklist
- Export current alerts CSV from dashboard.
- Attach trend screenshots and alert history.
- Record root cause and permanent fix.
- Update this runbook if process changes.
