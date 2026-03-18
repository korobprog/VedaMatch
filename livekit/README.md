# LiveKit Service (Dokploy Git Provider)

This folder allows deploying LiveKit from the same repository via Dokploy `Git` provider.

## Dokploy setup

1. Create Service -> `Application`.
2. Provider -> `Git`.
3. Repository -> this repository.
4. Build Path -> `livekit`.
5. Dockerfile -> `Dockerfile`.
6. Container Port -> `7880`.
7. Publish media ports in `host` mode:
   - `7881/tcp`
   - `7882/udp`
8. Keep `LIVEKIT_NODE_IP=45.150.9.229`.
9. Optional override: `LIVEKIT_UDP_PORT=7882`.

## Environment Variables (LiveKit service)

```env
LIVEKIT_KEYS=lk_prod_key: lk_prod_secret
LIVEKIT_API_KEY=lk_prod_key
LIVEKIT_API_SECRET=lk_prod_secret
LIVEKIT_PORT=7880
LIVEKIT_LOG_LEVEL=info
LIVEKIT_REGION=ru
LIVEKIT_NODE_IP=45.150.9.229
LIVEKIT_UDP_PORT=7882
LIVEKIT_USE_EXTERNAL_IP=true
```

Notes:

- `livekit/entrypoint.sh` hardens the container start:
  - rebuilds `LIVEKIT_KEYS` from `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET` when they are present;
  - normalizes malformed `LIVEKIT_KEYS` without a space after `:`;
  - injects `--node-ip` from `LIVEKIT_NODE_IP`/`NODE_IP`;
  - injects `--udp-port` from `LIVEKIT_UDP_PORT`/`UDP_PORT` with default `7882`.
- The image is pinned to the digest currently verified in production, so Dokploy rebuilds stay deterministic.
- Published media ports (`7881/tcp`, `7882/udp`) still have to exist in Dokploy service config; image-level fixes cannot publish swarm ports by themselves.

## Domain

- Host: `livekit.vedamatch.ru`
- Path: `/`
- Internal Path: `/`
- Strip Path: `OFF`
- Container Port: `7880`
- HTTPS: `ON`

## Backend linkage

Server service must use:

```env
LIVEKIT_API_KEY=lk_prod_key
LIVEKIT_API_SECRET=lk_prod_secret
LIVEKIT_WS_URL=wss://livekit.vedamatch.ru
ROOM_SFU_ENABLED=true
ROOM_SFU_PROVIDER=livekit
ROOM_SFU_REQUIRE_MEMBERSHIP=true
```
