# App Review: LKM Positioning

## Safe positioning for App Store

Use these core statements in the app, metadata, and reviewer notes:

- `LKM — внутренняя единица активности`
- `LKM начисляются за участие`
- `LKM используются для доступа к функциям портала`
- `LKM не имеют денежной стоимости и не подлежат обмену`

## Terms to avoid in reviewer-visible text

Avoid money-style wording where LKM are shown:

- `деньги`, `валюта`, `стоимость`, `оплата`, `покупка`, `вывод`, `обмен`
- Prefer `баллы`, `очки`, `активность`, `начисления`, `использование`

## App Review Notes template (App Store Connect)

```text
LKM in this app are internal activity points.

- LKM are earned through in-app participation.
- LKM are used only for access to app features.
- LKM have no monetary value.
- LKM cannot be exchanged, transferred to fiat, or withdrawn.

The app does not provide external purchase links for LKM.
```

## Submission pre-check

- All wallet/referral/modals use non-monetary wording.
- Any “first payment/purchase” phrasing is replaced with “first activity/use”.
- App screenshots and promotional text do not present LKM as money.
- Privacy/permissions strings are filled and human-readable.

## Critical iOS checks before upload

- Set real `PRODUCT_BUNDLE_IDENTIFIER` for Release (current default in project is template-style).
- Set release `MARKETING_VERSION` and increment `CURRENT_PROJECT_VERSION`.
- Verify signing: Team, certificate, and App Store provisioning profile for Release.
- Keep ATS exceptions minimal for Release; remove dev/local domains where possible.
