#!/usr/bin/env bash
set -euo pipefail

# Video Circles API smoke runner.
# Requires: curl, jq
#
# Env vars:
# API_BASE            default: http://localhost:8080/api
# USER_TOKEN          required (JWT of regular user)
# ADMIN_TOKEN         optional (required for admin tariff update step)
# CITY                default: Moscow
# MATHA               default: gaudiya
# CATEGORY            default: qa-smoke
# PREMIUM_NEW_PRICE   default: 55
# CLEANUP             default: true (delete created circle)

API_BASE="${API_BASE:-http://localhost:8080/api}"
USER_TOKEN="${USER_TOKEN:-}"
ADMIN_TOKEN="${ADMIN_TOKEN:-}"
CITY="${CITY:-Moscow}"
MATHA="${MATHA:-gaudiya}"
CATEGORY="${CATEGORY:-qa-smoke}"
PREMIUM_NEW_PRICE="${PREMIUM_NEW_PRICE:-55}"
CLEANUP="${CLEANUP:-true}"

if ! command -v curl >/dev/null 2>&1; then
  echo "ERROR: curl is required"
  exit 1
fi
if ! command -v jq >/dev/null 2>&1; then
  echo "ERROR: jq is required"
  exit 1
fi
if [[ -z "${USER_TOKEN}" ]]; then
  echo "ERROR: USER_TOKEN is required"
  exit 1
fi

PASS=0
FAIL=0
CIRCLE_ID=""
PREMIUM_TARIFF_ID=""
PREMIUM_PRICE_BEFORE=""
PREMIUM_PRICE_AFTER=""
BOOST_1_CHARGED=""
BOOST_2_CHARGED=""

step_ok() {
  PASS=$((PASS + 1))
  echo "[PASS] $1"
}

step_fail() {
  FAIL=$((FAIL + 1))
  echo "[FAIL] $1"
}

request() {
  local method="$1"
  local url="$2"
  local auth_token="${3:-}"
  local body="${4:-}"
  local content_type="${5:-application/json}"

  local out_file
  out_file="$(mktemp)"
  local status

  if [[ -n "${body}" ]]; then
    if [[ -n "${auth_token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${auth_token}" \
        -H "Content-Type: ${content_type}" \
        --data "${body}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Content-Type: ${content_type}" \
        --data "${body}")"
    fi
  else
    if [[ -n "${auth_token}" ]]; then
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}" \
        -H "Authorization: Bearer ${auth_token}")"
    else
      status="$(curl -sS -o "${out_file}" -w "%{http_code}" \
        -X "${method}" "${url}")"
    fi
  fi

  echo "${status}"
  cat "${out_file}"
  rm -f "${out_file}"
}

extract_json_field() {
  local json="$1"
  local expr="$2"
  echo "${json}" | jq -r "${expr}"
}

echo "Running Video Circles smoke against: ${API_BASE}"

# 1) Public tariffs
resp="$(request GET "${API_BASE}/video-tariffs")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "200" ]]; then
  PREMIUM_TARIFF_ID="$(extract_json_field "${body}" '.tariffs[] | select(.code=="premium_boost") | (.id // .ID)' | head -n1)"
  PREMIUM_PRICE_BEFORE="$(extract_json_field "${body}" '.tariffs[] | select(.code=="premium_boost") | .priceLkm' | head -n1)"
  step_ok "GET /video-tariffs"
else
  step_fail "GET /video-tariffs (status=${status})"
fi

# 2) Create circle
create_payload="$(jq -nc \
  --arg media "https://cdn.example.com/video-circles/smoke.mp4" \
  --arg city "${CITY}" \
  --arg matha "${MATHA}" \
  --arg category "${CATEGORY}" \
  '{mediaUrl:$media, city:$city, matha:$matha, category:$category, durationSec:60}')"
resp="$(request POST "${API_BASE}/video-circles" "${USER_TOKEN}" "${create_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "201" ]]; then
  CIRCLE_ID="$(extract_json_field "${body}" '.id')"
  step_ok "POST /video-circles (id=${CIRCLE_ID})"
else
  step_fail "POST /video-circles (status=${status})"
fi

if [[ -z "${CIRCLE_ID}" || "${CIRCLE_ID}" == "null" ]]; then
  echo "Cannot continue without created circle id."
  echo "Summary: PASS=${PASS} FAIL=${FAIL}"
  exit 1
fi

