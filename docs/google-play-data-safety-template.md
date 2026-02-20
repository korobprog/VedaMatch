# Google Play Data Safety Template (P0 Draft)

Use this as a fill-in draft in Play Console. Final values must match actual production behavior.

## Data collection map

| Category | Collected | Shared | Required for app functionality | Notes |
|---|---|---|---|---|
| Personal info (Email) | Yes | No | Yes | Auth/account management |
| User content (messages/media) | Yes | No | Yes | Messaging and media features |
| Location (approx/precise) | Yes (when enabled) | No | Optional | Nearby/map features only |
| App info & performance | Yes | No | Yes | Stability and diagnostics |
| Device or other IDs | Yes | No | Yes | Session/push/device association |

## Security practices
- [ ] Data encrypted in transit (HTTPS/WSS)
- [ ] Account deletion mechanism available in-app
- [ ] Data minimization applied for permissions

## Account deletion evidence
- In-app path: `Settings -> Delete account`
- API endpoint: `DELETE /api/account`
- Public page: `https://vedamatch.ru/delete-account`

## LKM policy note (for app content declarations)
- LKM are internal non-monetary engagement points.
- LKM are not legal tender and not a payment instrument.
- LKM cannot be cashed out, transferred for money, or redeemed outside the app.

## Final console consistency checks
- [ ] Matches Android manifest permissions
- [ ] Matches backend endpoints and actual storage
- [ ] Matches privacy policy text and links
