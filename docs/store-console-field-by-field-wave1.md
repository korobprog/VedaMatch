# VedaMatch Wave 1: Field-by-Field Submission Fill Guide (App Store + Google Play)

Status: draft for submission execution  
Verified on: 2026-02-20

This checklist is designed to be pasted into store consoles with minimal edits.

## 0) Fixed URLs and policy endpoints

Use these exact URLs in both stores:

- Privacy (EN): `https://vedamatch.ru/privacy?lang=en`
- Privacy (RU): `https://vedamatch.ru/privacy?lang=ru`
- Privacy (HI): `https://vedamatch.ru/privacy?lang=hi`
- Terms (EN): `https://vedamatch.ru/terms?lang=en`
- Terms (RU): `https://vedamatch.ru/terms?lang=ru`
- Terms (HI): `https://vedamatch.ru/terms?lang=hi`
- Account deletion page: `https://vedamatch.ru/delete-account`

Backend deletion endpoints:

- `DELETE /api/account` (immediate deletion)
- `POST /api/account/deletion-request` (optional scheduled deletion)

## 0.1) Operator identity strategy (current state: no legal entity yet)

- Use current operator model consistently: self-employed individual in the Russian Federation (NPD).
- In legal docs/review notes, do not claim a Kazakhstan legal entity until it is formally created and store account metadata is updated.
- When migration to Kazakhstan legal entity is complete, update legal docs first, then store metadata/review notes, then submit new build.

## 1) App Store Connect: what to fill

### A. App Information

Fill:

- `Privacy Policy URL`:
  - use `https://vedamatch.ru/privacy?lang=en` (main public URL)
- `Support URL`:
  - company support page with active contact methods
- `Marketing URL`:
  - optional product site URL

Notes:

- `Privacy Policy URL` is required.
- Keep URL public, stable, and HTTPS.

### B. App Privacy (Data collection declaration)

Open App Privacy questionnaire and align with actual behavior:

- Data types likely applicable:
  - Contact info: email
  - User content: messages, media, profile text
  - Location: when user enables location features
  - Identifiers: device/session identifiers for auth/push
- Tracking:
  - mark only if actual cross-app tracking is performed
- Data linked to user:
  - mark yes for account/profile linked data

Rule:

- Questionnaire must match runtime behavior and privacy policy text.

### C. Version Metadata (Platform Version Information)

Fill:

- `Description` (localized)
- `What’s New in this Version`
- `Support URL`
- `Copyright`
- Screenshots/App Preview per locale

### D. App Review Information

Fill these fields every submission:

- `Contact: Name, email, phone number`
- `Notes`
- `Sign-in required: Username and password` (if app requires login)

Paste this template into `Notes`:

```text
VedaMatch uses LKM only as internal in-app activity points.

- LKM are non-monetary and non-withdrawable.
- LKM are not legal tender, not electronic money, and not a payment instrument.
- LKM cannot be purchased, sold, exchanged for fiat/crypto, or redeemed outside the app.

Account deletion:
- In-app path: Settings -> Delete account
- API: DELETE /api/account
- Public page: https://vedamatch.ru/delete-account

Legal documents:
- Terms: https://vedamatch.ru/terms?lang=en|hi|ru
- Privacy: https://vedamatch.ru/privacy?lang=en|hi|ru
- Registration requires explicit agreement and opening both links before sign-up.

Permissions:
- Camera/Photos: profile and media attachments
- Microphone: voice/call features
- Location (when in use): nearby/map features
- Push notifications: message and service alerts
```

## 2) Google Play Console: what to fill

### A. App content -> Privacy policy

Fill:

- `Privacy policy URL`: `https://vedamatch.ru/privacy?lang=en`

Requirement:

- URL must be publicly accessible and non-geofenced.

### B. App content -> Data safety

Go to App content -> Data safety -> Start.

#### Data collection and security

Set based on actual implementation:

- `Data encrypted in transit`: Yes
- `Deletion request mechanism available`: Yes
  - in-app deletion entry exists
  - web deletion page exists

#### Data types and purposes

Use actual behavior only (no overclaim):

- Account info (email/profile)
- User content (messages/media)
- Location (if used by map/nearby flows)
- App info/performance
- Device or other IDs (session/push/device binding)

For each data type, choose:

- Collected: yes/no by real behavior
- Shared: yes/no by real behavior
- Purpose(s): app functionality, analytics, account management, etc.
- Optional/required: by flow reality

#### Account deletion section

Set account deletion web URL field:

- `https://vedamatch.ru/delete-account`

Make sure this URL clearly describes:

- how user requests deletion
- what is deleted
- what is retained and for how long

### C. App content -> Sensitive permission declarations

Prepare reviewer-safe explanations for remaining sensitive permissions:

- `RECORD_AUDIO` -> in-app call/voice features
- Location -> nearby/map
- Notification permission -> chat/service notifications
- Call-related permissions (if still present) -> explicit call functionality only

If call features are not part of first public rollout, remove call-related permissions before final release.

### D. Release notes (Google Play)

Use this short text:

```text
This release improves privacy and compliance readiness.

- Added in-app account deletion: Settings -> Delete account
- Added public deletion page: https://vedamatch.ru/delete-account
- Added legal links in 3 languages (EN/HI/RU):
  - Terms: https://vedamatch.ru/terms?lang=en|hi|ru
  - Privacy: https://vedamatch.ru/privacy?lang=en|hi|ru

LKM policy:
- LKM are internal, non-monetary activity points.
- LKM are not legal tender and not a payment instrument.
```

## 3) Final pre-submit gate

Must-pass before sending for review:

1. New install -> register -> base user flow.
2. Registration blocks until both Terms and Privacy are opened.
3. Legal links open in selected language (EN/RU/HI).
4. In-app delete account works and session is invalidated.
5. Deletion web page is reachable and consistent with app/API behavior.
6. No crash in critical submission path.

## 4) Evidence pack to keep

Capture and archive:

- screenshot: registration legal section with language selector + opened links
- screenshot: settings legal links + delete account action
- short video: full account deletion flow
- API logs: deletion success response
- smoke test log with date, build, tester, device

## 5) Source anchors (official docs)

- App Store Review Guidelines (payments/privacy/account sign-in): `https://developer.apple.com/app-store/review/guidelines/`
- Apple account deletion guidance: `https://developer.apple.com/support/offering-account-deletion-in-your-app/`
- App Store Connect App Review info fields: `https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information`
- App Store Connect app privacy fields: `https://developer.apple.com/help/app-store-connect/reference/app-information/app-privacy`
- Google Play User Data policy: `https://support.google.com/googleplay/android-developer/answer/10144311`
- Google Play Payments policy: `https://support.google.com/googleplay/android-developer/answer/9858738`
- Google Play Data safety form guide: `https://support.google.com/googleplay/android-developer/answer/10787469`
