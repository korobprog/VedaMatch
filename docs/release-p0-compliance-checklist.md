# Release P0 Compliance Checklist (App Store + Google Play)

## 1) Account deletion
- [ ] In-app entry point exists in Settings: `Delete account`.
- [ ] Endpoint implemented: `DELETE /api/account`.
- [ ] Optional scheduling endpoint implemented: `POST /api/account/deletion-request`.
- [ ] API response contract:
  - Success: `{ success: true, status: "deleted|scheduled", effectiveAt?: string }`
  - Error: `{ error: string, code: string }`
- [ ] Session invalidation verified (refresh sessions revoked).
- [ ] Push tokens invalidated.
- [ ] User PII anonymized and account soft-deleted.

## 2) Privacy & Terms visibility
- [ ] Registration screen has clickable links to:
  - `Privacy Policy`
  - `Terms of Use`
- [ ] Registration submission is blocked until user explicitly opens:
  - `Privacy Policy`
  - `Terms of Use`
- [ ] Legal docs доступны в трех языках (EN/HI/RU) по публичным HTTPS URL.
- [ ] Settings screen has clickable links to:
  - `Privacy Policy`
  - `Terms of Use`
- [ ] Account deletion web URL is accessible over HTTPS.

## 3) Android transport/security
- [ ] `cleartextTrafficPermitted` is not enabled in main/release manifest.
- [ ] Cleartext/debug network config exists only in `src/debug`.
- [ ] Sensitive permissions minimized for release:
  - Removed: `CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS`.

## 4) iOS transport/security
- [ ] Removed dev/local ATS exception domains from release plist.
- [ ] ATS is strict by default (`NSAllowsArbitraryLoads=false`).
- [ ] Media exceptions are explicitly reviewed and justified.

## 5) Release identity/versioning
- [ ] iOS bundle id is production value (not template).
- [ ] iOS `MARKETING_VERSION` and `CURRENT_PROJECT_VERSION` are bumped.
- [ ] Android `versionCode` and `versionName` are bumped.
- [ ] Signing profiles/keys validated for release lanes.

## 6) Store console metadata
- [ ] App Store Review Notes updated with LKM non-monetary wording.
- [ ] Review notes explicitly state: `LKM are not legal tender / not payment instrument`.
- [ ] App Store notes include account deletion location.
- [ ] Google Play Data safety updated (actual collected/processed data).
- [ ] Google Play permissions declarations aligned with manifest.

## 7) Smoke tests before submission
- [ ] New install -> register -> basic app flow.
- [ ] Privacy/Terms links open.
- [ ] Delete account flow works end-to-end.
- [ ] Deleted user cannot continue old session.
- [ ] No release-blocking crashes in primary journey.
