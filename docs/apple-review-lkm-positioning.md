# App Review: LKM Positioning

## Safe positioning for App Store

Use these core statements in the app, metadata, and reviewer notes:

- `LKM — внутренняя единица активности`
- `LKM начисляются за участие`
- `LKM используются для доступа к функциям портала`
- `LKM не являются деньгами, платежным инструментом или электронными деньгами`
- `LKM не подлежат покупке/продаже/выводу/обмену`

## Terms to avoid in reviewer-visible text

Avoid money-style wording where LKM are shown:

- `деньги`, `валюта`, `стоимость`, `оплата`, `покупка`, `вывод`, `обмен`
- Prefer `баллы`, `очки`, `активность`, `начисления`, `использование`

## App Review Notes template (App Store Connect)

```text
LKM in this app are internal activity points.

- LKM are earned through in-app participation.
- LKM are used only for access to app features.
- LKM are not legal tender, electronic money, or a payment instrument.
- LKM cannot be purchased, sold, exchanged for fiat/crypto, transferred, or withdrawn.

The app does not provide external purchase links for LKM.

Account deletion:
- In-app path: Settings -> Delete account.
- API: DELETE /api/account
- Optional request endpoint: POST /api/account/deletion-request
- Public info page: https://vedamatch.ru/delete-account
```

## Registration legal consent (review-friendly)

Add this to reviewer notes if asked:

```text
During sign-up the user must:
1) explicitly agree to Terms/Privacy processing,
2) open Terms of Use and Privacy Policy links before submission.

Legal documents are available in English, Hindi, and Russian:
- Terms: https://vedamatch.ru/terms?lang=en|hi|ru
- Privacy: https://vedamatch.ru/privacy?lang=en|hi|ru
```

## Short wording variants for in-app legal note

- EN: `LKM are internal non-monetary points and not a payment instrument.`
- RU: `LKM — внутренняя неплатежная единица активности, не являющаяся платежным средством.`
- HI: `LKM केवल आंतरिक गैर-भुगतान पॉइंट हैं; यह भुगतान का साधन नहीं है।`

## Submission pre-check

- All wallet/referral/modals use non-monetary wording.
- Any “first payment/purchase” phrasing is replaced with “first activity/use”.
- App screenshots and promotional text do not present LKM as money.
- Privacy/permissions strings are filled and human-readable.
- Permissions are reduced to feature-critical only (no legacy telephony permissions unless required by active flows).
- Reviewer notes include why microphone/camera/location are requested.

## Critical iOS checks before upload

- Set real `PRODUCT_BUNDLE_IDENTIFIER` for Release (current default in project is template-style).
- Set release `MARKETING_VERSION` and increment `CURRENT_PROJECT_VERSION`.
- Verify signing: Team, certificate, and App Store provisioning profile for Release.
- Keep ATS exceptions minimal for Release; remove dev/local domains where possible.
