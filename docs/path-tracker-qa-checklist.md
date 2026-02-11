# Path Tracker QA Checklist (MVP + Phase 3)

## Test setup
- API and DB are up.
- Test user token available (`USER_TOKEN`).
- Admin token available (`ADMIN_TOKEN`) for observability checks.
- Feature settings:
  - `PATH_TRACKER_ENABLED=true`
  - `PATH_TRACKER_ROLLOUT_PERCENT` allows the test user, or user is in allowlist.

## Automated API smoke
1. Run:
   - `USER_TOKEN=... ADMIN_TOKEN=... API_BASE=http://localhost:8081/api ./script/path_tracker_smoke.sh`
2. Expected:
   - all core endpoints pass (`today/checkin/generate/assistant/complete/reflect/weekly-summary`)
   - unlock endpoints pass (`unlock-status/unlock-opened`)
   - admin endpoints pass (metrics/analytics/ops/alerts) when admin token is provided

## Manual app smoke (mobile)
1. Open Portal and enter `Path Tracker`.
2. Complete full day flow:
   - state check-in
   - generate step
   - complete step
   - reflection
3. Verify:
   - exactly one active step per day
   - no punitive text after skips
   - role tone is correct (`user / in_goodness / yogi / devotee`)
   - suggested unlock section appears as one context recommendation

## Offline + retry acceptance
1. Generate daily step online.
2. Disable network on device.
3. Complete and reflect offline.
4. Re-open tracker:
   - app should show cached today state
   - completion/reflection should be queued locally
5. Re-enable network and refresh:
   - queued `complete/reflect` must be delivered
   - server state must match local actions

## Rollout acceptance
1. Set `PATH_TRACKER_ROLLOUT_PERCENT=0`.
2. Verify user endpoints return `PATH_TRACKER_NOT_IN_ROLLOUT`.
3. Add user ID to `PATH_TRACKER_ROLLOUT_ALLOWLIST`.
4. Verify user regains access.
5. Add same user ID to denylist.
6. Verify denylist has priority (user blocked).

## Phase 3 acceptance
1. Set `PATH_TRACKER_PHASE3_EXPERIMENT=split`.
2. For test users across different buckets:
   - inspect `today.state.phase3Variant`
   - verify step formats differ by variant tendencies
3. Confirm analytics/ops remain stable under variant split.

## Observability acceptance
1. In admin dashboard:
   - `Path Tracker Ops` block is populated
   - alert rates and rollout settings displayed
2. In alert history:
   - filtering/sorting/pagination work
   - retry single and bulk retry work
   - CSV export reflects current filters/sort/page

## Release gate (must pass)
- Automated smoke script passes with `FAIL=0`.
- Manual mobile flow passes for at least 2 roles.
- Offline/retry scenario passes on at least one device.
- No active critical alerts in the last 1 hour before rollout increase.
