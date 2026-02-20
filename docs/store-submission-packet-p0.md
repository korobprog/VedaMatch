# Store Submission Packet (P0) — VedaMatch

## 0) Build identity (фиксируем перед сабмитом)
- iOS bundle id: `com.vedicai.vedamatch`
- iOS version/build: `1.1.0 (2)`
- Android applicationId: `com.ragagent`
- Android versionName/versionCode: `1.1.0 / 2`

---

## 1) App Store Connect — готовый текст Review Notes

Use this as-is:

```text
VedaMatch uses LKM as internal activity points only.

- LKM are earned through in-app participation.
- LKM are used only for in-app features.
- LKM are non-monetary, non-transferable, and non-withdrawable.
- LKM are not legal tender, not electronic money, and not a payment instrument.
- LKM cannot be purchased, sold, exchanged for fiat/crypto, or redeemed outside the app.

Account deletion is supported in-app:
- Path: Settings -> Delete account
- API used by app: DELETE /api/account
- Optional request endpoint: POST /api/account/deletion-request
- Public deletion info page: https://vedamatch.ru/delete-account

Operator/legal model:
- Current operator: self-employed individual in the Russian Federation (NPD tax regime).
- If operations move to a Kazakhstan legal entity, legal documents will be updated before rollout.

Permissions usage:
- Camera/Photos: profile and media attachments
- Microphone: voice/call features
- Location (when-in-use): nearby/map features
- Push notifications: messages and service alerts

Registration legal consent:
- Registration requires explicit agreement plus opening Terms and Privacy links before sign-up.
- Legal docs are available in English/Hindi/Russian and open directly from in-app legal screens (no login required):
  - Terms: https://vedamatch.ru/terms?lang=en|hi|ru
  - Privacy: https://vedamatch.ru/privacy?lang=en|hi|ru
```

### App Store quick checklist
- [ ] App Privacy questionnaire updated in App Store Connect
- [ ] Review Notes pasted
- [ ] Demo account (if needed) provided
- [ ] “What’s New” prepared for 1.1.0

---

## 2) Google Play Console — готовый текст для Policy/Notes

### App content / policy note (internal release notes field)
```text
This release adds in-app account deletion and improves transport/privacy hardening.

Account deletion:
- In-app path: Settings -> Delete account
- Backend API: DELETE /api/account
- Public page: https://vedamatch.ru/delete-account

Privacy links:
- Terms: https://vedamatch.ru/terms?lang=en|hi|ru
- Privacy Policy: https://vedamatch.ru/privacy?lang=en|hi|ru

LKM policy:
- LKM are internal in-app engagement points.
- LKM are not legal tender, not a payment instrument, and not redeemable for money.
```

### Data safety (заполнять по фактическому прод-сбору)
Mark collected only what is actually processed by production backend/app.  
At minimum verify consistency with current features:
- Account info (email/profile fields)
- User content (messages/media)
- Location (when user enables location-dependent features)
- Device/app identifiers for auth/push/session

### Sensitive permissions declaration
Current Android manifest after P0:
- Removed: `CALL_PHONE`, `READ_PHONE_STATE`, `READ_PHONE_NUMBERS`
- Still present (needs accurate declaration/justification):
  - `RECORD_AUDIO`
  - location permissions
  - notifications
  - callkeep-related capabilities (`MANAGE_OWN_CALLS`, `BIND_TELECOM_CONNECTION_SERVICE`, `FOREGROUND_SERVICE_PHONE_CALL`)

If call features are not required for production rollout, remove call-related permissions in next pass to reduce review risk.

---

## 3) Manual verification evidence to attach/save

Before pressing submit, collect:
- [ ] Screenshot: Settings screen with `Delete account` button
- [ ] Screenshot: deletion confirmation modal
- [ ] Screenshot/log: successful deletion response in app flow
- [ ] Screenshot: Terms/Privacy links opening correctly
- [ ] Screenshot: registration step with mandatory legal acknowledgement/opened links
- [ ] Short test note with date/time and tester device

Recommended evidence log format:
```text
Date: YYYY-MM-DD
Build: iOS 1.1.0 (2), Android 1.1.0 (2)
Device: <model/os>
Checks:
- Privacy link opens: PASS
- Terms link opens: PASS
- Delete account flow: PASS
- Session invalidated after deletion: PASS
```

---

## 4) Order of operations (strict)
1. Run device smoke from `docs/release-p0-compliance-checklist.md`
2. Fill App Store Connect privacy + paste Review Notes
3. Fill Google Play Data safety + permissions declarations
4. Attach/record evidence
5. Submit iOS and Android releases

---

## 5) Companion docs

- Field-by-field console fill guide: `docs/store-console-field-by-field-wave1.md`
- LKM legal wording variants (EN/RU/HI): `docs/lkm-legal-variants-trilingual.md`
- Privacy Policy template (EN/RU/HI): `docs/privacy-policy-trilingual-template.md`
- Terms of Use template (EN/RU/HI): `docs/terms-of-use-trilingual-template.md`
- Operator model and migration (RF -> KZ): `docs/operator-legal-model-rf-to-kz.md`
