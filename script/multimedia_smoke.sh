#!/usr/bin/env bash
set -euo pipefail

# Basic smoke checks for Sattva Media:
# 1) Live sources (radio/tv endpoints)
# 2) Support config for multimedia
# 3) Playlist API (optional, requires USER_TOKEN)

API_BASE="${API_BASE:-http://localhost:8080/api}"
USER_TOKEN="${USER_TOKEN:-}"

echo "[SMOKE] GET /multimedia/radio"
curl -fsS "${API_BASE}/multimedia/radio" | jq '. | length' >/dev/null

echo "[SMOKE] GET /multimedia/tv"
curl -fsS "${API_BASE}/multimedia/tv" | jq '. | length' >/dev/null

echo "[SMOKE] GET /support/config?service=multimedia"
if [[ -n "${USER_TOKEN}" ]]; then
  curl -fsS -H "Authorization: Bearer ${USER_TOKEN}" "${API_BASE}/support/config?service=multimedia" | jq '.service'
else
  echo "[WARN] USER_TOKEN is empty, skipping support-config and playlist protected checks"
  exit 0
fi

echo "[SMOKE] POST /multimedia/playlists"
PLAYLIST_ID="$(curl -fsS -X POST \
  -H "Authorization: Bearer ${USER_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"name":"Smoke Playlist"}' \
  "${API_BASE}/multimedia/playlists" | jq -r '.ID')"

echo "[SMOKE] GET /multimedia/playlists"
curl -fsS -H "Authorization: Bearer ${USER_TOKEN}" "${API_BASE}/multimedia/playlists" | jq '.total' >/dev/null

echo "[OK] multimedia smoke passed, playlist_id=${PLAYLIST_ID}"

