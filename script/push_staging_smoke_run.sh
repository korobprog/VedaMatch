#!/usr/bin/env bash
set -euo pipefail

# Push staging smoke run for core scenarios:
# 1) booking created -> provider push
# 2) news important publish -> subscriber push
# 3) wallet pending activation -> user push
#
# Requirements:
# - API_URL (must include /api, e.g. https://staging-api.example.com/api)
# - ADMIN_TOKEN (JWT for admin)
# Optional:
# - PROVIDER_PUSH_TOKEN (real device token)
# - CLIENT_PUSH_TOKEN (real device token)
# - PROVIDER_PLATFORM (ios|android|web, default: android)
# - CLIENT_PLATFORM (ios|android|web, default: android)

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: required command not found: $1" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "ERROR: missing required env var: $name" >&2
    exit 1
  fi
}

require_cmd curl
require_cmd jq
require_cmd node

require_env API_URL
require_env ADMIN_TOKEN

API_URL="${API_URL%/}"
PROVIDER_PLATFORM="${PROVIDER_PLATFORM:-android}"
CLIENT_PLATFORM="${CLIENT_PLATFORM:-android}"
TS_SUFFIX="$(date +%s)-$RANDOM"

LAST_STATUS=""
LAST_BODY=""

json_escape() {
  printf '%s' "$1" | jq -Rsa .
}

api_call() {
  local method="$1"
  local path="$2"
  local token="$3"
  local body="${4:-}"

  local auth_header=( -H "Authorization: Bearer ${token}" )
  local content_type=( )
  local data_arg=( )

  if [[ -n "$body" ]]; then
    content_type=( -H "Content-Type: application/json" )
    data_arg=( -d "$body" )
  fi

  local response
  response=$(curl -sS -w '\n%{http_code}' -X "$method" "${API_URL}${path}" "${auth_header[@]}" "${content_type[@]}" "${data_arg[@]}")
  LAST_STATUS=$(printf '%s' "$response" | tail -n1)
  LAST_BODY=$(printf '%s' "$response" | sed '$d')
}

public_call() {
  local method="$1"
  local path="$2"
  local body="${3:-}"

  local content_type=( )
  local data_arg=( )

  if [[ -n "$body" ]]; then
    content_type=( -H "Content-Type: application/json" )
    data_arg=( -d "$body" )
  fi

  local response
  response=$(curl -sS -w '\n%{http_code}' -X "$method" "${API_URL}${path}" "${content_type[@]}" "${data_arg[@]}")
  LAST_STATUS=$(printf '%s' "$response" | tail -n1)
  LAST_BODY=$(printf '%s' "$response" | sed '$d')
}

assert_status() {
  local expected="$1"
  if [[ "$LAST_STATUS" != "$expected" ]]; then
    echo "ERROR: expected HTTP $expected, got $LAST_STATUS" >&2
    echo "Response body:" >&2
    echo "$LAST_BODY" >&2
    exit 1
  fi
}

extract_jq() {
  local expr="$1"
  printf '%s' "$LAST_BODY" | jq -r "$expr"
}

create_user() {
  local label="$1"
  local email="push-smoke-${label}-${TS_SUFFIX}@example.com"
  local password="SmokePass123!"

  local payload
  payload=$(cat <<JSON
{"email":"${email}","password":"${password}"}
JSON
)

  public_call "POST" "/register" "$payload"
  assert_status "201"

  local token user_id
  token=$(extract_jq '.token')
  user_id=$(extract_jq '.user.ID // .user.id')

  if [[ -z "$token" || "$token" == "null" ]]; then
    echo "ERROR: failed to get token for ${label}" >&2
    exit 1
  fi
  if [[ -z "$user_id" || "$user_id" == "null" ]]; then
    echo "ERROR: failed to get user id for ${label}" >&2
    exit 1
  fi

  echo "$email|$password|$token|$user_id"
}

register_push_token_if_present() {
  local user_token="$1"
  local push_token="$2"
  local platform="$3"
  local device_label="$4"

  if [[ -z "$push_token" ]]; then
    echo "[WARN] ${device_label}: push token not provided, delivery to real device is not guaranteed"
    return 0
  fi

  local payload
  payload=$(cat <<JSON
{"token":$(json_escape "$push_token"),"provider":"fcm","platform":"${platform}","deviceId":"${device_label}-${TS_SUFFIX}","appVersion":"smoke-1"}
JSON
)

  api_call "POST" "/push-tokens/register" "$user_token" "$payload"
  assert_status "200"

  local ok
  ok=$(extract_jq '.ok')
  if [[ "$ok" != "true" ]]; then
    echo "ERROR: failed to register push token for ${device_label}" >&2
    echo "$LAST_BODY" >&2
    exit 1
  fi
}

echo "== Push Smoke Run: start =="

echo "1) Health snapshot before"
api_call "GET" "/admin/push/health?window_hours=1" "$ADMIN_TOKEN"
assert_status "200"
HEALTH_BEFORE="$LAST_BODY"
echo "$HEALTH_BEFORE" | jq '{delivery_success_rate, invalid_token_rate, retry_rate, latency_p95, total_events, fcmConfigured, fcmKeySource}'

echo "2) Create provider/client smoke users"
IFS='|' read -r PROVIDER_EMAIL PROVIDER_PASSWORD PROVIDER_USER_TOKEN PROVIDER_USER_ID <<<"$(create_user provider)"
IFS='|' read -r CLIENT_EMAIL CLIENT_PASSWORD CLIENT_USER_TOKEN CLIENT_USER_ID <<<"$(create_user client)"
echo "  provider_user_id=${PROVIDER_USER_ID}, client_user_id=${CLIENT_USER_ID}"