# 3) Like toggle
like_payload='{"type":"like","action":"toggle"}'
resp="$(request POST "${API_BASE}/video-circles/${CIRCLE_ID}/interactions" "${USER_TOKEN}" "${like_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /video-circles/:id/interactions like toggle #1"
else
  step_fail "POST /video-circles/:id/interactions like toggle #1 (status=${status})"
fi

resp="$(request POST "${API_BASE}/video-circles/${CIRCLE_ID}/interactions" "${USER_TOKEN}" "${like_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /video-circles/:id/interactions like toggle #2"
else
  step_fail "POST /video-circles/:id/interactions like toggle #2 (status=${status})"
fi

# 4) Comment + Chat legacy
comment_payload='{"type":"comment","action":"add"}'
resp="$(request POST "${API_BASE}/video-circles/${CIRCLE_ID}/interactions" "${USER_TOKEN}" "${comment_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /video-circles/:id/interactions comment add"
else
  step_fail "POST /video-circles/:id/interactions comment add (status=${status})"
fi

legacy_chat_payload="$(jq -nc --argjson id "${CIRCLE_ID}" '{circleId:$id, type:"chat", action:"add"}')"
resp="$(request POST "${API_BASE}/interactions" "${USER_TOKEN}" "${legacy_chat_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
if [[ "${status}" == "200" ]]; then
  step_ok "POST /interactions legacy chat add"
else
  step_fail "POST /interactions legacy chat add (status=${status})"
fi

# 5) Premium boost #1
boost_payload='{"boostType":"premium"}'
resp="$(request POST "${API_BASE}/video-circles/${CIRCLE_ID}/boost" "${USER_TOKEN}" "${boost_payload}")"
status="$(echo "${resp}" | sed -n '1p')"
body="$(echo "${resp}" | sed -n '2,$p')"
if [[ "${status}" == "200" ]]; then
  BOOST_1_CHARGED="$(extract_json_field "${body}" '.chargedLkm')"
  step_ok "POST /video-circles/:id/boost premium #1 charged=${BOOST_1_CHARGED}"
elif [[ "${status}" == "402" ]]; then
  code="$(extract_json_field "${body}" '.code')"
  if [[ "${code}" == "INSUFFICIENT_LKM" ]]; then
    step_ok "POST /video-circles/:id/boost premium #1 insufficient LKM path"
  else
    step_fail "POST /video-circles/:id/boost premium #1 unexpected code=${code}"
  fi
else
  step_fail "POST /video-circles/:id/boost premium #1 (status=${status})"
fi

# 6) Admin updates premium tariff (optional if ADMIN_TOKEN present)
if [[ -n "${ADMIN_TOKEN}" && -n "${PREMIUM_TARIFF_ID}" && "${PREMIUM_TARIFF_ID}" != "null" ]]; then
  update_payload="$(jq -nc --argjson price "${PREMIUM_NEW_PRICE}" '{priceLkm:$price}')"
  resp="$(request PUT "${API_BASE}/admin/video-tariffs/${PREMIUM_TARIFF_ID}" "${ADMIN_TOKEN}" "${update_payload}")"
  status="$(echo "${resp}" | sed -n '1p')"
  body="$(echo "${resp}" | sed -n '2,$p')"
  if [[ "${status}" == "200" ]]; then
    PREMIUM_PRICE_AFTER="$(extract_json_field "${body}" '.priceLkm')"
    step_ok "PUT /admin/video-tariffs/:id premium price=${PREMIUM_PRICE_AFTER}"
  else
    step_fail "PUT /admin/video-tariffs/:id (status=${status})"
  fi

  resp="$(request POST "${API_BASE}/video-circles/${CIRCLE_ID}/boost" "${USER_TOKEN}" "${boost_payload}")"
  status="$(echo "${resp}" | sed -n '1p')"
  body="$(echo "${resp}" | sed -n '2,$p')"
  if [[ "${status}" == "200" ]]; then
    BOOST_2_CHARGED="$(extract_json_field "${body}" '.chargedLkm')"
    step_ok "POST /video-circles/:id/boost premium #2 charged=${BOOST_2_CHARGED}"
    if [[ -n "${PREMIUM_PRICE_AFTER}" && "${BOOST_2_CHARGED}" == "${PREMIUM_PRICE_AFTER}" ]]; then
      step_ok "Boost uses updated tariff price"
    else
      step_fail "Boost did not use updated tariff price (charged=${BOOST_2_CHARGED}, expected=${PREMIUM_PRICE_AFTER})"
    fi
  elif [[ "${status}" == "402" ]]; then
    code="$(extract_json_field "${body}" '.code')"
    if [[ "${code}" == "INSUFFICIENT_LKM" ]]; then
      step_ok "POST /video-circles/:id/boost premium #2 insufficient LKM path"
    else
      step_fail "POST /video-circles/:id/boost premium #2 unexpected code=${code}"
    fi
  else
    step_fail "POST /video-circles/:id/boost premium #2 (status=${status})"
  fi
else
  echo "[INFO] Skipping admin tariff update step (ADMIN_TOKEN or premium tariff id not available)."
fi

# 7) Cleanup created circle (optional)
if [[ "${CLEANUP}" == "true" ]]; then
  resp="$(request DELETE "${API_BASE}/video-circles/${CIRCLE_ID}" "${USER_TOKEN}")"
  status="$(echo "${resp}" | sed -n '1p')"
  if [[ "${status}" == "200" ]]; then
    step_ok "DELETE /video-circles/:id cleanup"
  else
    step_fail "DELETE /video-circles/:id cleanup (status=${status})"
  fi
fi

echo
echo "Smoke summary: PASS=${PASS} FAIL=${FAIL}"
if [[ "${FAIL}" -gt 0 ]]; then
  exit 1
fi
