# Web Runtime Deployment Plan

## Goal
- Deploy the new `apps/web` runtime as the real user-facing web application.
- Keep `social.vedamatch.ru` as a host-aware surface of the same runtime, not as a separate product codebase.
- Preserve `lkm` as a dedicated wallet surface.
- Keep `panel` separate until there is an explicit migration plan for the internal/admin panel.

## Current Dokploy State
- `web`
  - currently serves `vedamatch.ru`, `vedamatch.com`, `admin.vedamatch.ru`, `admin.vedamatch.com`
  - currently builds from the legacy `admin` app (`buildPath=/admin`, `Dockerfile=admin/Dockerfile`)
- `vedamatch-social`
  - currently serves `social.vedamatch.ru`, `social.vedamatch.com`
  - currently also builds from the legacy `admin` app (`dockerContext=admin`, `dockerfile=admin/Dockerfile`)
- `vedamatch-panel`
  - currently serves `panel.vedamatch.ru`, `panel.vedamatch.com`
  - currently also builds from the legacy `admin` app
- `lkm`
  - serves `lkm.vedamatch.ru`, `lkm.vedamatch.com`
  - should remain separate in this migration wave
- `Server`
  - serves `api.vedamatch.ru`, `api.vedamatch.com`
  - CORS already includes `social/admin/panel/lkm/vedamatch/api` domains

## Runtime Contract
- `apps/web` is the new user web runtime.
- Host-aware behavior lives inside the same app:
  - `vedamatch.ru`, `vedamatch.com`, `www.vedamatch.com` -> main public web entry
  - `social.vedamatch.ru`, `social.vedamatch.com` -> social/auth entry of the same runtime
  - `/app/*` -> authenticated shell
- `lkm.vedamatch.*` remains a separate Next.js runtime.
- `panel.vedamatch.*` remains separate for now.

## Repo Artifacts Added For Deploy
- root `Dockerfile`
  - builds the monorepo workspace and packages needed by `apps/web`
  - runs the standalone Next.js server output
- `apps/web/Dockerfile`
  - same runtime recipe kept near the app for local clarity, but current Dokploy behavior may still resolve only root `Dockerfile`
- `apps/web/next.config.ts`
  - switched to `output: "standalone"` for cleaner container runtime

## Dokploy Migration Options

### Option A: Low-risk rollout
- Keep separate Dokploy apps `web` and `vedamatch-social`.
- Point both apps to the same source runtime:
  - Dockerfile: `Dockerfile`
  - Docker context: repository root
- Domain mapping:
  - `web`: `vedamatch.ru`, `vedamatch.com`, `www.vedamatch.com`
  - `vedamatch-social`: `social.vedamatch.ru`, `social.vedamatch.com`
- Benefit:
  - minimal DNS/domain reshuffle
  - simple rollback by app

### Option B: Simplified final shape
- Move `social.vedamatch.*` domains onto the `web` Dokploy app.
- Retire `vedamatch-social`.
- Use one deployed runtime for both main and social entrypoints.
- Benefit:
  - one runtime, one deploy target, fewer drift risks

## Recommended Sequence
1. Create or update Dokploy app build settings to use:
   - Dockerfile: `Dockerfile`
   - Docker context: repo root
2. Set build arg / env as needed:
   - `NEXT_PUBLIC_API_URL=https://api.vedamatch.ru/api`
3. Deploy first on `social.vedamatch.ru` via `vedamatch-social`.
4. Smoke-check:
   - `/`
   - `/login`
   - `/register`
   - authenticated `/app`
   - `/app/contacts`
   - `/app/chats`
   - `/app/library`
   - `/app/news`
   - `/app/services`
   - `/app/travel`
   - `/app/support`
5. After validation, migrate `vedamatch.ru/.com` onto the same runtime.
6. Leave `lkm` and `panel` unchanged until dedicated migrations are prepared.

## Risks
- `web` and `vedamatch-social` currently point to legacy `admin` code until switched; one social deploy attempt already failed because Dokploy resolved only root `Dockerfile` instead of `apps/web/Dockerfile`.
- Dokploy deploys from the GitHub `main` branch snapshot, not from the local workspace. Until the new root `Dockerfile` and `apps/web` changes are committed and pushed, redeploying `vedamatch-social` will keep failing with `open Dockerfile: no such file or directory`.
- If Dokploy context is set to `apps/web` instead of repo root, workspace packages will not build.
- `apps/web` is user-web focused; it is not a replacement for `panel` yet.
