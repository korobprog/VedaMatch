# VedaMatch: Legal Operator Model (RF Self-Employed -> KZ Entity)

Status date: `2026-02-20`

## Current publication-safe model

Use this baseline until Kazakhstan legal entity is actually registered:

- Operator: self-employed individual in the Russian Federation (NPD).
- Legal docs (Privacy/Terms/Deletion): publish in EN/RU/HI, publicly accessible without login.
- Store notes: state that LKM are internal non-monetary points and not a payment instrument.
- Consistency rule: app UI, legal pages, review notes, and Data Safety/App Privacy must describe the same operator model.

## Why this is safe for wave 1

- Apple organization enrollment requires a legal entity; without it, individual enrollment is the practical path.
- Google Play account owner email and country are not editable; for country/legal migration, Google recommends creating a new developer account and transferring apps.

## Migration path to Kazakhstan legal entity

When legal entity in Kazakhstan is ready:

1. Update legal docs first:
- Controller/operator name and jurisdiction.
- Support/legal email and address.
- Effective date and change notice.

2. Update store metadata:
- App Store review notes and contact data.
- Google Play policy metadata and support contacts.

3. If account-level country/entity migration is blocked:
- Create new publisher account for KZ entity.
- Transfer app to new account (Apple/Google supported flow).

## Reviewer-ready legal wording (LKM)

Use consistently:

- `LKM are internal, non-monetary in-app points.`
- `LKM are not legal tender, not electronic money, and not a payment instrument.`
- `LKM cannot be purchased, sold, exchanged, withdrawn, or redeemed for fiat/crypto.`

## Three operational variants

1. Variant A (recommended now):
- Publish now as RF self-employed operator.
- Migrate later with legal-doc update + account transfer if needed.

2. Variant B:
- Delay submission until KZ legal entity is ready.
- Publish once with final legal model.

3. Variant C:
- Publish through partner legal entity now (contracted publisher).
- Later transfer ownership to your own KZ entity.

## Minimum legal data you still need to finalize manually

- Full legal name of current operator (as shown in store account).
- Working legal/privacy inbox (`legal@...`, `privacy@...`).
- Retention periods in days for key data categories (account, media, logs, billing/legal records).
