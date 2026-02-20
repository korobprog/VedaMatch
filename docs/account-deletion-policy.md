# Account Deletion Policy (P0)

## API contract

### `POST /api/account/deletion-request`
- Purpose: optional pre-delete step (grace-period compatible contract).
- Response:
```json
{
  "success": true,
  "status": "scheduled",
  "effectiveAt": "2026-02-20T00:00:00Z"
}
```

### `DELETE /api/account`
- Purpose: immediate account deletion/anonymization.
- Response:
```json
{
  "success": true,
  "status": "deleted"
}
```

Error format:
```json
{
  "error": "Could not delete account",
  "code": "account_deletion_failed"
}
```

## Data handling
- Immediately revoked:
  - Auth refresh sessions.
  - Push device tokens (invalidated).
- Immediately deleted:
  - Friend/block links where applicable.
  - User media references.
  - User tags/layout/subscriptions/favorites tied to user.
- Immediately anonymized:
  - Email, names, profile text fields, location fields, push/device identifiers.
- Account record:
  - Soft-deleted using GORM `deleted_at`.

## Operational notes
- Local uploaded files under `/uploads/...` are removed best-effort after DB transaction.
- Remote object storage cleanup is not part of P0 and should be added in the next hardening wave.
