# Channels V1 Go-Live Checklist

## 1. Scope
- Release: `channels_v1` (MVP + shipped add-ons)
- In scope:
  - Channels + feed
  - Post lifecycle (`draft/scheduled/published`)
  - Pin/unpin
  - CTA (`order_products`, `book_service`)
  - Channel showcases
  - Promoted ads in feed (`promotedAds`, `promotedInsertEvery`)
  - Source attribution for orders/bookings (`source/sourcePostId/sourceChannelId`)

## 2. Preflight (must pass)
- [ ] Backend tests green: `go test ./...` in `/server`
- [ ] Frontend type-check green: `npx tsc --noEmit` in `/frontend`
- [ ] CTA unit tests green:
  - `frontend/__tests__/screens/portal/services/channels/channelCta.test.ts`
- [ ] Feed interleaving tests green:
  - `frontend/__tests__/screens/portal/services/channels/ChannelsHubScreen.test.tsx`
- [ ] Handler contract tests green:
  - `server/internal/handlers/channel_handler_test.go`
  - `server/internal/handlers/order_handler_test.go`
  - `server/internal/handlers/booking_handler_test.go`
- [ ] Weekly schedule routes available (services preflight):
  - `GET /api/services/:id/schedule/weekly`
  - `PUT /api/services/:id/schedule/weekly`

## 3. Runtime Configuration
Set/verify `SystemSetting` keys:
- [ ] `CHANNELS_V1_ENABLED=true`
- [ ] `CHANNELS_V1_ROLLOUT_PERCENT` (stage-dependent)
- [ ] `CHANNELS_V1_ROLLOUT_ALLOWLIST` (comma-separated user IDs)
- [ ] `CHANNELS_V1_ROLLOUT_DENYLIST` (comma-separated user IDs)
- [ ] `CHANNELS_PROMOTED_DAILY_CAP`
- [ ] `CHANNELS_PROMOTED_AD_COOLDOWN_HOURS`
- [ ] `CHANNELS_PROMOTED_INSERT_EVERY`

Rollout priority is:
1. denylist
2. allowlist
3. rollout percent

## 4. Stage Rollout

### Stage 1 (internal testers)
- [ ] `CHANNELS_V1_ROLLOUT_PERCENT=0`
- [ ] Fill `CHANNELS_V1_ROLLOUT_ALLOWLIST` with internal IDs
- [ ] Smoke check as allowlisted and non-allowlisted users

### Stage 2 (limited authors)
- [ ] Keep `CHANNELS_V1_ROLLOUT_PERCENT=0` or low (`5-10`) depending on strategy
- [ ] Expand allowlist to pilot authors
- [ ] Add known problematic users to `CHANNELS_V1_ROLLOUT_DENYLIST` if needed

### Stage 3 (general release)
- [ ] Increase `CHANNELS_V1_ROLLOUT_PERCENT` gradually to `100`
- [ ] Clear stale entries from `ALLOWLIST` and `DENYLIST`
- [ ] Confirm no sustained error spike in channels endpoints

## 5. Manual Acceptance Checklist

### Core content and lifecycle
- [ ] Publish flow: `draft -> published` appears in feed
- [ ] Schedule flow: `draft -> scheduled` and auto-publish once at `scheduledAt`
- [ ] Pin flow: pinning a new post unpins previous post in same channel

### CTA and conversion
- [ ] `order_products` CTA opens checkout with correct items and attribution
- [ ] Order is created with `source='channel_post'`, `sourcePostId`, `sourceChannelId`
- [ ] `book_service` CTA opens booking flow with attribution
- [ ] Booking is created with same source attribution fields

### Roles and permissions
- [ ] `editor` cannot manage branding/roles/pin
- [ ] `admin` can publish/schedule/pin/showcases
- [ ] `owner` can do all channel actions

### Showcases and brand
- [ ] Showcase filtering works (products/services by category/manual list)
- [ ] Channel branding fields visible and editable by allowed roles

### Feed promotions
- [ ] `GET /api/feed` returns `promotedAds` and `promotedInsertEvery`
- [ ] UI interleaving follows backend `promotedInsertEvery`
- [ ] Promoted ad click tracking endpoint works (`POST /api/channels/promoted-ads/:adId/click`)

### Regression checks
- [ ] Existing `Services`, `Market`, `MyOrders`, `SellerOrders` flows work unchanged

## 6. Observability
Track these counters in admin/metrics:
- [ ] `channel_posts_published_total`
- [ ] `channel_posts_scheduled_total`
- [ ] `channel_cta_click_total`
- [ ] `orders_from_channel_total`
- [ ] `bookings_from_channel_total`
- [ ] `promoted_ads_served_total`
- [ ] `promoted_ads_clicked_total`

Operational watchouts:
- [ ] Sudden drop in `orders_from_channel_total` with stable `channel_cta_click_total`
- [ ] Sudden drop in `bookings_from_channel_total` with stable `channel_cta_click_total`
- [ ] Rapid growth in promoted served without clicks

## 7. Rollback Plan
Fast rollback options:
1. [ ] Global off: `CHANNELS_V1_ENABLED=false`
2. [ ] Traffic cut: `CHANNELS_V1_ROLLOUT_PERCENT=0`
3. [ ] Targeted mitigation: add problematic IDs to `CHANNELS_V1_ROLLOUT_DENYLIST`
4. [ ] Promo mitigation only:
   - set `CHANNELS_PROMOTED_DAILY_CAP=0` to disable promoted injections

Post-rollback:
- [ ] Verify `/api/feed` still returns posts correctly
- [ ] Verify legacy service/market/order/booking flows remain healthy

## 8. Release Sign-off
- [ ] Backend owner sign-off
- [ ] Frontend owner sign-off
- [ ] QA sign-off
- [ ] Product sign-off
- [ ] Rollout owner sign-off

Release date (UTC): `_____________`
Release commit/tag: `_____________`
Owner on-call: `_____________`
