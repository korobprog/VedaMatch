#!/usr/bin/env bash
set -euo pipefail

# SFU smoke for room endpoints.
# Usage:
#   API_BASE="https://api.example.com/api" JWT="..." ROOM_ID="123" ./script/sfu_smoke.sh

if [[ -z "${API_BASE:-}" ]]; then
  echo "ERROR: API_BASE is required (example: https://api.example.com/api)"
  exit 1
fi

if [[ -z "${JWT:-}" ]]; then
  echo "ERROR: JWT is required"
  exit 1
fi

if [[ -z "${ROOM_ID:-}" ]]; then
  echo "ERROR: ROOM_ID is required"
  exit 1
fi

echo "== SFU smoke start =="
echo "API_BASE=$API_BASE"
echo "ROOM_ID=$ROOM_ID"

config_status=$(
  curl -sS -o /tmp/sfu-config.json -w "%{http_code}" \
    -H "Authorization: Bearer ${JWT}" \
    "${API_BASE}/rooms/${ROOM_ID}/sfu/config"
)
echo "GET /rooms/${ROOM_ID}/sfu/config -> HTTP ${config_status}"
cat /tmp/sfu-config.json
echo

token_status=$(
  curl -sS -o /tmp/sfu-token.json -w "%{http_code}" \
    -X POST \
    -H "Authorization: Bearer ${JWT}" \
    -H "Content-Type: application/json" \
    -d '{"metadata":{"platform":"mobile","locale":"ru"}}' \
    "${API_BASE}/rooms/${ROOM_ID}/sfu/token"
)
echo "POST /rooms/${ROOM_ID}/sfu/token -> HTTP ${token_status}"
cat /tmp/sfu-token.json
echo

if [[ "${config_status}" != "200" || "${token_status}" != "200" ]]; then
  echo "SFU smoke failed"
  exit 1
fi

if command -v jq >/dev/null 2>&1; then
  enabled=$(jq -r '.enabled // empty' /tmp/sfu-config.json)
  provider=$(jq -r '.provider // empty' /tmp/sfu-config.json)
  ws_url=$(jq -r '.wsUrl // empty' /tmp/sfu-token.json)
  participant=$(jq -r '.participantIdentity // empty' /tmp/sfu-token.json)

  echo "Parsed:"
  echo "  enabled=${enabled}"
  echo "  provider=${provider}"
  echo "  wsUrl=${ws_url}"
  echo "  participantIdentity=${participant}"
fi

echo "SFU smoke passed"