echo "3) Register real push tokens (if provided)"
register_push_token_if_present "$PROVIDER_USER_TOKEN" "${PROVIDER_PUSH_TOKEN:-}" "$PROVIDER_PLATFORM" "provider"
register_push_token_if_present "$CLIENT_USER_TOKEN" "${CLIENT_PUSH_TOKEN:-}" "$CLIENT_PLATFORM" "client"

echo "4) Booking flow: create service/tariff/publish/book"
SERVICE_PAYLOAD=$(cat <<JSON
{"title":"Smoke Booking ${TS_SUFFIX}","description":"Smoke booking scenario","category":"other","language":"ru","formats":"[\"individual\"]","scheduleType":"booking","channel":"video","accessType":"paid"}
JSON
)
api_call "POST" "/services" "$PROVIDER_USER_TOKEN" "$SERVICE_PAYLOAD"
assert_status "201"
SERVICE_ID=$(extract_jq '.id')

echo "  service_id=${SERVICE_ID}"

TARIFF_PAYLOAD='{"name":"Smoke Tariff","price":5,"currency":"LKS","durationMinutes":30,"sessionsCount":1,"isDefault":true}'
api_call "POST" "/services/${SERVICE_ID}/tariffs" "$PROVIDER_USER_TOKEN" "$TARIFF_PAYLOAD"
assert_status "201"
TARIFF_ID=$(extract_jq '.id')

echo "  tariff_id=${TARIFF_ID}"

api_call "POST" "/services/${SERVICE_ID}/publish" "$PROVIDER_USER_TOKEN" '{}'
assert_status "200"

SCHEDULED_AT=$(node -e 'console.log(new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString())')
BOOKING_PAYLOAD=$(cat <<JSON
{"tariffId":${TARIFF_ID},"scheduledAt":"${SCHEDULED_AT}","clientNote":"smoke booking test"}
JSON
)
api_call "POST" "/services/${SERVICE_ID}/book" "$CLIENT_USER_TOKEN" "$BOOKING_PAYLOAD"
assert_status "201"
BOOKING_ID=$(extract_jq '.id')
echo "  booking_id=${BOOKING_ID}"

echo "5) News flow: create source -> subscribe -> create important news -> publish"
SOURCE_PAYLOAD=$(cat <<JSON
{"name":"Smoke Source ${TS_SUFFIX}","description":"Smoke source","sourceType":"url","url":"https://example.com/smoke-${TS_SUFFIX}","isActive":true,"mode":"draft","fetchInterval":3600}
JSON
)
api_call "POST" "/admin/news/sources" "$ADMIN_TOKEN" "$SOURCE_PAYLOAD"
assert_status "201"
SOURCE_ID=$(extract_jq '.ID // .id')

echo "  source_id=${SOURCE_ID}"

api_call "POST" "/news/sources/${SOURCE_ID}/subscribe" "$CLIENT_USER_TOKEN" '{}'
assert_status "200"

NEWS_PAYLOAD=$(cat <<JSON
{"sourceId":${SOURCE_ID},"titleRu":"Smoke Important News ${TS_SUFFIX}","summaryRu":"Smoke summary","contentRu":"Smoke content body for important news push scenario.","status":"draft","isImportant":true}
JSON
)
api_call "POST" "/admin/news" "$ADMIN_TOKEN" "$NEWS_PAYLOAD"
assert_status "201"
NEWS_ID=$(extract_jq '.ID // .id')

echo "  news_id=${NEWS_ID}"

api_call "POST" "/admin/news/${NEWS_ID}/publish" "$ADMIN_TOKEN" '{}'
assert_status "200"

echo "6) Wallet flow: activate pending balance for client"
api_call "POST" "/admin/wallet/${CLIENT_USER_ID}/activate" "$ADMIN_TOKEN" '{}'
assert_status "200"

# Optional direct sanity push to both users.
echo "7) Direct sanity pushes"
api_call "POST" "/admin/push/test" "$ADMIN_TOKEN" "{\"userId\":${PROVIDER_USER_ID},\"title\":\"Smoke booking sanity\",\"body\":\"Provider delivery sanity\",\"data\":{\"type\":\"new_booking\",\"screen\":\"IncomingBookings\"}}"
assert_status "200"
api_call "POST" "/admin/push/test" "$ADMIN_TOKEN" "{\"userId\":${CLIENT_USER_ID},\"title\":\"Smoke wallet sanity\",\"body\":\"Client delivery sanity\",\"data\":{\"type\":\"wallet_activated\",\"screen\":\"Wallet\"}}"
assert_status "200"

echo "8) Health snapshot after"
api_call "GET" "/admin/push/health?window_hours=1" "$ADMIN_TOKEN"
assert_status "200"
HEALTH_AFTER="$LAST_BODY"
echo "$HEALTH_AFTER" | jq '{delivery_success_rate, invalid_token_rate, retry_rate, latency_p95, total_events, fcmConfigured, fcmKeySource}'

echo "== Smoke run summary =="
echo "provider_email=${PROVIDER_EMAIL}"
echo "client_email=${CLIENT_EMAIL}"
echo "provider_user_id=${PROVIDER_USER_ID}"
echo "client_user_id=${CLIENT_USER_ID}"
echo "service_id=${SERVICE_ID}"
echo "tariff_id=${TARIFF_ID}"
echo "booking_id=${BOOKING_ID}"
echo "source_id=${SOURCE_ID}"
echo "news_id=${NEWS_ID}"
echo
echo "Manual expected results on devices:"
echo "- Provider device: receives booking push (new_booking)"
echo "- Client device: receives important news push (news)"
echo "- Client device: receives wallet activation push (wallet_activated)"
echo
echo "Done."
