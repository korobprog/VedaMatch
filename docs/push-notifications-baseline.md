# Push Notifications Baseline (Wave 1)

Date: 2026-02-14

## Known pre-wave gaps (documented)
- Single-token storage in `users.push_token` (no multi-device model).
- No dedicated token refresh registration path.
- Admin notifications payload compatibility mismatch (`read/linkTo` vs `isRead/link`).
- Invalid tokens are not automatically invalidated based on provider responses.

## Baseline acceptance checklist (before rollout)

### 1. Booking push
1. Create booking from user A to provider B.
2. Verify provider device receives `new_booking` push.
3. Verify tap opens expected screen (`IncomingBookings`).

Expected:
- Push arrives within normal delay window.
- Payload includes `type`, `bookingId`, `screen`.

### 2. News important push
1. User subscribes to news source.
2. Publish important news item from admin.
3. Verify subscriber receives push with `newsId`.

Expected:
- Push only sent for `isImportant=true`.
- Tap opens news flow.

### 3. Wallet bonus push
1. Trigger wallet bonus accrual.
2. Verify recipient receives `wallet_bonus` push.
3. Verify tap opens wallet screen.

Expected:
- Payload includes `type=wallet_bonus`, `amount`, `screen=Wallet`.

## Baseline report template
- Environment:
- iOS version/build:
- Android version/build:
- Admin Web commit/build:
- Scenario results (pass/fail):
  - Booking:
  - News important:
  - Wallet bonus:
- Notes/log references:
