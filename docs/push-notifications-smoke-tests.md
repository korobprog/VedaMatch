# Push Notifications Smoke Tests

Date: 2026-02-14

## Staging smoke checklist

### Booking -> provider push
1. Client creates a booking.
2. Provider receives push with `type=new_booking`.
3. Tap navigates to `IncomingBookings`.

### News important -> subscribers push
1. User subscribes to news source.
2. Admin publishes important news.
3. Subscriber receives push with `type=news` and `newsId`.

### Wallet bonus -> user push
1. Trigger bonus accrual.
2. User receives push with `type=wallet_bonus`.
3. Tap navigates to `Wallet`.

## Canary checks
- Delivery success rate must not drop below baseline.
- Invalid token rate should stay controlled after token refresh rollout.
- Retry rate spikes should be investigated before full rollout.
