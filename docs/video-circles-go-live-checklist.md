# Video Circles Go-Live Checklist

Дата: 2026-02-09  
Область: `Video Circles + God Mode + Billing/Expiry`

## 1) Pre-flight

- [ ] Backend deployed with latest changes.
- [ ] Mobile build contains:
- `VideoCirclesScreen`
- `MyVideoCirclesScreen`
- `VideoTariffsAdminScreen`
- [ ] DB migrations applied:
- `video_circles`
- `video_circle_interactions`
- `video_tariffs`
- `video_circle_billing_logs`
- partial unique like index
- [ ] Scheduler service enabled in target environment.
- [ ] S3 credentials and bucket permissions valid.

## 2) Auth and access policy

- [ ] Public `/api/register` does not allow admin role assignment (returns `403`).
- [ ] Admin routes available only for `admin/superadmin`:
- `POST /api/admin/video-tariffs`
- `PUT /api/admin/video-tariffs/:id`
- `POST /api/admin/wallet/charge`
- [ ] God mode visibility verified for `godModeEnabled=true`.

## 3) API smoke (automated)

Script:

- `/Users/mamu/Documents/vedicai/script/video_circles_smoke.sh`

Run:

```bash
API_BASE="http://<host>:8000/api" \
USER_TOKEN="<user_jwt>" \
ADMIN_TOKEN="<admin_jwt>" \
bash /Users/mamu/Documents/vedicai/script/video_circles_smoke.sh
```

Expected:

- [ ] `PASS` summary with `FAIL=0`.
- [ ] Includes admin tariff update step (`PUT /admin/video-tariffs/:id`).

## 4) Manual QA (functional)

Reference:

- `/Users/mamu/Documents/vedicai/docs/video-circles-qa-checklist.md`

Mandatory pass cases:

- [ ] Matha restriction for regular users.
- [ ] Role-type restriction by default (`role=user.role`) for regular users.
- [ ] `role_scope` filter works inside current matha for regular users.
- [ ] `scope=friends` works and combines with role/matha policy.
- [ ] God mode / superadmin sees cross-matha feed.
- [ ] Interactions (`like/comment/chat`) update counters correctly.
- [ ] `legacy /api/interactions` still works.
- [ ] `republish` and `delete` lifecycle works from “My circles”.
- [ ] Expired circles are hidden from active feed.
- [ ] Admin tariff update reflected in `GET /api/video-tariffs`.
- [ ] Paid boost path decreases wallet balance.
- [ ] Insufficient LKM path returns `402 + INSUFFICIENT_LKM`.
- [ ] Portal supports `Кружки` tile and widgets (`circles_quick`, `circles_panel`).
- [ ] Camera capture flow available from Video Circles create action.

## 5) Scheduler and expiry checks

- [ ] `video_circle_expiry` task registered and running.
- [ ] Expired circles transition to `status=expired`.
- [ ] Cleanup errors do not revert expired status.
- [ ] Re-run scheduler is idempotent (no crashes on already cleaned objects).

## 6) Observability / alerts

- [ ] Logs visible for:
- `circle_list`
- `circle_interaction`
- `circle_boost`
- `circle_expire`
- `circle_s3_cleanup`
- [ ] Alert rules active:
- elevated `circle_s3_cleanup` failures
- elevated `circle_expire` errors
- unusual spike `INSUFFICIENT_LKM`

## 7) Rollback readiness

- [ ] Feature rollback owner assigned.
- [ ] DB rollback strategy documented (no destructive rollback without backup).
- [ ] Emergency toggle plan prepared (disable screen entry / hide feature).

## 8) Release communication

- [ ] Backend release notes sent.
- [ ] Mobile release notes sent.
- [ ] QA sign-off captured.
- [ ] Support/ops informed about expected error codes:
- `CIRCLE_EXPIRED`
- `INSUFFICIENT_LKM`

## 9) GO / NO-GO decision

GO only if all are true:

- [ ] Automated smoke `FAIL=0`
- [ ] Manual QA mandatory cases passed
- [ ] Scheduler checks passed
- [ ] Observability and alerts confirmed

Decision:

- [ ] GO
- [ ] NO-GO

Owner: ____________________  
Date/Time: ____________________
